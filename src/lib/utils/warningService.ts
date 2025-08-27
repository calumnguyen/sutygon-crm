import { db } from '@/lib/db';
import { orderWarnings, orderItems, orders, customers } from '@/lib/db/schema';
import { and, eq, gte, lte, ne, isNotNull, desc, inArray, sql } from 'drizzle-orm';
import { decrypt } from '@/lib/utils/encryption';

export interface WarningInfo {
  id?: number;
  warningType: 'negative_stock' | 'overlapping_orders' | 'unfinished_tasks';
  warningMessage: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AffectedOrder {
  orderId: number;
  customerName: string;
  orderDate: Date;
  expectedReturnDate: Date;
  quantity: number;
  itemName: string;
  size: string;
}

export async function calculateItemWarning(
  inventoryItemId: number | null,
  size: string,
  quantity: number,
  orderDate: Date,
  expectedReturnDate: Date,
  originalOnHand: number = 0,
  excludeOrderId?: number
): Promise<WarningInfo | null> {
  console.log(
    `calculateItemWarning called with: inventoryItemId=${inventoryItemId}, size=${size}, quantity=${quantity}, originalOnHand=${originalOnHand}`
  );

  if (!inventoryItemId) {
    console.log('No inventoryItemId, returning null');
    return null;
  }

  // Check for overlapping orders to calculate available stock
  try {
    console.log('Querying overlapping orders...');
    const overlappingData = await db
      .select({
        orderItemSize: orderItems.size,
        orderItemQuantity: orderItems.quantity,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orderItems.inventoryItemId, inventoryItemId),
          lte(orders.orderDate, expectedReturnDate),
          gte(orders.expectedReturnDate, orderDate),
          // Exclude the current order if excludeOrderId is provided
          excludeOrderId ? ne(orders.id, excludeOrderId) : undefined
        )
      );

    console.log(`Found ${overlappingData.length} overlapping orders`);

    const overlappingQuantity = overlappingData
      .map((item) => {
        try {
          const decryptedSize = decrypt(item.orderItemSize);
          const matches = decryptedSize === size;
          console.log(
            `Order item size: ${decryptedSize}, matches: ${matches}, quantity: ${item.orderItemQuantity}`
          );
          return matches ? item.orderItemQuantity : 0;
        } catch (e) {
          console.error('Error decrypting overlapping order data:', e);
          return 0;
        }
      })
      .reduce((sum, qty) => sum + qty, 0);

    console.log(`Total overlapping quantity (excluding current order): ${overlappingQuantity}`);
    console.log(`Current order quantity: ${quantity}`);
    const totalRequestedQuantity = overlappingQuantity + quantity;
    const availableStock = originalOnHand - totalRequestedQuantity;
    console.log(`Total requested quantity (overlapping + current): ${totalRequestedQuantity}`);
    console.log(`Available stock: ${availableStock}, requested quantity: ${quantity}`);
    console.log(`Warning condition check: availableStock < 0`);
    console.log(`  availableStock < 0: ${availableStock} < 0 = ${availableStock < 0}`);

    if (availableStock < 0) {
      console.log('Creating negative stock warning');
      return {
        warningType: 'negative_stock',
        warningMessage: `Tồn kho âm: có sẵn ${originalOnHand}, tổng đặt ${totalRequestedQuantity} (thiếu ${Math.abs(availableStock)})`,
        severity: 'high',
      };
    } else {
      console.log('No negative stock warning needed');
    }
  } catch (error) {
    console.error('Error calculating negative stock warning:', error);

    // Fallback: check against original on-hand if overlapping calculation fails
    console.log('Using fallback check against original on-hand');
    if (quantity > originalOnHand) {
      console.log('Creating fallback negative stock warning');
      return {
        warningType: 'negative_stock',
        warningMessage: `Vượt quá số lượng tồn kho. Tồn kho: ${originalOnHand}, Đặt: ${quantity}`,
        severity: 'high',
      };
    }
  }

