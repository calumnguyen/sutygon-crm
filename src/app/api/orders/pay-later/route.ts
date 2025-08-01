import { NextRequest, NextResponse } from 'next/server';
import { markOrderPayLater } from '@/lib/actions/orders';

export async function POST(request: NextRequest) {
  try {
    const { orderId, documentInfo, depositInfo } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updatedOrder = await markOrderPayLater(parseInt(orderId), documentInfo, depositInfo);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error marking order as pay later:', error);
    return NextResponse.json(
      { error: 'Failed to mark order as pay later' },
      { status: 500 }
    );
  }
} 