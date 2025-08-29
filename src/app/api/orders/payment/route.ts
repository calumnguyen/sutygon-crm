import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  completeOrderPayment,
  createOrder,
  createOrderItem,
  createOrderNote,
} from '@/lib/actions/orders';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('=== PAYMENT API CALLED ===');
    console.log('Payment API received body:', JSON.stringify(body, null, 2));

    const {
      orderId,
      paymentMethod,
      paidAmount,
      documentInfo,
      depositInfo,
      orderData, // New field for order data if order doesn't exist yet
      discounts, // New field for discounts if order doesn't exist yet
      totalPay, // Frontend calculated total including discounts
    } = body;

    console.log('Payment API - Received discounts:', discounts);

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

      // Save discounts if provided
      console.log('Checking if discounts need to be saved...');
      if (discounts && discounts.length > 0) {
        console.log('Saving discounts for new order:', discounts);
        const { orderDiscounts } = await import('@/lib/db/schema');

        for (const discount of discounts) {
          // Find the itemized name ID by the name
          let itemizedNameId = discount.itemizedNameId;
          if (!itemizedNameId) {
            // If itemizedNameId is not provided, find it by the name
            const { discountItemizedNames } = await import('@/lib/db/schema');
            const itemizedNameResult = await db
              .select({ id: discountItemizedNames.id })
              .from(discountItemizedNames)
              .where(eq(discountItemizedNames.name, discount.itemizedName))
              .limit(1);

            if (itemizedNameResult.length > 0) {
              itemizedNameId = itemizedNameResult[0].id;
            } else {
              console.error('Could not find itemized name ID for:', discount.itemizedName);
              continue; // Skip this discount if we can't find the ID
            }
          }

          // Ensure we have valid user IDs for both requesting and authorized users
          const requestedByUserId = discount.requestedByUserId || discount.authorizedByUserId;
          const authorizedByUserId = discount.authorizedByUserId;

          await db.insert(orderDiscounts).values({
            orderId: createdOrder.id,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            discountAmount: discount.discountAmount,
            itemizedNameId: itemizedNameId,
            description: discount.description,
            requestedByUserId: requestedByUserId,
            authorizedByUserId: discount.authorizedByUserId,
          });
        }
        console.log('Successfully saved all discounts');
      }

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
              } else {
                console.error(
                  `Failed to fetch original on-hand: ${response.status} ${response.statusText}`
                );
              }
            } catch (error) {
              console.error('Error fetching original on-hand for warning calculation:', error);
            }
          }

          console.log('=== About to call createOrderItem (payment) ===');
          console.log('itemData:', JSON.stringify(itemData, null, 2));
          console.log('orderDate:', new Date(orderData.orderDate));
          console.log('expectedReturnDate:', new Date(orderData.expectedReturnDate));

          try {
            await createOrderItem(
              itemData,
              new Date(orderData.orderDate),
              new Date(orderData.expectedReturnDate),
              originalOnHand
            );
            console.log('=== createOrderItem completed successfully (payment) ===');
          } catch (error) {
            console.error('=== Error in createOrderItem (payment) ===', error);
            throw error;
          }
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

    // Get current user ID from request body or session
    const processedByUserId = body.currentUser?.id || 1; // Default to user ID 1 if not provided

    const updatedOrder = await completeOrderPayment(
      finalOrderId,
      paymentMethod,
      paidAmount,
      processedByUserId,
      documentInfo,
      depositInfo,
      orderData ? orderData.totalAmount : undefined, // Pass order total amount if order was just created
      totalPay // Pass the frontend calculated total including discounts
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error completing order payment:', error);
    return NextResponse.json({ error: 'Failed to complete order payment' }, { status: 500 });
  }
}
