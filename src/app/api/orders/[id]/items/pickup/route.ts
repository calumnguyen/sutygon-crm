import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, orderItemPickups } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getOrderItems } from '@/lib/actions/orders';
import { encrypt } from '@/lib/utils/encryption';

interface OrderItemWithPickup {
  id: number;
  orderId: number;
  inventoryItemId: number | null;
  formattedId: string | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  pickedUpQuantity?: number;
  pickedUpAt?: string;
  pickedUpByCustomerName?: string;
  facilitatedByUserId?: number;
  facilitatedByUserName?: string;
}

interface PickupItemRequest {
  itemId: number;
  quantity: number;
}

interface PickupRequest {
  items: PickupItemRequest[];
  currentUser: {
    id: number; // This is the integer user ID
  };
  pickedUpByCustomerName?: string; // Customer name who picked up
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    console.log('=== PICKUP API DEBUG START ===');
    console.log('Order ID from params:', id, 'Parsed:', orderId);

    if (isNaN(orderId)) {
      console.log('❌ Invalid order ID:', id);
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body: PickupRequest = await request.json();
    const { items, currentUser, pickedUpByCustomerName } = body;

    console.log('Request body:', {
      itemsCount: items?.length,
      items: items,
      currentUser: currentUser,
      pickedUpByCustomerName: pickedUpByCustomerName,
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ No items provided for pickup');
      return NextResponse.json({ error: 'No items provided for pickup' }, { status: 400 });
    }

    if (!currentUser?.id) {
      console.log('❌ Current user ID is required');
      return NextResponse.json({ error: 'Current user ID is required' }, { status: 400 });
    }

    if (!pickedUpByCustomerName || pickedUpByCustomerName.trim() === '') {
      console.log('❌ Customer name is required');
      return NextResponse.json({ error: 'Tên khách hàng nhận hàng là bắt buộc' }, { status: 400 });
    }

    // Use the current user ID directly (no need to look up)
    const facilitatedByUserId = currentUser.id;
    console.log('✅ Using facilitatedByUserId:', facilitatedByUserId);

    // Get all items for this order first
    const existingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    console.log('=== Pickup API Debug ===');
    console.log('Order ID:', orderId);
    console.log('Requested items:', items);
    console.log(
      'Existing items in order:',
      existingItems.map((item) => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        name: item.name,
        size: item.size,
      }))
    );
    console.log(
      'Item ID types in existing items:',
      existingItems.map((item) => ({
        id: item.id,
        idType: typeof item.id,
        inventoryItemId: item.inventoryItemId,
        inventoryItemIdType: typeof item.inventoryItemId,
      }))
    );

    // Create a mapping of item identifiers to actual database items
    const itemIdMap = new Map();

    // Map by actual database ID (primary method)
    existingItems.forEach((item) => {
      itemIdMap.set(item.id, item);
    });

    // Map by inventoryItemId (fallback for legacy compatibility)
    existingItems.forEach((item) => {
      if (item.inventoryItemId) {
        itemIdMap.set(item.inventoryItemId, item);
      }
    });

    console.log('Item ID Map keys:', Array.from(itemIdMap.keys()));
    console.log('Item ID Map contents:', Object.fromEntries(itemIdMap));

    // Validate and map the requested items to actual database items
    const validItems: Array<{
      id: number;
      orderId: number;
      inventoryItemId: number | null;
      quantity: number;
    }> = [];
    for (const requestedItem of items) {
      console.log(
        `Looking for item ID: ${requestedItem.itemId} (type: ${typeof requestedItem.itemId})`
      );
      const actualItem = itemIdMap.get(requestedItem.itemId);
      if (!actualItem) {
        console.log(`Item with ID ${requestedItem.itemId} not found in order ${orderId}`);
        console.log('Available item IDs:', Array.from(itemIdMap.keys()));
        console.log('Item ID map contents:', Object.fromEntries(itemIdMap));
        return NextResponse.json(
          {
            error: `Item with ID ${requestedItem.itemId} not found in order ${orderId}`,
            availableItems: existingItems.map((item) => ({
              id: item.id,
              inventoryItemId: item.inventoryItemId,
              name: item.name,
            })),
            requestedItemId: requestedItem.itemId,
            requestedItemType: typeof requestedItem.itemId,
          },
          { status: 400 }
        );
      }
      console.log(`Found item:`, {
        id: actualItem.id,
        name: actualItem.name,
        requestedQuantity: requestedItem.quantity,
        currentStatus: actualItem.pickupStatus,
      });
      validItems.push(actualItem);
    }

    // Group items by itemId to avoid duplicates
    console.log('🔄 Grouping items to avoid duplicates...');
    const groupedItems = new Map<number, number>();
    items.forEach((requestedItem) => {
      const existingQuantity = groupedItems.get(requestedItem.itemId) || 0;
      groupedItems.set(requestedItem.itemId, existingQuantity + requestedItem.quantity);
    });

    console.log('📦 Grouped items for pickup:', Array.from(groupedItems.entries()));

