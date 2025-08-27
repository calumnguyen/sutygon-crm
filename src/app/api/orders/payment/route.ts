import { NextRequest, NextResponse } from 'next/server';
import {
  completeOrderPayment,
  createOrder,
  createOrderItem,
  createOrderNote,
} from '@/lib/actions/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Payment API received body:', JSON.stringify(body, null, 2));

    const {
      orderId,
      paymentMethod,
      paidAmount,
      documentInfo,
      depositInfo,
      orderData, // New field for order data if order doesn't exist yet
    } = body;

    console.log('Extracted orderId:', orderId, 'type:', typeof orderId);

    if (!paymentMethod || !paidAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentMethod, paidAmount' },
        { status: 400 }
      );
    }

    if (!['cash', 'qr'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be "cash" or "qr"' },
        { status: 400 }
      );
    }

    let finalOrderId = orderId;

    // If orderData is provided, create the order first
    if (orderData && !orderId) {
      console.log('Creating new order from orderData...');

      const createdOrder = await createOrder({
        customerId: orderData.customerId,
        orderDate: new Date(orderData.orderDate),
        expectedReturnDate: new Date(orderData.expectedReturnDate),
        status: 'Processing', // Set status to Processing since payment is being completed
        totalAmount: orderData.totalAmount,
        depositAmount: orderData.depositAmount,
        paidAmount: 0, // Will be updated by completeOrderPayment
        paymentMethod: null,
        paymentStatus: 'Unpaid',
        documentType: null,
        documentOther: null,
        documentName: null,
        documentId: null,
        depositType: null,
        depositValue: null,
        taxInvoiceExported: false,
      });

      console.log('Created order:', createdOrder.id);
      finalOrderId = createdOrder.id;

      // Create order items if provided
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const itemData = {
            orderId: createdOrder.id,
            inventoryItemId: item.inventoryItemId || null,
            formattedId: item.formattedId || null,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            isExtension: item.isExtension || false,
            extraDays: item.extraDays || null,
            feeType: item.feeType || null,
            percent: item.percent || null,
            isCustom: item.isCustom || false,
          };

          console.log('Creating order item:', JSON.stringify(itemData, null, 2));
          await createOrderItem(itemData);
        }
      }

      // Create order notes if provided
      if (orderData.notes && orderData.notes.length > 0) {
        for (const note of orderData.notes) {
          const noteData = {
            orderId: createdOrder.id,
            itemId: note.itemId,
            text: note.text,
            done: note.done,
          };

          console.log('Creating order note:', JSON.stringify(noteData, null, 2));
          await createOrderNote(noteData);
        }
      }
    }

    const updatedOrder = await completeOrderPayment(
      finalOrderId,
      paymentMethod,
      paidAmount,
      documentInfo,
      depositInfo,
      orderData ? orderData.totalAmount : undefined // Pass order total amount if order was just created
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error completing order payment:', error);
    return NextResponse.json({ error: 'Failed to complete order payment' }, { status: 500 });
  }
}
