import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';
import { Resend } from 'resend';
import { generateDeleteCode, storeDeleteCode } from '@/lib/utils/deleteCodes';

export async function POST(req: NextRequest) {
  try {
    const { currentUser } = await req.json();

    if (!currentUser || !currentUser.employeeKey) {
      return NextResponse.json({ error: 'User session required' }, { status: 401 });
    }

    // Find the actual user in database to get the real ID
    const hashedEmployeeKey = hashValue(currentUser.employeeKey);
    const user = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decryptedUser = decryptUserData(user);

    // Verify user has admin role
    if (decryptedUser.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate 6-digit code
    const code = generateDeleteCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code with user ID as key
    const userId = decryptedUser.id?.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    storeDeleteCode(userId, code, expiresAt);

    console.log('Delete code generated and stored:', {
      userId,
      code,
      expiresAt,
      expiresAtReadable: new Date(expiresAt).toLocaleString('vi-VN'),
    });

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

    console.log('Attempting to send delete confirmation email with Resend...');

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email to Calum
    const emailResult = await resend.emails.send({
      from: 'Sutygon CRM <noreply@sutygon.com>',
      to: ['calumengee@gmail.com'],
      subject: 'Mã xác thực xóa tất cả đơn hàng - Sutygon CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">⚠️ Mã xác thực xóa tất cả đơn hàng</h2>
          <p>Xin chào Calum,</p>
          <p><strong>${decryptedUser.name}</strong> đã yêu cầu mã xác thực để xóa tất cả đơn hàng trong hệ thống.</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #856404;">⚠️ CẢNH BÁO: HÀNH ĐỘNG NGUY HIỂM</h3>
            <p style="margin: 10px 0; color: #856404;">Việc xóa tất cả đơn hàng sẽ không thể hoàn tác và sẽ xóa vĩnh viễn tất cả dữ liệu đơn hàng.</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #333;">Mã xác thực:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #dc3545; margin: 10px 0;">${code}</p>
            <p style="font-size: 14px; color: #666; margin: 0;">Mã này sẽ hết hạn sau 10 phút.</p>
          </div>
          <p><strong>Người yêu cầu:</strong> ${decryptedUser.name}</p>
          <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Email này được gửi tự động từ hệ thống Sutygon CRM.<br>
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này và kiểm tra bảo mật hệ thống.
          </p>
        </div>
      `,
    });

    console.log('Delete confirmation email sent successfully:', emailResult);
    console.log(
      `✅ Mã xác thực xóa đơn hàng đã được gửi đến calumengee@gmail.com (yêu cầu bởi: ${decryptedUser.name})`
    );

    return NextResponse.json({
      success: true,
      message: 'Confirmation code sent to your email',
    });
  } catch (error) {
    console.error('Failed to send delete code:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to send confirmation code';
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
}