    // Update each unique item with pickup information
    const pickupTimestamp = new Date().toISOString();
    const updatePromises = Array.from(groupedItems.entries()).map(
      async ([itemId, totalQuantity]) => {
        // Find the actual database item
        const actualItem = validItems.find(
          (vi) => vi.id === itemId || vi.inventoryItemId === itemId
        );

        if (!actualItem) {
          throw new Error(`Item ${itemId} not found in order`);
        }

        // Validate quantity
        if (totalQuantity > actualItem.quantity) {
          throw new Error(
            `Pickup quantity ${totalQuantity} exceeds available quantity ${actualItem.quantity} for item ${itemId}`
          );
        }

        if (totalQuantity <= 0) {
          throw new Error(`Invalid pickup quantity ${totalQuantity} for item ${itemId}`);
        }

        console.log(`📝 Creating pickup record for item ${actualItem.id}:`, {
          orderItemId: actualItem.id,
          pickedUpQuantity: totalQuantity,
          pickedUpByCustomerName: pickedUpByCustomerName, // Customer who picked up
          facilitatedByUserId: facilitatedByUserId, // Employee who facilitated
          pickupTimestamp,
        });

        // Create pickup record
        console.log(`Creating pickup record for item ${actualItem.id} with values:`, {
          orderItemId: actualItem.id,
          pickedUpQuantity: totalQuantity,
          pickedUpAt: pickupTimestamp,
          pickedUpByCustomerName: pickedUpByCustomerName,
          facilitatedByUserId: facilitatedByUserId,
        });

        const pickupResult = await db
          .insert(orderItemPickups)
          .values({
            orderItemId: actualItem.id,
            pickedUpQuantity: totalQuantity,
            pickedUpAt: new Date(pickupTimestamp),
            pickedUpByCustomerName: encrypt(pickedUpByCustomerName), // Encrypt customer name
            facilitatedByUserId: facilitatedByUserId, // Employee who facilitated
          })
          .returning();

        console.log(`✅ Pickup record created for item ${actualItem.id}:`, pickupResult);

        // Update total picked up quantity for the order item
        const currentPickups = await db
          .select({ total: sql<number>`COALESCE(SUM(${orderItemPickups.pickedUpQuantity}), 0)` })
          .from(orderItemPickups)
          .where(eq(orderItemPickups.orderItemId, actualItem.id));

        const newTotal = currentPickups[0]?.total || 0;

        console.log(`🔄 Updating total picked up quantity for item ${actualItem.id}: ${newTotal}`);

        // Update the order item with new total picked up quantity
        const updateResult = await db
          .update(orderItems)
          .set({
            pickedUpQuantity: newTotal,
            updatedAt: new Date(pickupTimestamp),
          })
          .where(eq(orderItems.id, actualItem.id))
          .returning();

        console.log(`✅ Update result for item ${actualItem.id}:`, updateResult);
        return { pickup: pickupResult, update: updateResult };
      }
    );

    // Execute all updates
    console.log('🚀 Executing updates for items:', validItems.length);
    const updateResults = await Promise.all(updatePromises);
    console.log('📊 Update results:', updateResults);
    console.log('📊 Update results length:', updateResults.length);
    console.log(
      '📊 Update results details:',
      updateResults.map((result, index) => ({
        index,
        result,
        pickupLength: result?.pickup?.length || 0,
        updateLength: result?.update?.length || 0,
      }))
    );

    // Update order status based on pickup status
    // Check if all items in the order have been picked up
    console.log('=== ORDER STATUS UPDATE DEBUG ===');
    console.log('🔄 Starting order status update for order:', orderId);

    let allOrderItems: Array<{
      id: number;
      quantity: number;
      pickedUpQuantity: number | null;
      name: string | null;
    }> = [];
    let pickupEligibleItems: Array<{
      id: number;
      quantity: number;
      pickedUpQuantity: number | null;
      name: string | null;
    }> = [];
    let totalItems = 0;
    let fullyPickedUpItems = 0;

