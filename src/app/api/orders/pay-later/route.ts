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

          // Get original on-hand for warning calculation
          let originalOnHand = 0;
          if (item.inventoryItemId && item.size) {
            try {
              console.log(
                `Fetching original on-hand for item ${item.inventoryItemId}, size ${item.size}`
              );
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/inventory/original-onhand?inventoryItemId=${item.inventoryItemId}&size=${encodeURIComponent(item.size)}`
              );
              if (response.ok) {
                const data = await response.json();
                originalOnHand = data.originalOnHand || 0;
                console.log(`Original on-hand for item ${item.inventoryItemId}: ${originalOnHand}`);
              } else {
                console.error(
                  `Failed to fetch original on-hand: ${response.status} ${response.statusText}`
                );
              }
            } catch (error) {
              console.error('Error fetching original on-hand for warning calculation:', error);
            }
          }

          console.log(`Creating order item with originalOnHand: ${originalOnHand}`);
          await createOrderItem(
            itemData,
            new Date(orderData.orderDate),
            new Date(orderData.expectedReturnDate),
            originalOnHand
          );
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

      // Add warnings to affected orders after all items are created
      console.log('Adding warnings to affected orders...');
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          if (item.inventoryItemId && item.size) {
            try {
              // Get original on-hand for warning calculation
              let originalOnHand = 0;
              try {
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/inventory/original-onhand?inventoryItemId=${item.inventoryItemId}&size=${encodeURIComponent(item.size)}`
                );
                if (response.ok) {
                  const data = await response.json();
                  originalOnHand = data.originalOnHand || 0;
                }
              } catch (error) {
                console.error('Error fetching original on-hand for retroactive warnings:', error);
              }

              const { addWarningsToAffectedOrders } = await import('@/lib/utils/warningService');
              await addWarningsToAffectedOrders(
                item.inventoryItemId,
                item.size,
                new Date(orderData.orderDate),
                new Date(orderData.expectedReturnDate),
                item.quantity,
                originalOnHand
              );
              console.log(`Added warnings for item ${item.inventoryItemId}, size ${item.size}`);
            } catch (error) {
              console.error('Error adding warnings to affected orders:', error);
            }
          }
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
