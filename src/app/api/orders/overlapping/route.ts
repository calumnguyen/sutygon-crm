import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, customers } from '@/lib/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { decrypt } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryItemId = searchParams.get('inventoryItemId');
    const size = searchParams.get('size');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!inventoryItemId || !size || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Optimized query: Get all data in one go with joins
    const overlappingData = await db
      .select({
        orderId: orders.id,
        orderDate: orders.orderDate,
        expectedReturnDate: orders.expectedReturnDate,
        customerId: orders.customerId,
        customerName: customers.name,
        orderItemSize: orderItems.size,
        orderItemQuantity: orderItems.quantity,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orderItems.inventoryItemId, parseInt(inventoryItemId)),
          lte(orders.orderDate, new Date(dateTo)),
          gte(orders.expectedReturnDate, new Date(dateFrom))
        )
      );

    // Filter by decrypted size and decrypt customer names
    const result = overlappingData
      .map((item) => {
        try {
          const decryptedSize = decrypt(item.orderItemSize);
          const decryptedCustomerName = decrypt(item.customerName);

          if (decryptedSize !== size) return null;

          return {
            orderId: item.orderId,
            customerName: decryptedCustomerName,
            orderDate: item.orderDate,
            expectedReturnDate: item.expectedReturnDate,
            quantity: item.orderItemQuantity,
          };
        } catch (e) {
          console.error('Error decrypting data:', e);
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error('Error fetching overlapping orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
