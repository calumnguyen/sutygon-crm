import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderDiscounts, discountItemizedNames, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, error: 'Invalid order ID' }, { status: 400 });
    }

    const discounts = await db
      .select({
        id: orderDiscounts.id,
        orderId: orderDiscounts.orderId,
        discountType: orderDiscounts.discountType,
        discountValue: orderDiscounts.discountValue,
        discountAmount: orderDiscounts.discountAmount,
        itemizedNameId: orderDiscounts.itemizedNameId,
        itemizedName: discountItemizedNames.name,
        description: orderDiscounts.description,
        requestedByUserId: orderDiscounts.requestedByUserId,
        authorizedByUserId: orderDiscounts.authorizedByUserId,
        createdAt: orderDiscounts.createdAt,
      })
      .from(orderDiscounts)
      .innerJoin(discountItemizedNames, eq(orderDiscounts.itemizedNameId, discountItemizedNames.id))
      .where(eq(orderDiscounts.orderId, orderId))
      .orderBy(orderDiscounts.createdAt);

    return NextResponse.json({
      success: true,
      discounts,
    });
  } catch (error) {
    console.error('Error fetching order discounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order discounts' },
      { status: 500 }
    );
  }
}
