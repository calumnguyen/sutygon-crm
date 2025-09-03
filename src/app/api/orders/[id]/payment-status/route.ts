import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderDiscounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateApiSession } from '@/lib/utils/authMiddleware';
import { decryptOrderData, encryptOrderData } from '@/lib/utils/orderEncryption';

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

    // Get the existing order
    const existingOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (existingOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = existingOrder[0];
    const decryptedOrder = decryptOrderData(order);

    // Get all order items to calculate new total
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    // Calculate new total amount from items
    const newTotalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Get discounts
    const discounts = await db
      .select()
      .from(orderDiscounts)
      .where(eq(orderDiscounts.orderId, orderId));
    const totalDiscountAmount = discounts.reduce(
      (sum, discount) => sum + Number(discount.discountAmount),
      0
    );

    // Calculate VAT on discounted amount
    const discountedTotal = newTotalAmount - totalDiscountAmount;
    const vatRate = order.vatRate ? Number(order.vatRate) : 8.0;
    const vatAmount = Math.round(discountedTotal * (vatRate / 100));

    // Get deposit info
    const depositAmount = order.depositValue ? Number(order.depositValue) : 0;
    const paidAmount = Number(order.paidAmount);

    // Determine new payment status
    let paymentStatus: string;
    const orderAmountOnly = discountedTotal + vatAmount; // Total without deposit

    if (paidAmount >= orderAmountOnly) {
      // Check if customer also paid the deposit amount
      if (depositAmount > 0 && paidAmount >= orderAmountOnly + depositAmount) {
        paymentStatus = 'Paid Full with Deposit';
      } else {
        paymentStatus = 'Paid Full';
      }
    } else if (paidAmount > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Unpaid';
    }

    console.log('Recalculated payment status:', {
      newTotalAmount,
      totalDiscountAmount,
      discountedTotal,
      vatAmount,
      depositAmount,
      paidAmount,
      orderAmountOnly,
      paymentStatus,
    });

    // Encrypt the updated data
    const encryptedData = encryptOrderData({
      ...decryptedOrder,
      totalAmount: newTotalAmount,
      vatAmount: vatAmount,
    });

    // Update the order in the database
    await db
      .update(orders)
      .set({
        totalAmount: newTotalAmount.toString(),
        vatAmount: vatAmount.toString(),
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      newTotalAmount,
      vatAmount,
      paymentStatus,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}
