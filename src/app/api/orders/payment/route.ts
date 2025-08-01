import { NextRequest, NextResponse } from 'next/server';
import { completeOrderPayment } from '@/lib/actions/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Payment API received body:', JSON.stringify(body, null, 2));
    
    const {
      orderId,
      paymentMethod,
      paidAmount,
      documentInfo,
      depositInfo
    } = body;

    console.log('Extracted orderId:', orderId, 'type:', typeof orderId);

    if (!orderId || !paymentMethod || !paidAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, paymentMethod, paidAmount' },
        { status: 400 }
      );
    }

    if (!['cash', 'qr'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be "cash" or "qr"' },
        { status: 400 }
      );
    }

    const updatedOrder = await completeOrderPayment(
      orderId,
      paymentMethod,
      paidAmount,
      documentInfo,
      depositInfo
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error completing order payment:', error);
    return NextResponse.json(
      { error: 'Failed to complete order payment' },
      { status: 500 }
    );
  }
} 