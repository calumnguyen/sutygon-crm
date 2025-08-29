import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, currentUser } = await request.json();

    console.log('=== Update Status API Debug ===');
    console.log('Received orderId:', orderId);
    console.log('Received status:', status);
    console.log('Received currentUser:', currentUser);
    console.log('orderId type:', typeof orderId);

    if (!orderId || !status) {
      console.log('❌ Missing orderId or status');
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    // Get current user ID from request body
    const currentUserId = currentUser?.id;

    if (!currentUserId) {
      console.log('❌ No current user provided');
      return NextResponse.json({ error: 'No current user provided' }, { status: 401 });
    }

    console.log('Current user ID:', currentUserId);

    // Prepare update data
    const updateData: {
      status: string;
      updatedAt: Date;
      picked_up_by_user_id?: number;
      picked_up_at?: Date;
    } = {
      status: status,
      updatedAt: new Date(),
    };

    // If status is 'Picked Up', also set picked_up_by_user_id and picked_up_at
    if (status === 'Picked Up') {
      updateData.picked_up_by_user_id = currentUserId;
      updateData.picked_up_at = new Date();
    }

    console.log('Update data:', updateData);
    console.log('Looking for order with ID:', orderId);

    // Update the order status
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    console.log('Database update result:', updatedOrder);

    if (!updatedOrder) {
      console.log('❌ Order not found in database');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        pickedUpByUserId: updateData.picked_up_by_user_id,
        pickedUpAt: updateData.picked_up_at,
      },
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
