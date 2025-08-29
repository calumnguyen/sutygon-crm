'use server';

import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  orderNotes,
  customers,
  inventoryItems,
  paymentHistory,
  orderDiscounts,
} from '@/lib/db/schema';
import { eq, desc, asc, and, or, gte, lte, count, inArray, sql } from 'drizzle-orm';
import {
  encryptOrderData,
  decryptOrderData,
  encryptOrderItemData,
  decryptOrderItemData,
  encryptOrderNoteData,
  decryptOrderNoteData,
  decryptField,
} from '@/lib/utils/orderEncryption';
import { decryptInventoryData } from '@/lib/utils/inventoryEncryption';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { monitorDatabaseQuery } from '@/lib/utils/performance';
import { calculateExpectedReturnDate } from '@/lib/utils/orderUtils';

// Category code mapping for consistent IDs
const CATEGORY_CODE_MAP: Record<string, string> = {
  'Áo Dài': 'AD',
  Áo: 'AO',
  Quần: 'QU',
  'Văn Nghệ': 'VN',
  'Đồ Tây': 'DT',
  Giầy: 'GI',
  'Dụng Cụ': 'DC',
  'Đầm Dạ Hội': 'DH',
};

// Helper: get formatted ID (e.g., AD-000001)
function getFormattedId(category: string, categoryCounter: number) {
  let code = CATEGORY_CODE_MAP[category];
  if (!code) {
    // Fallback for unknown categories - generate from first letters
    code = (category || 'XX')
      .split(' ')
      .map((w: string) => w[0])
      .join('');
    // Replace Đ/đ with D/d, then remove diacritics
    code = code.replace(/Đ/g, 'D').replace(/đ/g, 'd');
    code = code
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\u0300-\u036f/g, '');
    code = code.toUpperCase().slice(0, 2);
  }
  return `${code}-${String(categoryCounter).padStart(6, '0')}`;
}

export interface OrderDiscount {
  id: number;
  orderId: number;
  discountType: 'vnd' | 'percent';
  discountValue: number;
  discountAmount: number;
  itemizedName: string;
  description: string;
  requestedByUserId: number;
  authorizedByUserId: number;
  createdAt: Date;
}

