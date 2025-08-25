import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import { Resend } from 'resend';

// Store verification codes in memory (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// Simple verification code generator
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    if (request.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { function: functionType = 'training' } = await request.json();

    // Get user name (decrypt if encrypted)
    let userName = 'Người dùng không xác định';
    try {
      if (request.user) {
        // Try to decrypt the name if it's encrypted, otherwise use as is
        userName = request.user.name;
      }
    } catch (error) {
      console.error('Failed to decrypt user name:', error);
      // Fallback to user ID if decryption fails
      userName = `Người dùng ID: ${request.user?.id || 'Không xác định'}`;
    }

    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    verificationCodes.set(functionType, { code, expiresAt });

    const functionDisplayName = functionType === 'training' ? 'Huấn luyện AI' : 'Tìm kiếm AI';
    const functionDescription =
      functionType === 'training'
        ? 'huấn luyện AI cho Sutygon-bot'
        : 'sử dụng tính năng tìm kiếm AI';

    // Check if RESEND_API_KEY is set
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return NextResponse.json(
        {
          error: 'Email service not configured. Please contact administrator.',
        },
        { status: 500 }
      );
    }

    console.log('Attempting to send email with Resend...');
    console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0);

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email to Calum
    const emailResult = await resend.emails.send({
      from: 'Sutygon CRM <noreply@sutygon.com>',
      to: ['calumengee@gmail.com'],
      subject: `Mã xác thực ${functionDisplayName} - Sutygon CRM`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Mã xác thực ${functionDisplayName}</h2>
          <p>Xin chào Calum,</p>
          <p>Bạn có yêu cầu mới để ${functionDescription}.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #333;">Mã xác thực:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0;">${code}</p>
            <p style="font-size: 14px; color: #666; margin: 0;">Mã này sẽ hết hạn sau 10 phút.</p>
          </div>
          <p><strong>Người yêu cầu:</strong> ${userName}</p>
          <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống Sutygon CRM.<br>
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResult);
    console.log(
      `✅ Mã xác thực ${functionDisplayName} đã được gửi đến calumengee@gmail.com (yêu cầu bởi: ${userName})`
    );

    return NextResponse.json({
      success: true,
      message: `Mã xác thực ${functionDisplayName} đã được gửi đến Calum`,
      emailId: emailResult.data?.id,
    });
  } catch (error) {
    console.error('Send training code error:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Provide more specific error messages
    let errorMessage = 'Không thể gửi mã xác thực';
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        errorMessage = 'Email service authentication failed. Please check API key.';
      } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
        errorMessage = 'Email service access denied. Please check permissions.';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Email service rate limit exceeded. Please try again later.';
      } else if (error.message.includes('domain') || error.message.includes('sender')) {
        errorMessage = 'Email domain not verified. Please check sender domain configuration.';
      } else {
        errorMessage = `Email sending failed: ${error.message}`;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    if (request.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { code, function: functionType = 'training' } = await request.json();

    const storedData = verificationCodes.get(functionType);

    if (!storedData) {
      return NextResponse.json({ error: 'Mã xác thực không tồn tại' }, { status: 400 });
    }

    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(functionType);
      return NextResponse.json({ error: 'Mã xác thực đã hết hạn' }, { status: 400 });
    }

    if (storedData.code !== code) {
      return NextResponse.json({ error: 'Mã xác thực không đúng' }, { status: 400 });
    }

    // Clear the code after successful verification
    verificationCodes.delete(functionType);

    const functionDisplayName = functionType === 'training' ? 'Huấn luyện AI' : 'Tìm kiếm AI';

    return NextResponse.json({
      success: true,
      message: `Xác thực ${functionDisplayName} thành công!`,
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Xác thực thất bại' }, { status: 500 });
  }
});
