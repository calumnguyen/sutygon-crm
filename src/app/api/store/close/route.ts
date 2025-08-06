import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';
import { invalidateNonAdminSessions } from '@/lib/utils/sessionManager';

// Function to clear all user sessions (logout all users)
async function logoutAllUsers() {
  try {
    // Use real session invalidation for non-admin users
    const success = await invalidateNonAdminSessions();
    if (success) {
      console.log('Store closed - all non-admin users logged out via session invalidation');
    } else {
      console.error('Failed to invalidate non-admin sessions');
    }
    return success;
  } catch (error) {
    console.error('Failed to logout all users:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get current user from request body
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

    // Update store status
    const store = await db.query.storeSettings.findFirst({});
    if (!store) {
      return NextResponse.json({ error: 'Store settings not found' }, { status: 404 });
    }

    await db
      .update(storeSettings)
      .set({
        isOpen: false,
        closedBy: user.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, store.id));

    // Logout all users when store is closed
    await logoutAllUsers();

    return NextResponse.json({
      success: true,
      storeStatus: 'closed',
      closedBy: decryptedUser.name,
      closedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to close store:', error);
    return NextResponse.json({ error: 'Failed to close store' }, { status: 500 });
  }
}
