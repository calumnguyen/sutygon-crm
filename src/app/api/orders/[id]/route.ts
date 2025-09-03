import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptOrderData, encryptOrderData } from '@/lib/utils/orderEncryption';
import { validateApiSession } from '@/lib/utils/authMiddleware';

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate the request
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authResult = await validateApiSession(request, requestId);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const { orderDate, expectedReturnDate } = body;

    // Get the existing order
    const existingOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (existingOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existingOrder[0];
    const decryptedOrder = decryptOrderData(order);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update order date if provided
    if (orderDate) {
      const newOrderDate = new Date(orderDate);
      updateData.orderDate = newOrderDate;
    }

    // Update expected return date if provided
    if (expectedReturnDate) {
      const newExpectedReturnDate = new Date(expectedReturnDate);
      updateData.expectedReturnDate = newExpectedReturnDate;
    }

    // Encrypt the updated data
    const encryptedData = encryptOrderData({
      ...decryptedOrder,
      ...updateData,
    });

    // Ensure numeric values are converted to strings for database compatibility
    const dbUpdateData = {
      ...encryptedData,
      totalAmount: String(encryptedData.totalAmount),
      vatAmount: encryptedData.vatAmount ? String(encryptedData.vatAmount) : undefined,
      depositAmount: String(encryptedData.depositAmount),
      paidAmount: String(encryptedData.paidAmount),
      depositValue: encryptedData.depositValue ? String(encryptedData.depositValue) : undefined,
      updatedAt: new Date(),
    };

    // Update the order in the database
    await db.update(orders).set(dbUpdateData).where(eq(orders.id, orderId));

    return NextResponse.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
