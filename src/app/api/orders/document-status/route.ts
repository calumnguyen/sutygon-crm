import { NextRequest, NextResponse } from 'next/server';
import { markDocumentOnFile } from '@/lib/actions/orders';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    console.log('Updating document status for order ID:', orderId);

    await markDocumentOnFile(parseInt(orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
