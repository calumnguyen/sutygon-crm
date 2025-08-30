import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptOrderData } from '@/lib/utils/orderEncryption';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Get the order
    const orderData = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (orderData.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderData[0];

    // Decrypt sensitive data
    const decrypted = decryptOrderData(order);

    const result = {
      id: order.id,
      customerId: order.customerId,
      orderDate: order.orderDate,
      expectedReturnDate: order.expectedReturnDate,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      vatAmount: order.vatAmount ? Number(order.vatAmount) : 0,
      vatRate: order.vatRate ? Number(order.vatRate) : 8,
      depositAmount: Number(order.depositAmount),
      paidAmount: Number(order.paidAmount),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      documentType: decrypted.documentType,
      documentOther: decrypted.documentOther,
      documentName: decrypted.documentName,
      documentId: decrypted.documentId,
      documentStatus: order.documentStatus,
      depositType: order.depositType,
      depositValue: order.depositValue ? Number(order.depositValue) : null,
      taxInvoiceExported: order.taxInvoiceExported,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