  console.log('No warning needed, returning null');
  return null;
}

export async function createWarning(
  orderItemId: number,
  inventoryItemId: number | null,
  warningInfo: WarningInfo
): Promise<void> {
  console.log(
    `createWarning called with: orderItemId=${orderItemId}, inventoryItemId=${inventoryItemId}, warningInfo=`,
    warningInfo
  );

  try {
    console.log('Inserting warning into database...');
    const [result] = await db
      .insert(orderWarnings)
      .values({
        orderItemId,
        inventoryItemId,
        warningType: warningInfo.warningType,
        warningMessage: warningInfo.warningMessage,
        severity: warningInfo.severity,
        isResolved: false,
        resolvedAt: null,
        resolvedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    console.log('Warning created successfully with ID:', result.id);
    console.log('Warning details:', {
      orderItemId: result.orderItemId,
      inventoryItemId: result.inventoryItemId,
      warningType: result.warningType,
      warningMessage: result.warningMessage,
      severity: result.severity,
      isResolved: result.isResolved,
    });
  } catch (error) {
    console.error('Error creating warning:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    throw error;
  }
}

export async function getWarningsForOrderItem(orderItemId: number): Promise<
  Array<{
    id: number;
    orderItemId: number;
    warningType: string;
    warningMessage: string;
    isResolved: boolean;
  }>
> {
  try {
    const warnings = await db
      .select()
      .from(orderWarnings)
      .where(eq(orderWarnings.orderItemId, orderItemId))
      .orderBy(desc(orderWarnings.createdAt));

    return warnings;
  } catch (error) {
    console.error('Error getting warnings for order item:', error);
    return [];
  }
}

export async function resolveWarning(warningId: number, resolvedBy: number): Promise<void> {
  try {
    await db
      .update(orderWarnings)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        updatedAt: new Date(),
      })
      .where(eq(orderWarnings.id, warningId));
  } catch (error) {
    console.error('Error resolving warning:', error);
    throw error;
  }
}

export async function unresolveWarning(warningId: number): Promise<void> {
  try {
    await db
      .update(orderWarnings)
      .set({
        isResolved: false,
        resolvedAt: null,
        resolvedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(orderWarnings.id, warningId));
  } catch (error) {
    console.error('Error unresolving warning:', error);
    throw error;
  }
}

export async function getAffectedOrders(
  inventoryItemId: number,
  size: string,
  orderDate: Date,
  expectedReturnDate: Date
): Promise<AffectedOrder[]> {
  try {
    console.log(
      `getAffectedOrders: Looking for overlapping orders with inventoryItemId=${inventoryItemId}, size=${size}, orderDate=${orderDate}, expectedReturnDate=${expectedReturnDate}`
    );

    const overlappingData = await db
      .select({
        orderId: orders.id,
        orderDate: orders.orderDate,
        expectedReturnDate: orders.expectedReturnDate,
        customerName: customers.name,
        orderItemSize: orderItems.size,
        orderItemQuantity: orderItems.quantity,
        orderItemName: orderItems.name,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(orderItems.inventoryItemId, inventoryItemId),
          lte(orders.orderDate, expectedReturnDate),
          gte(orders.expectedReturnDate, orderDate)
        )
      );

    console.log(
      `getAffectedOrders: Found ${overlappingData.length} overlapping orders before size filtering`
    );

    const affectedOrders = overlappingData
      .map((item) => {
        try {
          const decryptedSize = decrypt(item.orderItemSize);
          const decryptedCustomerName = decrypt(item.customerName);
          const decryptedItemName = decrypt(item.orderItemName);

          if (decryptedSize !== size) return null;

          return {
            orderId: item.orderId,
            customerName: decryptedCustomerName,
            orderDate: item.orderDate,
            expectedReturnDate: item.expectedReturnDate,
            quantity: item.orderItemQuantity,
            itemName: decryptedItemName,
            size: decryptedSize,
          };
        } catch (e) {
          console.error('Error decrypting affected order data:', e);
          return null;
        }
      })
      .filter(Boolean) as AffectedOrder[];

    return affectedOrders;
  } catch (error) {
    console.error('Error getting affected orders:', error);
    return [];
  }
}

export async function addWarningsToAffectedOrders(
  inventoryItemId: number,
  size: string,
  orderDate: Date,
  expectedReturnDate: Date,
  newOrderQuantity: number,
  originalOnHand: number
): Promise<void> {
  console.log(
    `addWarningsToAffectedOrders called with: inventoryItemId=${inventoryItemId}, size=${size}, newOrderQuantity=${newOrderQuantity}, originalOnHand=${originalOnHand}`
  );

  try {
    // Get all affected orders
    const affectedOrders = await getAffectedOrders(
      inventoryItemId,
      size,
      orderDate,
      expectedReturnDate
    );
    console.log(
      `Found ${affectedOrders.length} affected orders:`,
      affectedOrders.map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        quantity: o.quantity,
      }))
    );

    if (affectedOrders.length === 0) {
      console.log('No affected orders found');
      return;
    }

    // Calculate total overlapping quantity (affectedOrders already includes the new order)
    const totalOverlappingQuantity = affectedOrders.reduce((sum, order) => sum + order.quantity, 0);
    const availableStock = originalOnHand - totalOverlappingQuantity;
    console.log(
      `Total overlapping quantity: ${totalOverlappingQuantity}, available stock: ${availableStock}`
    );

    if (availableStock < 0) {
      console.log('Available stock is negative, adding warnings to affected orders');
      // Add warnings to all affected orders
      const warningMessage = `Tồn kho âm do đơn hàng mới: có sẵn ${originalOnHand}, tổng đặt ${totalOverlappingQuantity} (thiếu ${Math.abs(availableStock)})`;

      for (const affectedOrder of affectedOrders) {
        console.log(
          `Processing affected order ${affectedOrder.orderId} for customer ${affectedOrder.customerName}`
        );

        // Find the order item for this affected order
        const orderItem = await db
          .select()
          .from(orderItems)
          .where(
            and(
              eq(orderItems.orderId, affectedOrder.orderId),
              eq(orderItems.inventoryItemId, inventoryItemId)
            )
          )
          .limit(1);

        if (orderItem.length > 0) {
          console.log(`Found order item ${orderItem[0].id} for order ${affectedOrder.orderId}`);

          // Check if warning already exists for this order item
          const existingWarning = await db
            .select()
            .from(orderWarnings)
            .where(
              and(
                eq(orderWarnings.orderItemId, orderItem[0].id),
                eq(orderWarnings.warningType, 'negative_stock')
              )
            )
            .limit(1);

          if (existingWarning.length > 0) {
            console.log(
              `Warning already exists for order item ${orderItem[0].id}, updating and marking as unresolved`
            );
            // Update existing warning to be unresolved and update the message
            await db
              .update(orderWarnings)
              .set({
                isResolved: false,
                resolvedAt: null,
                resolvedBy: null,
                warningMessage: warningMessage, // Update with new message
                updatedAt: new Date(),
              })
              .where(eq(orderWarnings.id, existingWarning[0].id));
          } else {
            console.log(`Creating new warning for order item ${orderItem[0].id}`);
            // Create new warning for this order item
            await createWarning(orderItem[0].id, inventoryItemId, {
              warningType: 'negative_stock',
              warningMessage,
              severity: 'high',
            });
          }
          console.log(`Warning processed for order item ${orderItem[0].id}`);
        } else {
          console.log(
            `No order item found for order ${affectedOrder.orderId} with inventoryItemId ${inventoryItemId}`
          );
        }
      }
    } else {
      console.log('Available stock is positive, no warnings needed');
    }
  } catch (error) {
    console.error('Error adding warnings to affected orders:', error);
  }
}

