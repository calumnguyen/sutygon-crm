import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateApiSession } from '@/lib/utils/authMiddleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    // Authenticate the request
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authResult = await validateApiSession(request, requestId);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id, itemId } = await params;
    const orderId = parseInt(id);
    const orderItemId = parseInt(itemId);

    if (isNaN(orderId) || isNaN(orderItemId)) {
      return NextResponse.json({ error: 'Invalid order ID or item ID' }, { status: 400 });
    }

    // Check if the order item exists and belongs to the order
    const existingItem = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)))
      .limit(1);

    if (existingItem.length === 0) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // Delete the order item
    await db
      .delete(orderItems)
      .where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)));

    return NextResponse.json({ success: true, message: 'Order item deleted successfully' });
  } catch (error) {
    console.error('Error deleting order item:', error);
    return NextResponse.json({ error: 'Failed to delete order item' }, { status: 500 });
  }
}