export interface Order {
  id: number;
  customerId: number;
  orderDate: Date;
  expectedReturnDate: Date;
  status: string;
  totalAmount: number;
  vatAmount?: number; // Make optional for backward compatibility
  depositAmount: number;
  paidAmount: number;
  paymentMethod?: string | null;
  paymentStatus: string;
  // Document deposit fields
  documentType?: string | null;
  documentOther?: string | null;
  documentName?: string | null;
  documentId?: string | null;
  // Deposit info
  depositType?: string | null;
  depositValue?: number | null;
  taxInvoiceExported: boolean;
  // User tracking fields
  createdByUserId?: number | null;
  pickedUpByUserId?: number | null;
  pickedUpAt?: Date | null;
  // Discounts
  discounts?: OrderDiscount[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  inventoryItemId: number | null;
  formattedId: string | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  isExtension: boolean;
  extraDays: number | null;
  feeType: string | null;
  percent: number | null;
  isCustom: boolean;
  imageUrl?: string | null; // Add imageUrl field
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderNote {
  id: number;
  orderId: number;
  itemId?: number | null;
  text: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrders(options?: {
  limit?: number;
  offset?: number;
  customerId?: number;
  status?: string[];
  paymentStatus?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  orderBy?: 'orderDate' | 'createdAt' | 'expectedReturnDate';
  orderDirection?: 'asc' | 'desc';
}): Promise<Order[]> {
  const {
    limit = 50,
    offset = 0,
    customerId,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options || {};

  // Build where conditions
  const conditions = [];

  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }

  if (status && status.length > 0) {
    conditions.push(inArray(orders.status, status));
  }

  if (paymentStatus && paymentStatus.length > 0) {
    conditions.push(inArray(orders.paymentStatus, paymentStatus));
  }

  if (dateFrom) {
    conditions.push(gte(orders.orderDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(orders.orderDate, dateTo));
  }

  // Use index-optimized query
  const orderColumn =
    orderBy === 'orderDate'
      ? orders.orderDate
      : orderBy === 'expectedReturnDate'
        ? orders.expectedReturnDate
        : orders.createdAt;

  const orderFunc = orderDirection === 'asc' ? asc : desc;

  // Build the complete query in one go
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const dbOrders = await db
    .select()
    .from(orders)
    .where(whereCondition)
    .orderBy(orderFunc(orderColumn))
    .limit(limit)
    .offset(offset);

  // Decrypt sensitive data for display
  return dbOrders.map((order) => {
    const decrypted = decryptOrderData(order);
    return {
      id: order.id,
      customerId: order.customerId,
      orderDate: order.orderDate,
      expectedReturnDate: order.expectedReturnDate,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      depositAmount: Number(order.depositAmount),
      paidAmount: Number(order.paidAmount),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      documentType: decrypted.documentType,
      documentOther: decrypted.documentOther,
      documentName: decrypted.documentName,
      documentId: decrypted.documentId,
      depositType: order.depositType,
      depositValue: order.depositValue ? Number(order.depositValue) : null,
      taxInvoiceExported: order.taxInvoiceExported,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });
}

export async function getOrdersCount(options?: {
  customerId?: number;
  status?: string[];
  paymentStatus?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<number> {
  const { customerId, status, paymentStatus, dateFrom, dateTo } = options || {};

  const conditions = [];

  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }

  if (status && status.length > 0) {
    conditions.push(inArray(orders.status, status));
  }

  if (paymentStatus && paymentStatus.length > 0) {
    conditions.push(inArray(orders.paymentStatus, paymentStatus));
  }

  if (dateFrom) {
    conditions.push(gte(orders.orderDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(orders.orderDate, dateTo));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db.select({ count: count() }).from(orders).where(whereCondition);

  return result[0].count;
}

export async function getOrdersByCustomer(
  customerId: number,
  options?: {
    limit?: number;
    offset?: number;
    status?: string[];
  }
): Promise<Order[]> {
  return getOrders({
    customerId,
    ...options,
  });
}

export async function getTodaysOrders(): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getOrders({
    dateFrom: today,
    dateTo: tomorrow,
    limit: 100,
    orderBy: 'createdAt',
    orderDirection: 'desc',
  });
}

export async function getOverdueOrders(): Promise<Order[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return getOrders({
    dateTo: today,
    status: ['Processing'],
    limit: 100,
    orderBy: 'expectedReturnDate',
    orderDirection: 'asc',
  });
}

export async function getOrderById(orderId: number): Promise<Order | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) return null;

  // Fetch discounts for this order
  const { orderDiscounts, discountItemizedNames } = await import('@/lib/db/schema');
  const discounts = await db
    .select({
      id: orderDiscounts.id,
      orderId: orderDiscounts.orderId,
      discountType: orderDiscounts.discountType,
      discountValue: orderDiscounts.discountValue,
      discountAmount: orderDiscounts.discountAmount,
      itemizedNameId: orderDiscounts.itemizedNameId,
      description: orderDiscounts.description,
      requestedByUserId: orderDiscounts.requestedByUserId,
      authorizedByUserId: orderDiscounts.authorizedByUserId,
      createdAt: orderDiscounts.createdAt,
      itemizedName: discountItemizedNames.name,
    })
    .from(orderDiscounts)
    .innerJoin(discountItemizedNames, eq(orderDiscounts.itemizedNameId, discountItemizedNames.id))
    .where(eq(orderDiscounts.orderId, orderId))
    .orderBy(orderDiscounts.createdAt);

  const orderDiscountsData: OrderDiscount[] = discounts.map((discount) => ({
    id: discount.id,
    orderId: discount.orderId,
    discountType: discount.discountType as 'vnd' | 'percent',
    discountValue: Number(discount.discountValue),
    discountAmount: Number(discount.discountAmount),
    itemizedName: discount.itemizedName,
    description: discount.description || '',
    requestedByUserId: discount.requestedByUserId,
    authorizedByUserId: discount.authorizedByUserId,
    createdAt: discount.createdAt,
  }));

  const decrypted = decryptOrderData(order);
  return {
    id: order.id,
    customerId: order.customerId,
    orderDate: order.orderDate,
    expectedReturnDate: order.expectedReturnDate,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    vatAmount: Number(order.vatAmount || 0),
    depositAmount: Number(order.depositAmount),
    paidAmount: Number(order.paidAmount),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    documentType: decrypted.documentType,
    documentOther: decrypted.documentOther,
    documentName: decrypted.documentName,
    documentId: decrypted.documentId,
    depositType: order.depositType,
    depositValue: order.depositValue ? Number(order.depositValue) : null,
    taxInvoiceExported: order.taxInvoiceExported,
    discounts: orderDiscountsData,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const dbItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  // Get inventory items for formatted IDs and images
  const inventoryItemIds = dbItems
    .map((item) => item.inventoryItemId)
    .filter((id): id is number => id !== null);

  let inventoryItemsData: (typeof inventoryItems.$inferSelect)[] = [];
  if (inventoryItemIds.length > 0) {
    inventoryItemsData = await db
      .select()
      .from(inventoryItems)
      .where(inArray(inventoryItems.id, inventoryItemIds));
  }

  // Get warnings for all order items
  const orderItemIds = dbItems.map((item) => item.id);
  let warningsData: Array<{
    orderItemId: number;
    isResolved: boolean;
    warningMessage: string;
    resolvedAt: Date | null;
    resolvedBy: number | null;
  }> = [];
  if (orderItemIds.length > 0) {
    const { orderWarnings } = await import('@/lib/db/schema');
    warningsData = await db
      .select()
      .from(orderWarnings)
      .where(inArray(orderWarnings.orderItemId, orderItemIds));
  }

  // Decrypt sensitive data for display
  return dbItems.map((item) => {
    const decrypted = decryptOrderItemData(item);

    // Find corresponding inventory item for formatted ID and image
    const inventoryItem = inventoryItemsData.find((inv) => inv.id === item.inventoryItemId);
    let formattedId = null;
    let imageUrl = null;

    if (inventoryItem) {
      const decryptedInventoryItem = decryptInventoryData(inventoryItem);
      formattedId = getFormattedId(decryptedInventoryItem.category, inventoryItem.categoryCounter);
      imageUrl = inventoryItem.imageUrl;
    }

    // Find warnings for this item
    const itemWarnings = warningsData.filter((w) => w.orderItemId === item.id);
    const hasUnresolvedWarnings = itemWarnings.some((w) => !w.isResolved);
    const hasResolvedWarnings = itemWarnings.some((w) => w.isResolved);

    return {
      id: item.id,
      orderId: item.orderId,
      inventoryItemId: item.inventoryItemId,
      formattedId: formattedId,
      name: decrypted.name,
      size: decrypted.size,
      quantity: item.quantity,
      price: item.price,
      isExtension: item.isExtension,
      extraDays: item.extraDays,
      feeType: item.feeType,
      percent: item.percent,
      isCustom: item.isCustom,
      imageUrl: imageUrl, // Include image URL from inventory item
      warning: hasUnresolvedWarnings
        ? itemWarnings.find((w) => !w.isResolved)?.warningMessage
        : undefined,
      warningResolved: !hasUnresolvedWarnings && hasResolvedWarnings,
      warningResolvedAt: hasResolvedWarnings
        ? itemWarnings.find((w) => w.isResolved)?.resolvedAt
        : null,
      warningResolvedBy: hasResolvedWarnings
        ? itemWarnings.find((w) => w.isResolved)?.resolvedBy
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
}

export async function getOrderNotes(orderId: number): Promise<OrderNote[]> {
  const dbNotes = await db.select().from(orderNotes).where(eq(orderNotes.orderId, orderId));

  // Decrypt sensitive data for display
  return dbNotes.map((note) => {
    const decrypted = decryptOrderNoteData(note);
    return {
      id: note.id,
      orderId: note.orderId,
      itemId: note.itemId,
      text: decrypted.text,
      done: note.done,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  });
}

// Cache for note existence check (simple optimization)
let noteExistenceCache: { hasNotes: boolean; lastChecked: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

// Get note counts for multiple orders efficiently
export async function getOrderNoteCounts(
  orderIds: number[]
): Promise<Map<number, { notComplete: number; total: number }>> {
  if (orderIds.length === 0) {
    return new Map();
  }

  // Quick cache check for note existence
  const now = Date.now();
  if (!noteExistenceCache || now - noteExistenceCache.lastChecked > CACHE_DURATION) {
    const hasNotesResult = await db
      .select({ exists: sql`1` })
      .from(orderNotes)
      .limit(1);
    noteExistenceCache = {
      hasNotes: hasNotesResult.length > 0,
      lastChecked: now,
    };
  }

  // If no notes exist at all, return empty counts quickly
  if (!noteExistenceCache.hasNotes) {
    const emptyMap = new Map<number, { notComplete: number; total: number }>();
    orderIds.forEach((orderId) => {
      emptyMap.set(orderId, { notComplete: 0, total: 0 });
    });
    return emptyMap;
  }

  return monitorDatabaseQuery(
    'getOrderNoteCounts',
    async () => {
      // Get all notes for the given order IDs
      const allNotes = await db
        .select({
          orderId: orderNotes.orderId,
          done: orderNotes.done,
        })
        .from(orderNotes)
        .where(inArray(orderNotes.orderId, orderIds));

      // Group by order ID and count
      const countsMap = new Map<number, { notComplete: number; total: number }>();

      // Initialize all order IDs with zero counts
      orderIds.forEach((orderId) => {
        countsMap.set(orderId, { notComplete: 0, total: 0 });
      });

      // Count notes for each order
      allNotes.forEach((note) => {
        const current = countsMap.get(note.orderId) || { notComplete: 0, total: 0 };
        current.total += 1;
        if (!note.done) {
          current.notComplete += 1;
        }
        countsMap.set(note.orderId, current);
      });

      return countsMap;
    },
    () => orderIds.length
  );
}

export async function createOrder(
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  discounts?: Array<{ discountAmount: number }>
): Promise<Order> {
  try {
    // Get current VAT percentage from settings
    const { getVATPercentage } = await import('@/lib/utils/storeSettings');
    const vatPercentage = await getVATPercentage();

    // Calculate total discount amount
    const totalDiscountAmount =
      discounts?.reduce((sum, discount) => sum + discount.discountAmount, 0) || 0;

    // Calculate VAT on discounted amount
    const orderTotal = Number(orderData.totalAmount);
    const discountedTotal = orderTotal - totalDiscountAmount;
    const vatAmount = Math.round(discountedTotal * (vatPercentage / 100));

    // Encrypt sensitive order data
    const encryptedData = encryptOrderData({
      ...orderData,
      vatAmount: vatAmount,
    });

    const [newOrder] = await db
      .insert(orders)
      .values({
        customerId: encryptedData.customerId,
        orderDate: encryptedData.orderDate,
        expectedReturnDate: encryptedData.expectedReturnDate,
        status: 'Processing', // All orders start as Processing
        totalAmount: String(encryptedData.totalAmount),
        vatAmount: String(vatAmount),
        depositAmount: String(encryptedData.depositAmount),
        paidAmount: '0',
        paymentMethod: null,
        paymentStatus: 'Unpaid', // Default payment status
        documentType: null,
        documentOther: null,
        documentName: null,
        documentId: null,
        depositType: null,
        depositValue: null,
        taxInvoiceExported: false, // Initialize new field
        createdByUserId: orderData.createdByUserId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return the new order with decrypted data
    const decryptedOrder = decryptOrderData(newOrder);
    return {
      id: newOrder.id,
      customerId: newOrder.customerId,
      orderDate: newOrder.orderDate,
      expectedReturnDate: newOrder.expectedReturnDate,
      status: newOrder.status,
      totalAmount: Number(newOrder.totalAmount),
      vatAmount: Number(newOrder.vatAmount),
      depositAmount: Number(newOrder.depositAmount),
      paidAmount: Number(newOrder.paidAmount),
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      documentType: decryptedOrder.documentType,
      documentOther: decryptedOrder.documentOther,
      documentName: decryptedOrder.documentName,
      documentId: decryptedOrder.documentId,
      depositType: newOrder.depositType,
      depositValue: newOrder.depositValue ? Number(newOrder.depositValue) : null,
      taxInvoiceExported: newOrder.taxInvoiceExported,
      createdByUserId: newOrder.createdByUserId,
      pickedUpByUserId: newOrder.pickedUpByUserId,
      pickedUpAt: newOrder.pickedUpAt,
      createdAt: newOrder.createdAt,
      updatedAt: newOrder.updatedAt,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

export async function createOrderItem(
  itemData: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>,
  orderDate?: Date,
  expectedReturnDate?: Date,
  originalOnHand?: number
): Promise<OrderItem> {
  console.log('=== createOrderItem called ===');
  console.log('itemData:', JSON.stringify(itemData, null, 2));
  console.log('orderDate:', orderDate);
  console.log('expectedReturnDate:', expectedReturnDate);

  try {
    // Encrypt sensitive order item data
    const encryptedData = encryptOrderItemData(itemData);

    const [newItem] = await db
      .insert(orderItems)
      .values({
        orderId: encryptedData.orderId,
        inventoryItemId: encryptedData.inventoryItemId,
        name: encryptedData.name,
        size: encryptedData.size,
        quantity: encryptedData.quantity,
        price: encryptedData.price,
        isExtension: encryptedData.isExtension,
        extraDays: encryptedData.extraDays,
        feeType: encryptedData.feeType,
        percent: encryptedData.percent,
        isCustom: encryptedData.isCustom,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('Order item created with ID:', newItem.id);

    // Calculate warning if we have the necessary data
    console.log(
      `Checking warning conditions: orderDate=${orderDate}, expectedReturnDate=${expectedReturnDate}, originalOnHand=${originalOnHand}, inventoryItemId=${itemData.inventoryItemId}`
    );

    if (
      orderDate &&
      expectedReturnDate &&
      originalOnHand !== undefined &&
      itemData.inventoryItemId
    ) {
      console.log('All conditions met, calculating warning...');
      const { calculateItemWarning, createWarning, addWarningsToAffectedOrders } = await import(
        '@/lib/utils/warningService'
      );
      const warningInfo = await calculateItemWarning(
        itemData.inventoryItemId,
        itemData.size,
        itemData.quantity,
        orderDate,
        expectedReturnDate,
        originalOnHand,
        itemData.orderId // Exclude the current order from overlapping calculation
      );

      console.log('Warning calculation result:', warningInfo);

      // If there's a warning, create it in the database
      if (warningInfo) {
        console.log('Creating warning in database...');
        await createWarning(newItem.id, itemData.inventoryItemId, warningInfo);
        console.log('Warning created successfully');
      } else {
        console.log('No warning needed');
      }
    } else {
      console.log('Warning conditions not met');
    }

    // Return the new item with decrypted data
    const decryptedItem = decryptOrderItemData(newItem);
    return {
      id: newItem.id,
      orderId: newItem.orderId,
      inventoryItemId: newItem.inventoryItemId,
      formattedId: null, // Will be populated when fetched
      name: decryptedItem.name,
      size: decryptedItem.size,
      quantity: newItem.quantity,
      price: newItem.price,
      isExtension: newItem.isExtension,
      extraDays: newItem.extraDays,
      feeType: newItem.feeType,
      percent: newItem.percent,
      isCustom: newItem.isCustom,
      imageUrl: null, // Will be populated when fetched
      createdAt: newItem.createdAt,
      updatedAt: newItem.updatedAt,
    };
  } catch (error) {
    console.error('Error creating order item:', error);
    throw new Error('Failed to create order item');
  }
}

// Interface for input data that can accept string itemId
interface CreateOrderNoteInput {
  orderId: number;
  itemId?: number | string | null;
  text: string;
  done: boolean;
}

export async function createOrderNote(noteData: CreateOrderNoteInput): Promise<OrderNote> {
  try {
    // Handle itemId - if it's a string (like "AD-002412-M"), we need to find the corresponding order item ID
    let resolvedItemId: number | null = null;

    if (typeof noteData.itemId === 'number') {
      resolvedItemId = noteData.itemId;
    } else if (typeof noteData.itemId === 'string') {
      // This is a string identifier like "AD-002412-M", we need to find the corresponding order item
      // For now, we'll set it to null since we don't have a direct mapping
      // TODO: Implement proper mapping if needed
      resolvedItemId = null;
      console.log(
        `Note: itemId "${noteData.itemId}" is a string identifier, setting to null for now`
      );
    }

    // Encrypt sensitive order note data
    const encryptedData = encryptOrderNoteData({
      ...noteData,
      itemId: resolvedItemId,
    });

    const [newNote] = await db
      .insert(orderNotes)
      .values({
        orderId: encryptedData.orderId,
        itemId: encryptedData.itemId,
        text: encryptedData.text,
        done: encryptedData.done,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return the new note with decrypted data
    const decryptedNote = decryptOrderNoteData(newNote);
    return {
      id: newNote.id,
      orderId: newNote.orderId,
      itemId: newNote.itemId,
      text: decryptedNote.text,
      done: newNote.done,
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt,
    };
  } catch (error) {
    console.error('Error creating order note:', error);
    throw new Error('Failed to create order note');
  }
}

export async function updateOrder(
  orderId: number,
  orderData: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Order> {
  try {
    // Encrypt sensitive order data
    const encryptedData = encryptOrderData(
      orderData as Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
    );

    // Prepare update data with proper type conversion
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (encryptedData.customerId !== undefined) updateData.customerId = encryptedData.customerId;
    if (encryptedData.orderDate !== undefined) updateData.orderDate = encryptedData.orderDate;
    if (encryptedData.expectedReturnDate !== undefined)
      updateData.expectedReturnDate = encryptedData.expectedReturnDate;
    if (encryptedData.status !== undefined) updateData.status = encryptedData.status;
    if (encryptedData.totalAmount !== undefined)
      updateData.totalAmount = String(encryptedData.totalAmount);
    if (encryptedData.depositAmount !== undefined)
      updateData.depositAmount = String(encryptedData.depositAmount);
    if (encryptedData.taxInvoiceExported !== undefined)
      updateData.taxInvoiceExported = encryptedData.taxInvoiceExported; // Add taxInvoiceExported to update

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Return the updated order with decrypted data
    const decryptedOrder = decryptOrderData(updatedOrder);
    return {
      id: updatedOrder.id,
      customerId: updatedOrder.customerId,
      orderDate: updatedOrder.orderDate,
      expectedReturnDate: updatedOrder.expectedReturnDate,
      status: updatedOrder.status,
      totalAmount: Number(updatedOrder.totalAmount),
      depositAmount: Number(updatedOrder.depositAmount),
      paidAmount: Number(updatedOrder.paidAmount),
      paymentMethod: updatedOrder.paymentMethod,
      paymentStatus: updatedOrder.paymentStatus,
      documentType: decryptedOrder.documentType,
      documentOther: decryptedOrder.documentOther,
      documentName: decryptedOrder.documentName,
      documentId: decryptedOrder.documentId,
      depositType: updatedOrder.depositType,
      depositValue: updatedOrder.depositValue ? Number(updatedOrder.depositValue) : null,
      taxInvoiceExported: updatedOrder.taxInvoiceExported, // Include new field
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    };
  } catch (error) {
    console.error('Error updating order:', error);
    throw new Error('Failed to update order');
  }
}

export async function deleteOrder(orderId: number): Promise<void> {
  try {
    // Delete payment history first (foreign key constraint)
    await db.delete(paymentHistory).where(eq(paymentHistory.orderId, orderId));

    // Delete order discounts (foreign key constraint)
    await db.delete(orderDiscounts).where(eq(orderDiscounts.orderId, orderId));

    // Delete order notes (foreign key constraint)
    await db.delete(orderNotes).where(eq(orderNotes.orderId, orderId));

    // Get order item IDs to delete related warnings
    const orderItemIds = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Delete order warnings for these items (foreign key constraint to order items)
    if (orderItemIds.length > 0) {
      const { orderWarnings } = await import('@/lib/db/schema');
      await db.delete(orderWarnings).where(
        inArray(
          orderWarnings.orderItemId,
          orderItemIds.map((item) => item.id)
        )
      );
    }

    // Delete order items (foreign key constraint)
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

    // Finally delete the order
    await db.delete(orders).where(eq(orders.id, orderId));
  } catch (error) {
    console.error('Error deleting order:', error);
    throw new Error('Failed to delete order');
  }
}

export async function completeOrderPayment(
  orderId: number,
  paymentMethod: 'cash' | 'qr',
  paidAmount: number,
  processedByUserId: number, // Add user ID who processed the payment
  documentInfo?: {
    documentType: string;
    documentOther?: string;
    documentName: string;
    documentId: string;
  },
  depositInfo?: {
    depositType: 'vnd' | 'percent';
    depositValue: number;
  },
  orderTotalAmount?: number, // New parameter for when order was just created
  totalPay?: number // Frontend calculated total including discounts
): Promise<Order> {
  try {
    console.log('Starting payment completion for order ID:', orderId);

    // First, check if the order exists
    const existingOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    console.log('Existing order found:', existingOrder.length > 0);
    if (existingOrder.length > 0) {
      console.log('Order details:', JSON.stringify(existingOrder[0], null, 2));
    }

    // Encrypt document info if provided
    const encryptedDocumentInfo = documentInfo
      ? {
          documentType: documentInfo.documentType ? encrypt(documentInfo.documentType) : null,
          documentOther: documentInfo.documentOther ? encrypt(documentInfo.documentOther) : null,
          documentName: documentInfo.documentName ? encrypt(documentInfo.documentName) : null,
          documentId: documentInfo.documentId ? encrypt(documentInfo.documentId) : null,
        }
      : {};

    // Process deposit info if provided (both as plain values)
    const processedDepositInfo = depositInfo
      ? {
          depositType: depositInfo.depositType || null,
          depositValue:
            depositInfo.depositValue !== undefined && depositInfo.depositValue !== null
              ? depositInfo.depositValue
              : null,
        }
      : {};

    // Determine payment status based on payment amount and deposit
    let paymentStatus: string;

    // Use provided order total amount if available (for newly created orders), otherwise get from database
    const orderTotal =
      orderTotalAmount !== undefined ? orderTotalAmount : Number(existingOrder[0].totalAmount);
    const depositAmount = depositInfo ? depositInfo.depositValue : 0;

    // Use frontend calculated total (including discounts) if available, otherwise use original total
    const discountedTotal = totalPay !== undefined ? totalPay : orderTotal;

    // For payment status, we need to determine if the customer paid the full order amount
    // If totalPay is provided, it includes deposit, so we need to subtract deposit to get order amount only
    const orderAmountOnly = totalPay !== undefined ? totalPay - depositAmount : orderTotal;

    if (paidAmount >= orderAmountOnly) {
      // Check if customer also paid the deposit amount
      if (depositInfo && paidAmount >= orderAmountOnly + depositAmount) {
        paymentStatus = 'Paid Full with Deposit';
      } else {
        paymentStatus = 'Paid Full';
      }
    } else if (paidAmount > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Unpaid';
    }

    console.log('Determined payment status:', paymentStatus);

    // Calculate VAT based on discounted total (if discounts exist)
    let vatAmount = existingOrder[0].vatAmount ? Number(existingOrder[0].vatAmount) : 0;

    // If there are discounts, recalculate VAT on the discounted amount
    const discounts = await db
      .select()
      .from(orderDiscounts)
      .where(eq(orderDiscounts.orderId, orderId));

    if (discounts.length > 0) {
      const totalDiscountAmount = discounts.reduce(
        (sum: number, discount: { discountAmount: string | number }) =>
          sum + Number(discount.discountAmount),
        0
      );
      const subtotalAfterDiscount = orderTotal - totalDiscountAmount;

      // Get current VAT percentage from settings
      const { getVATPercentage } = await import('@/lib/utils/storeSettings');
      const vatPercentage = await getVATPercentage();
      vatAmount = Math.round(subtotalAfterDiscount * (vatPercentage / 100));
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      paidAmount: paidAmount.toString(),
      paymentMethod,
      paymentStatus,
      vatAmount: vatAmount.toString(), // Update VAT amount
      updatedAt: new Date(),
      ...encryptedDocumentInfo,
      ...processedDepositInfo,
    };

    // If there's deposit info, also update the order's depositAmount field
    if (depositInfo && depositInfo.depositValue > 0) {
      // Calculate the actual deposit amount based on type
      let actualDepositAmount: number;
      if (depositInfo.depositType === 'percent') {
        // For percentage deposits, calculate based on order total
        actualDepositAmount = Math.round(orderTotal * (depositInfo.depositValue / 100));
      } else {
        // For fixed amount deposits, use the value directly
        actualDepositAmount = depositInfo.depositValue;
      }
      updateData.depositAmount = actualDepositAmount.toString();
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Check if order was found and updated
    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    // Save payment history
    await db.insert(paymentHistory).values({
      orderId: orderId,
      paymentMethod: paymentMethod,
      amount: paidAmount.toString(),
      processedByUserId: processedByUserId,
      paymentDate: new Date(),
    });

    console.log('Payment history saved:', {
      orderId,
      paymentMethod,
      amount: paidAmount,
      processedByUserId,
    });

    // Debug: Log the order structure
    console.log('Updated order from DB:', JSON.stringify(updatedOrder, null, 2));

    // Return the updated order with decrypted data
    let decryptedOrder;
    try {
      decryptedOrder = decryptOrderData(updatedOrder);
    } catch (error) {
      console.error('Error decrypting order data:', error);
      // Fallback: return order without decrypted fields
      decryptedOrder = {
        documentType: null,
        documentOther: null,
        documentName: null,
        documentId: null,
      };
    }

    return {
      id: updatedOrder.id,
      customerId: updatedOrder.customerId,
      orderDate: updatedOrder.orderDate,
      expectedReturnDate: updatedOrder.expectedReturnDate,
      status: updatedOrder.status,
      totalAmount: Number(updatedOrder.totalAmount),
      depositAmount: Number(updatedOrder.depositAmount),
      paidAmount: Number(updatedOrder.paidAmount),
      paymentMethod: updatedOrder.paymentMethod,
      paymentStatus: updatedOrder.paymentStatus,
      documentType: decryptedOrder.documentType,
      documentOther: decryptedOrder.documentOther,
      documentName: decryptedOrder.documentName,
      documentId: decryptedOrder.documentId,
      depositType: updatedOrder.depositType,
      depositValue: updatedOrder.depositValue ? Number(updatedOrder.depositValue) : null,
      taxInvoiceExported: updatedOrder.taxInvoiceExported, // Include new field
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    };
  } catch (error) {
    console.error('Error completing order payment:', error);
    throw new Error('Failed to complete order payment');
  }
}

export async function markDocumentOnFile(orderId: number): Promise<void> {
  try {
    console.log('Marking document as on file for order ID:', orderId);

    const result = await db
      .update(orders)
      .set({
        documentStatus: 'on_file',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    console.log('Document status update result:', result);

    if (result.length === 0) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
  } catch (error) {
    console.error('Error marking document as on file:', error);
    throw new Error(
      `Failed to mark document as on file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function markOrderPayLater(
  orderId: number,
  documentInfo?: {
    documentType: string;
    documentOther?: string;
    documentName: string;
    documentId: string;
  },
  depositInfo?: {
    depositType: 'vnd' | 'percent';
    depositValue: number;
  }
): Promise<Order> {
  try {
    console.log('Marking order as pay later for order ID:', orderId);

    // Encrypt document info if provided
    const encryptedDocumentInfo = documentInfo
      ? {
          documentType: documentInfo.documentType ? encrypt(documentInfo.documentType) : null,
          documentOther: documentInfo.documentOther ? encrypt(documentInfo.documentOther) : null,
          documentName: documentInfo.documentName ? encrypt(documentInfo.documentName) : null,
          documentId: documentInfo.documentId ? encrypt(documentInfo.documentId) : null,
        }
      : {};

    // Process deposit info if provided
    const processedDepositInfo = depositInfo
      ? {
          depositType: depositInfo.depositType || null,
          depositValue:
            depositInfo.depositValue !== undefined && depositInfo.depositValue !== null
              ? depositInfo.depositValue
              : null,
        }
      : {};

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: 'Processing', // Order status remains Processing
      paymentStatus: 'Unpaid', // Payment status remains Unpaid for pay later
      updatedAt: new Date(),
      ...encryptedDocumentInfo,
      ...processedDepositInfo,
    };

    console.log('Update data for pay later:', JSON.stringify(updateData, null, 2));

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    // Check if order was found and updated
    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    console.log('Updated order to pay later:', JSON.stringify(updatedOrder, null, 2));

    // Return the updated order with decrypted data
    let decryptedOrder;
    try {
      decryptedOrder = decryptOrderData(updatedOrder);
    } catch (error) {
      console.error('Error decrypting order data:', error);
      // Fallback: return order without decrypted fields
      decryptedOrder = {
        documentType: null,
        documentOther: null,
        documentName: null,
        documentId: null,
      };
    }

    return {
      id: updatedOrder.id,
      customerId: updatedOrder.customerId,
      orderDate: updatedOrder.orderDate,
      expectedReturnDate: updatedOrder.expectedReturnDate,
      status: updatedOrder.status,
      totalAmount: Number(updatedOrder.totalAmount),
      depositAmount: Number(updatedOrder.depositAmount),
      paidAmount: Number(updatedOrder.paidAmount),
      paymentMethod: updatedOrder.paymentMethod,
      paymentStatus: updatedOrder.paymentStatus,
      documentType: decryptedOrder.documentType,
      documentOther: decryptedOrder.documentOther,
      documentName: decryptedOrder.documentName,
      documentId: decryptedOrder.documentId,
      depositType: updatedOrder.depositType,
      depositValue: updatedOrder.depositValue ? Number(updatedOrder.depositValue) : null,
      taxInvoiceExported: updatedOrder.taxInvoiceExported, // Include new field
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    };
  } catch (error) {
    console.error('Error marking order as pay later:', error);
    throw new Error('Failed to mark order as pay later');
  }
}

// Get orders with customer information for table display
export async function getOrdersWithCustomers(options?: {
  limit?: number;
  offset?: number;
  customerId?: number;
  status?: string[];
  paymentStatus?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  orderBy?: 'orderDate' | 'createdAt' | 'expectedReturnDate';
  orderDirection?: 'asc' | 'desc';
}): Promise<
  (Order & {
    customerName: string;
    calculatedReturnDate: Date;
    noteNotComplete: number;
    noteTotal: number;
  })[]
> {
  return monitorDatabaseQuery(
    'getOrdersWithCustomers',
    async () => {
      const {
        limit = 25, // Reduced from 50 to improve performance
        offset = 0,
        customerId,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = options || {};

      // Build where conditions
      const conditions = [];

      if (customerId) {
        conditions.push(eq(orders.customerId, customerId));
      }

      if (status && status.length > 0) {
        conditions.push(inArray(orders.status, status));
      }

      if (paymentStatus && paymentStatus.length > 0) {
        conditions.push(inArray(orders.paymentStatus, paymentStatus));
      }

      if (dateFrom) {
        conditions.push(gte(orders.orderDate, dateFrom));
      }

      if (dateTo) {
        conditions.push(lte(orders.orderDate, dateTo));
      }

      // Use index-optimized query with JOIN
      const orderColumn =
        orderBy === 'orderDate'
          ? orders.orderDate
          : orderBy === 'expectedReturnDate'
            ? orders.expectedReturnDate
            : orders.createdAt;

      const orderFunc = orderDirection === 'asc' ? asc : desc;

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      // Simple, efficient query with JOIN
      const dbOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          orderDate: orders.orderDate,
          expectedReturnDate: orders.expectedReturnDate,
          status: orders.status,
          totalAmount: orders.totalAmount,
          vatAmount: orders.vatAmount,
          depositAmount: orders.depositAmount,
          paidAmount: orders.paidAmount,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          documentType: orders.documentType,
          documentOther: orders.documentOther,
          documentName: orders.documentName,
          documentId: orders.documentId,
          depositType: orders.depositType,
          depositValue: orders.depositValue,
          taxInvoiceExported: orders.taxInvoiceExported,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          customerName: customers.name,
        })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(whereCondition)
        .orderBy(orderFunc(orderColumn))
        .limit(limit)
        .offset(offset);

      // For each order, get its items and note counts
      // Optimize: Get all order items and note counts for all orders in parallel
      const orderIds = dbOrders.map((order) => order.id);

      // Fetch note counts efficiently
      const noteCountsMap =
        orderIds.length > 0
          ? await getOrderNoteCounts(orderIds)
          : new Map<number, { notComplete: number; total: number }>();

      // Fetch order items for return date calculation
      const itemsByOrderId: Record<
        number,
        Array<{ isExtension: boolean; extraDays: number | null }>
      > = {};
      if (orderIds.length > 0) {
        const allItems = await db
          .select({
            orderId: orderItems.orderId,
            isExtension: orderItems.isExtension,
            extraDays: orderItems.extraDays,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds));

        // Group items by order ID
        allItems.forEach((item) => {
          if (!itemsByOrderId[item.orderId]) {
            itemsByOrderId[item.orderId] = [];
          }
          itemsByOrderId[item.orderId].push(item);
        });
      }

      // Fetch discounts for all orders
      const discountsByOrderId: Record<number, OrderDiscount[]> = {};
      if (orderIds.length > 0) {
        const { orderDiscounts, discountItemizedNames } = await import('@/lib/db/schema');
        const allDiscounts = await db
          .select({
            id: orderDiscounts.id,
            orderId: orderDiscounts.orderId,
            discountType: orderDiscounts.discountType,
            discountValue: orderDiscounts.discountValue,
            discountAmount: orderDiscounts.discountAmount,
            itemizedNameId: orderDiscounts.itemizedNameId,
            description: orderDiscounts.description,
            requestedByUserId: orderDiscounts.requestedByUserId,
            authorizedByUserId: orderDiscounts.authorizedByUserId,
            createdAt: orderDiscounts.createdAt,
            itemizedName: discountItemizedNames.name,
          })
          .from(orderDiscounts)
          .innerJoin(
            discountItemizedNames,
            eq(orderDiscounts.itemizedNameId, discountItemizedNames.id)
          )
          .where(inArray(orderDiscounts.orderId, orderIds))
          .orderBy(orderDiscounts.createdAt);

        // Group discounts by order ID
        allDiscounts.forEach((discount) => {
          if (!discountsByOrderId[discount.orderId]) {
            discountsByOrderId[discount.orderId] = [];
          }
          discountsByOrderId[discount.orderId].push({
            id: discount.id,
            orderId: discount.orderId,
            discountType: discount.discountType as 'vnd' | 'percent',
            discountValue: Number(discount.discountValue),
            discountAmount: Number(discount.discountAmount),
            itemizedName: discount.itemizedName,
            description: discount.description || '',
            requestedByUserId: discount.requestedByUserId,
            authorizedByUserId: discount.authorizedByUserId,
            createdAt: discount.createdAt,
          });
        });
      }

      // Calculate return dates for each order with optimized processing
      const ordersWithCalculatedDates = dbOrders.map((order) => {
        // Only decrypt document fields if they exist and are encrypted
        const documentType =
          order.documentType && order.documentType.includes(':')
            ? decryptField(order.documentType)
            : order.documentType;
        const documentOther =
          order.documentOther && order.documentOther.includes(':')
            ? decryptField(order.documentOther)
            : order.documentOther;
        const documentName =
          order.documentName && order.documentName.includes(':')
            ? decryptField(order.documentName)
            : order.documentName;
        const documentId =
          order.documentId && order.documentId.includes(':')
            ? decryptField(order.documentId)
            : order.documentId;

        // Calculate return date based on order items (including extensions)
        const orderItemsForCalculation = itemsByOrderId[order.id] || [];
        const extensionItem = orderItemsForCalculation.find((item) => item.isExtension);
        const extraDays = extensionItem?.extraDays || 0;

        // Convert stored date to Vietnam time (UTC+7)
        const orderDateForCalculation = new Date(order.orderDate);
        const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
        const orderDateVietnam = new Date(orderDateForCalculation.getTime() + vietnamOffset);

        const calculatedReturnDate = new Date(orderDateVietnam);
        calculatedReturnDate.setDate(orderDateVietnam.getDate() + 2 + extraDays);

        console.log(`Order ${order.id} date calculation:`, {
          storedOrderDate: order.orderDate,
          storedOrderDateLocal: new Date(order.orderDate).toLocaleDateString('vi-VN'),
          storedExpectedReturnDate: order.expectedReturnDate,
          storedExpectedReturnDateLocal: new Date(order.expectedReturnDate).toLocaleDateString(
            'vi-VN'
          ),
          calculatedReturnDate: calculatedReturnDate,
          calculatedReturnDateLocal: calculatedReturnDate.toLocaleDateString('vi-VN'),
          extraDays,
        });

        // Get note counts for this order
        const noteCounts = noteCountsMap.get(order.id) || { notComplete: 0, total: 0 };

        // Decrypt customer name if needed
        const decryptedCustomerName =
          order.customerName && order.customerName.includes(':')
            ? decryptField(order.customerName)
            : order.customerName || '';

        return {
          id: order.id,
          customerId: order.customerId,
          orderDate: order.orderDate,
          expectedReturnDate: order.expectedReturnDate,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          vatAmount: Number(order.vatAmount || 0),
          depositAmount: Number(order.depositAmount),
          paidAmount: Number(order.paidAmount),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          documentType: documentType,
          documentOther: documentOther,
          documentName: documentName,
          documentId: documentId,
          depositType: order.depositType,
          depositValue: order.depositValue ? Number(order.depositValue) : null,
          taxInvoiceExported: order.taxInvoiceExported,
          discounts: discountsByOrderId[order.id] || [],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customerName: decryptedCustomerName,
          calculatedReturnDate: calculatedReturnDate,
          noteNotComplete: noteCounts.notComplete,
          noteTotal: noteCounts.total,
        };
      });

      return ordersWithCalculatedDates;
    },
    (
      result: (Order & {
        customerName: string;
        calculatedReturnDate: Date;
        noteNotComplete: number;
        noteTotal: number;
      })[]
    ) => result.length
  );
}

// Get order with correctly calculated return date
export async function getOrderWithCalculatedReturnDate(
  orderId: number
): Promise<(Order & { calculatedReturnDate: Date }) | null> {
  return monitorDatabaseQuery('getOrderWithCalculatedReturnDate', async () => {
    const order = await getOrderById(orderId);
    if (!order) return null;

    const items = await getOrderItems(orderId);
    const calculatedReturnDate = calculateExpectedReturnDate(order.orderDate, items);

    return {
      ...order,
      calculatedReturnDate,
    };
  });
}
