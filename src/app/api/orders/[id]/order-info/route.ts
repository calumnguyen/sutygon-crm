import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderItemId = parseInt(id);

    if (isNaN(orderItemId)) {
      return NextResponse.json({ error: 'Invalid order item ID' }, { status: 400 });
    }

    // Get the order item and its associated order
    const orderData = await db
      .select({
        orderId: orders.id,
        orderDate: orders.orderDate,
        expectedReturnDate: orders.expectedReturnDate,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.id, orderItemId))
      .limit(1);

    if (orderData.length === 0) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    const order = orderData[0];

    return NextResponse.json({
      orderId: order.orderId,
      orderDate: order.orderDate.toISOString(),
      expectedReturnDate: order.expectedReturnDate.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching order info:', error);
    return NextResponse.json({ error: 'Failed to fetch order info' }, { status: 500 });
  }
}
