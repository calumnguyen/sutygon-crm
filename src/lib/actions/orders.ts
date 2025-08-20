'use server';

import { db } from '@/lib/db';
import { orders, orderItems, orderNotes, customers, inventoryItems } from '@/lib/db/schema';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  inventoryItemId?: number | null;
  formattedId?: string | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  isExtension: boolean;
  extraDays?: number | null;
  feeType?: string | null;
  percent?: number | null;
  isCustom: boolean;
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
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const dbItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  // Get inventory items for formatted IDs
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

  // Decrypt sensitive data for display
  return dbItems.map((item) => {
    const decrypted = decryptOrderItemData(item);

    // Find corresponding inventory item for formatted ID
    const inventoryItem = inventoryItemsData.find((inv) => inv.id === item.inventoryItemId);
    let formattedId = null;

    if (inventoryItem) {
      const decryptedInventoryItem = decryptInventoryData(inventoryItem);
      formattedId = getFormattedId(decryptedInventoryItem.category, inventoryItem.categoryCounter);
    }

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
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Order> {
  try {
    // Get current VAT percentage from settings
    const { getVATPercentage } = await import('@/lib/utils/storeSettings');
    const vatPercentage = await getVATPercentage();

    // Calculate VAT using configurable percentage
    const orderTotal = Number(orderData.totalAmount);
    const vatAmount = Math.round(orderTotal * (vatPercentage / 100));

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
      taxInvoiceExported: newOrder.taxInvoiceExported, // Include new field
      createdAt: newOrder.createdAt,
      updatedAt: newOrder.updatedAt,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

export async function createOrderItem(
  itemData: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<OrderItem> {
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

    // Return the new item with decrypted data
    const decryptedItem = decryptOrderItemData(newItem);
    return {
      id: newItem.id,
      orderId: newItem.orderId,
      inventoryItemId: newItem.inventoryItemId,
      name: decryptedItem.name,
      size: decryptedItem.size,
      quantity: newItem.quantity,
      price: newItem.price,
      isExtension: newItem.isExtension,
      extraDays: newItem.extraDays,
      feeType: newItem.feeType,
      percent: newItem.percent,
      isCustom: newItem.isCustom,
      createdAt: newItem.createdAt,
      updatedAt: newItem.updatedAt,
    };
  } catch (error) {
    console.error('Error creating order item:', error);
    throw new Error('Failed to create order item');
  }
}

export async function createOrderNote(
  noteData: Omit<OrderNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<OrderNote> {
  try {
    // Encrypt sensitive order note data
    const encryptedData = encryptOrderNoteData(noteData);

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
  orderTotalAmount?: number // New parameter for when order was just created
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
    const totalRequired = orderTotal + depositAmount; // Total amount that needs to be paid

    if (depositInfo) {
      // When there's a deposit, check against total required (order + deposit)
      if (paidAmount >= totalRequired) {
        paymentStatus = 'Paid Full with Deposit';
      } else if (paidAmount > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Unpaid';
      }
    } else {
      // When there's no deposit, check against order total only
      if (paidAmount >= orderTotal) {
        paymentStatus = 'Paid Full';
      } else if (paidAmount > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Unpaid';
      }
    }

    console.log('Determined payment status:', paymentStatus);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      paidAmount: paidAmount.toString(),
      paymentMethod,
      paymentStatus,
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
    await db
      .update(orders)
      .set({
        documentStatus: 'on_file',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  } catch (error) {
    console.error('Error marking document as on file:', error);
    throw new Error('Failed to mark document as on file');
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

      // Skip fetching items for now to improve performance
      const itemsByOrderId: Record<number, OrderItem[]> = {};

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

        // Use stored expected return date for now
        const calculatedReturnDate = order.expectedReturnDate;

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
