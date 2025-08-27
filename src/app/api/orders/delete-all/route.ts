import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderNotes, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';
import { getDeleteCode, removeDeleteCode } from '@/lib/utils/deleteCodes';

export async function POST(req: NextRequest) {
  try {
    const { currentUser, confirmationCode } = await req.json();

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

    // Verify confirmation code
    const userId = decryptedUser.id?.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    const userCodeData = getDeleteCode(userId);
    if (!userCodeData) {
      return NextResponse.json(
        { error: 'No confirmation code found. Please request a new code.' },
        { status: 403 }
      );
    }

    if (Date.now() > userCodeData.expiresAt) {
      removeDeleteCode(userId);
      return NextResponse.json(
        { error: 'Confirmation code has expired. Please request a new code.' },
        { status: 403 }
      );
    }

    if (userCodeData.code !== confirmationCode) {
      return NextResponse.json({ error: 'Invalid confirmation code' }, { status: 403 });
    }

    // Remove the used code
    removeDeleteCode(userId);

    // Get count of orders before deletion for logging
    const orderCount = await db.select().from(orders);
    const totalOrders = orderCount.length;

    // Delete all order notes first (foreign key constraint)
    await db.delete(orderNotes);
    console.log(`Deleted all order notes`);

    // Delete all order items (foreign key constraint)
    await db.delete(orderItems);
    console.log(`Deleted all order items`);

    // Delete all orders
    await db.delete(orders);
    console.log(`Deleted ${totalOrders} orders`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalOrders} orders and all related data`,
      deletedOrders: totalOrders,
      deletedBy: decryptedUser.name,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to delete all orders:', error);
    return NextResponse.json({ error: 'Failed to delete all orders' }, { status: 500 });
  }
}