    try {
      // Get all order items with their names to filter out rental extensions
      const { inventoryItems } = await import('@/lib/db/schema');
      allOrderItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          pickedUpQuantity: orderItems.pickedUpQuantity,
          name: inventoryItems.name, // Get name to filter rental extensions
        })
        .from(orderItems)
        .leftJoin(inventoryItems, eq(orderItems.inventoryItemId, inventoryItems.id))
        .where(eq(orderItems.orderId, orderId));

      console.log('📊 All order items query result:', allOrderItems.length, 'items');
      console.log(
        '📋 All order items details:',
        allOrderItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          pickedUpQuantity: item.pickedUpQuantity,
          name: item.name,
        }))
      );

      // Filter out rental extension items (gia hạn thời gian thuê)
      pickupEligibleItems = allOrderItems.filter(
        (item) => !item.name || !item.name.includes('gia hạn thời gian thuê')
      );

      console.log('🎯 Pickup eligible items:', pickupEligibleItems.length, 'items');
      console.log(
        '🎯 Pickup eligible items details:',
        pickupEligibleItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          pickedUpQuantity: item.pickedUpQuantity,
          name: item.name,
        }))
      );

      totalItems = pickupEligibleItems.length;
      fullyPickedUpItems = pickupEligibleItems.filter(
        (item) => (item.pickedUpQuantity || 0) >= item.quantity
      ).length;

      console.log('📈 Pickup statistics:', {
        totalItems,
        fullyPickedUpItems,
        partiallyPickedUpItems: pickupEligibleItems.filter(
          (item) => (item.pickedUpQuantity || 0) > 0 && (item.pickedUpQuantity || 0) < item.quantity
        ).length,
      });

      console.log('Order status update debug:', {
        orderId,
        totalItems,
        fullyPickedUpItems,
        allItems: allOrderItems,
        pickupEligibleItems: pickupEligibleItems.length,
        rentalExtensions: allOrderItems.length - pickupEligibleItems.length,
        pickupEligibleItemsDetails: pickupEligibleItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          pickedUpQuantity: item.pickedUpQuantity,
          name: item.name,
        })),
      });
    } catch (error) {
      console.error('Error querying order items for status update:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Continue with default status if query fails
    }

    // Import orders table
    const { orders } = await import('@/lib/db/schema');

    // Update order status based on pickup progress
    let newOrderStatus = 'Processing'; // Default

    console.log('🧠 Order status logic debug:', {
      fullyPickedUpItems,
      totalItems,
      allOrderItemsWithPickup: allOrderItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        pickedUpQuantity: item.pickedUpQuantity,
        hasPickup: (item.pickedUpQuantity || 0) > 0,
      })),
      pickupEligibleItemsWithPickup: pickupEligibleItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        pickedUpQuantity: item.pickedUpQuantity,
        hasPickup: (item.pickedUpQuantity || 0) > 0,
      })),
      someItemsPickedUp: pickupEligibleItems.some((item) => (item.pickedUpQuantity || 0) > 0),
    });

    if (fullyPickedUpItems === totalItems && totalItems > 0) {
      newOrderStatus = 'Picked Up'; // All items picked up
      console.log('✅ Setting status to Picked Up - all items fully picked up');
    } else if (pickupEligibleItems.some((item) => (item.pickedUpQuantity || 0) > 0)) {
      newOrderStatus = 'Partially Picked Up'; // Some items picked up, but not all
      console.log('🔄 Setting status to Partially Picked Up - some items picked up');
    } else {
      console.log('⏳ Keeping status as Processing - no items picked up');
    }

    console.log('💾 Updating order status:', {
      orderId,
      newOrderStatus,
      fullyPickedUpItems,
      totalItems,
    });

    // Update the order status
    const orderUpdateResult = await db
      .update(orders)
      .set({
        status: newOrderStatus,
        updatedAt: new Date(pickupTimestamp),
      })
      .where(eq(orders.id, orderId))
      .returning();

    console.log('✅ Order status update result:', orderUpdateResult);
    console.log('=== PICKUP API DEBUG END ===');

    // Return success response with pickup details
    return NextResponse.json({
      success: true,
      message: 'Items marked as picked up successfully',
      pickupDetails: {
        orderId,
        facilitatedByUserId,
        pickedUpByCustomerName,
        pickupTimestamp,
        itemsPickedUp: items.map((requestedItem) => {
          const actualItem = validItems.find(
            (vi) => vi.id === requestedItem.itemId || vi.inventoryItemId === requestedItem.itemId
          );
          return {
            requestedItemId: requestedItem.itemId,
            actualItemId: actualItem?.id,
            quantity: requestedItem.quantity,
          };
        }),
        totalItemsPickedUp: groupedItems.size,
        orderStatus: newOrderStatus,
        totalItems,
        pickedUpItems: groupedItems.size,
      },
    });
  } catch (error) {
    console.error('Error marking items as picked up:', error);

    return NextResponse.json(
      {
        error: 'Failed to mark items as picked up',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve pickup status for order items
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    console.log('=== GET Pickup API Debug ===');
    console.log('Order ID:', orderId);
    console.log('Order ID type:', typeof orderId);

    // Get all items for this order with pickup information using the existing function that handles decryption
    const itemsArray = (await getOrderItems(orderId)) as OrderItemWithPickup[];
    console.log('Items found:', itemsArray.length);
    console.log('Items data:', itemsArray);

    return NextResponse.json({
      success: true,
      orderId,
      items: itemsArray,
      summary: {
        totalItems: itemsArray.length,
        pickedUpItems: itemsArray.filter((item) => (item.pickedUpQuantity || 0) > 0).length,
        fullyPickedUpItems: itemsArray.filter(
          (item) => (item.pickedUpQuantity || 0) >= item.quantity
        ).length,
        pendingItems: itemsArray.filter((item) => (item.pickedUpQuantity || 0) === 0).length,
      },
    });
  } catch (error) {
    console.error('Error retrieving pickup status:', error);
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        error: 'Failed to retrieve pickup status',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
