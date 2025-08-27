import { NextRequest, NextResponse } from 'next/server';
import {
  markOrderPayLater,
  createOrder,
  createOrderItem,
  createOrderNote,
} from '@/lib/actions/orders';

export async function POST(request: NextRequest) {
  try {
    const { orderId, documentInfo, depositInfo, orderData } = await request.json();

    console.log('Pay later API received:', { orderId, documentInfo, depositInfo, orderData });

    let finalOrderId = orderId;

    // If orderData is provided, create the order first
    if (orderData && !orderId) {
      console.log('Creating new order for pay later from orderData...');

      const createdOrder = await createOrder({
        customerId: orderData.customerId,
        orderDate: new Date(orderData.orderDate),
        expectedReturnDate: new Date(orderData.expectedReturnDate),
        status: 'Processing',
        totalAmount: orderData.totalAmount,
        depositAmount: orderData.depositAmount,
        paidAmount: 0,
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

      console.log('Created order for pay later:', createdOrder.id);
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

          console.log('Creating order item for pay later:', JSON.stringify(itemData, null, 2));
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

          console.log('Creating order note for pay later:', JSON.stringify(noteData, null, 2));
          await createOrderNote(noteData);
        }
      }
    }

    const updatedOrder = await markOrderPayLater(parseInt(finalOrderId), documentInfo, depositInfo);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error marking order as pay later:', error);
    return NextResponse.json({ error: 'Failed to mark order as pay later' }, { status: 500 });
  }
}
