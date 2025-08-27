import { NextRequest, NextResponse } from 'next/server';
import { calculateItemWarning, createWarning } from '@/lib/utils/warningService';

export async function POST(request: NextRequest) {
  try {
    const { inventoryItemId, size, quantity, orderDate, expectedReturnDate, originalOnHand } =
      await request.json();

    console.log('=== TEST WARNING CALCULATION ===');
    console.log('Input:', {
      inventoryItemId,
      size,
      quantity,
      orderDate,
      expectedReturnDate,
      originalOnHand,
    });

    const warningInfo = await calculateItemWarning(
      inventoryItemId,
      size,
      quantity,
      new Date(orderDate),
      new Date(expectedReturnDate),
      originalOnHand
    );

    console.log('Warning result:', warningInfo);

    return NextResponse.json({
      success: true,
      warningInfo,
      message: warningInfo ? 'Warning should be created' : 'No warning needed',
    });
  } catch (error) {
    console.error('Error testing warning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
