import { NextRequest, NextResponse } from 'next/server';
import { getAffectedOrders } from '@/lib/utils/warningService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryItemId = searchParams.get('inventoryItemId');
    const size = searchParams.get('size');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log('Affected orders API called with:', { inventoryItemId, size, dateFrom, dateTo });

    if (!inventoryItemId || !size || !dateFrom || !dateTo) {
      console.log('Missing required parameters');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const affectedOrders = await getAffectedOrders(
      parseInt(inventoryItemId),
      size,
      new Date(dateFrom),
      new Date(dateTo)
    );

    console.log('Found affected orders:', affectedOrders.length);
    return NextResponse.json({ affectedOrders });
  } catch (error) {
    console.error('Error fetching affected orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
