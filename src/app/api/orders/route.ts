import { NextRequest, NextResponse } from 'next/server';
import { createOrder, createOrderItem, createOrderNote } from '@/lib/actions/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Order creation API received body:', JSON.stringify(body, null, 2));

    const { customerId, orderDate, expectedReturnDate, totalAmount, depositAmount, items, notes } =
      body;

    // Validate required fields
    console.log('Validating fields:');
    console.log('customerId:', customerId, 'type:', typeof customerId);
    console.log('orderDate:', orderDate, 'type:', typeof orderDate);
    console.log('expectedReturnDate:', expectedReturnDate, 'type:', typeof expectedReturnDate);
    console.log('totalAmount:', totalAmount, 'type:', typeof totalAmount);
    console.log('depositAmount:', depositAmount, 'type:', typeof depositAmount);

    if (
      customerId === undefined ||
      customerId === null ||
      orderDate === undefined ||
      orderDate === null ||
      expectedReturnDate === undefined ||
      expectedReturnDate === null ||
      totalAmount === undefined ||
      totalAmount === null ||
      depositAmount === undefined ||
      depositAmount === null
    ) {
      console.log('Validation failed:');
      if (customerId === undefined || customerId === null) console.log('- customerId is missing');
      if (orderDate === undefined || orderDate === null) console.log('- orderDate is missing');
      if (expectedReturnDate === undefined || expectedReturnDate === null)
        console.log('- expectedReturnDate is missing');
      if (totalAmount === undefined || totalAmount === null)
        console.log('- totalAmount is missing');
      if (depositAmount === undefined || depositAmount === null)
        console.log('- depositAmount is missing');

      return NextResponse.json(
        {
          error:
            'Missing required fields: customerId, orderDate, expectedReturnDate, totalAmount, depositAmount',
        },
        { status: 400 }
      );
    }

    // Create the order
    const orderData = {
      customerId: parseInt(customerId),
      orderDate: new Date(orderDate),
      expectedReturnDate: new Date(expectedReturnDate),
      status: 'Waiting for Payment', // Initial status when created in step 3
      totalAmount: parseFloat(totalAmount),
      depositAmount: parseFloat(depositAmount),
      paidAmount: 0,
      paymentMethod: null,
      paymentStatus: 'Unpaid', // Initial payment status
      documentType: null,
      documentOther: null,
      documentName: null,
      documentId: null,
      depositType: null,
      depositValue: null,
      taxInvoiceExported: false,
    };

    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

    const createdOrder = await createOrder(orderData);
    console.log('Created order:', createdOrder.id);

    // Create order items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        const itemData = {
          orderId: createdOrder.id,
          inventoryItemId: item.inventoryItemId || null,
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
    if (notes && notes.length > 0) {
      for (const note of notes) {
        const noteData = {
          orderId: createdOrder.id,
          itemId: note.itemId || null,
          text: note.text,
          done: note.done || false,
        };

        console.log('Creating order note:', JSON.stringify(noteData, null, 2));
        await createOrderNote(noteData);
      }
    }

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
