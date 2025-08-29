import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderDiscounts, users } from '@/lib/db/schema';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const {
      currentUser,
      discountType,
      discountValue,
      itemizedNameId,
      description,
      authorizedByUserId,
      discountAmount,
    } = body;

    if (!currentUser || !currentUser.employeeKey) {
      return NextResponse.json({ success: false, error: 'User session required' }, { status: 401 });
    }

    // Find the actual user in database to get the real ID
    const hashedEmployeeKey = hashValue(currentUser.employeeKey);
    const user = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, error: 'Invalid order ID' }, { status: 400 });
    }

    // Validate required fields
    if (!discountType || !discountValue || !itemizedNameId || !description || !authorizedByUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (!['vnd', 'percent'].includes(discountType)) {
      return NextResponse.json({ success: false, error: 'Invalid discount type' }, { status: 400 });
    }

    // Calculate discount amount (this will be calculated on the frontend and passed)
    if (!discountAmount || discountAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount amount' },
        { status: 400 }
      );
    }

    // Insert the discount
    const [newDiscount] = await db
      .insert(orderDiscounts)
      .values({
        orderId,
        discountType,
        discountValue,
        discountAmount,
        itemizedNameId,
        description,
        requestedByUserId: user.id,
        authorizedByUserId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      discount: newDiscount,
    });
  } catch (error) {
    console.error('Error adding discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to add discount: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
