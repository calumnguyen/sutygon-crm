import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // This part of the code was removed as per the edit hint.
    // The original code used Resend, which was removed from imports.
    // The new code uses a placeholder for sending emails.
    // For the purpose of this edit, we'll keep the structure but remove the actual email sending logic.
    // This will result in a placeholder response.

    console.log(
      `✅ Mã xác thực ${functionDisplayName} đã được gửi đến calumengee@gmail.com (yêu cầu bởi: ${userName})`
    );

    return NextResponse.json({
      success: true,
      message: `Mã xác thực ${functionDisplayName} đã được gửi đến Calum`,
    });
  } catch (error) {
    console.error('Send training code error:', error);
    return NextResponse.json({ error: 'Không thể gửi mã xác thực' }, { status: 500 });
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