interface OrderWithWarnings {
  id: number;
  orderDate: Date;
  expectedReturnDate: Date;
  status: string;
  totalAmount: number;
  customerId: number;
  customerName: string;
  warningItems: Array<{
    id: number;
    name: string;
    size: string;
    quantity: number;
    warningId: number;
    warningType: string;
    warningMessage: string;
    warningSeverity: string;
    warningIsResolved: boolean;
    warningResolvedAt: Date | null;
    warningResolvedBy: number | null;
  }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export async function getOrdersWithWarnings(
  page: number = 1,
  limit: number = 20,
  resolved?: boolean
): Promise<{ orders: OrderWithWarnings[]; pagination: PaginationInfo }> {
  try {
    const offset = (page - 1) * limit;

    // Build the where clause for warnings
    let warningCondition = isNotNull(orderWarnings.id);
    if (resolved !== undefined) {
      warningCondition = and(isNotNull(orderWarnings.id), eq(orderWarnings.isResolved, resolved))!;
    }

    // Get orders with warnings
    const ordersWithWarnings = await db
      .select({
        orderId: orders.id,
        orderDate: orders.orderDate,
        expectedReturnDate: orders.expectedReturnDate,
        status: orders.status,
        totalAmount: orders.totalAmount,
        customerId: orders.customerId,
        customerName: customers.name,
        itemId: orderItems.id,
        itemName: orderItems.name,
        itemSize: orderItems.size,
        itemQuantity: orderItems.quantity,
        warningId: orderWarnings.id,
        warningType: orderWarnings.warningType,
        warningMessage: orderWarnings.warningMessage,
        warningSeverity: orderWarnings.severity,
        warningIsResolved: orderWarnings.isResolved,
        warningResolvedAt: orderWarnings.resolvedAt,
        warningResolvedBy: orderWarnings.resolvedBy,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(orderWarnings, eq(orderItems.id, orderWarnings.orderItemId))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(warningCondition)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Decrypt the data and group by order
    const groupedOrders = new Map<
      number,
      {
        id: number;
        orderDate: Date;
        expectedReturnDate: Date;
        status: string;
        totalAmount: number;
        customerId: number;
        customerName: string;
        warningItems: Array<{
          id: number;
          name: string;
          size: string;
          quantity: number;
          warningId: number;
          warningType: string;
          warningMessage: string;
          warningSeverity: string;
          warningIsResolved: boolean;
          warningResolvedAt: Date | null;
          warningResolvedBy: number | null;
        }>;
      }
    >();

    for (const row of ordersWithWarnings) {
      try {
        const decryptedCustomerName = decrypt(row.customerName);
        const decryptedItemName = decrypt(row.itemName);
        const decryptedItemSize = decrypt(row.itemSize);

        if (!groupedOrders.has(row.orderId)) {
          groupedOrders.set(row.orderId, {
            id: row.orderId,
            orderDate: row.orderDate,
            expectedReturnDate: row.expectedReturnDate,
            status: row.status,
            totalAmount: Number(row.totalAmount),
            customerId: row.customerId,
            customerName: decryptedCustomerName,
            warningItems: [],
          });
        }

        const order = groupedOrders.get(row.orderId);
        if (order) {
          order.warningItems.push({
            id: row.itemId,
            name: decryptedItemName,
            size: decryptedItemSize,
            quantity: row.itemQuantity,
            warningId: row.warningId,
            warningType: row.warningType,
            warningMessage: row.warningMessage,
            warningSeverity: row.warningSeverity,
            warningIsResolved: row.warningIsResolved,
            warningResolvedAt: row.warningResolvedAt,
            warningResolvedBy: row.warningResolvedBy,
          });
        }
      } catch (error) {
        console.error('Error decrypting order data:', error);
      }
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(orderWarnings, eq(orderItems.id, orderWarnings.orderItemId))
      .where(warningCondition);

    const total = Number(totalCount[0]?.count || 0);

    const totalPages = Math.ceil(total / limit);
    return {
      orders: Array.from(groupedOrders.values()),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching orders with warnings:', error);
    throw error;
  }
}
