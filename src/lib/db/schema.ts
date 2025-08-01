import { pgTable, serial, text, timestamp, varchar, integer, decimal, boolean, index } from 'drizzle-orm/pg-core';
import { UserRole, UserStatus } from '@/types/user';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // This will store encrypted name
  employeeKey: varchar('employee_key', { length: 255 }).notNull().unique(), // Increased for hashed values
  role: varchar('role', { length: 255 }).notNull(), // Increased for encrypted values
  status: varchar('status', { length: 255 }).notNull(), // Increased for encrypted values
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for employee key lookups (authentication)
    employeeKeyIdx: index('users_employee_key_idx').on(table.employeeKey),
    // Index for status filtering (active/inactive users)
    statusIdx: index('users_status_idx').on(table.status),
    // Index for creation date sorting
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  };
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeCode: varchar('store_code', { length: 255 }).notNull(), // Increased for hashed values
  vatPercentage: decimal('vat_percentage', { precision: 5, scale: 2 }).notNull().default('8.00'), // VAT percentage (default 8%)
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // This will store encrypted name
  category: text('category').notNull(), // This will store encrypted category
  categoryCounter: integer('category_counter').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for category filtering
    categoryIdx: index('inventory_items_category_idx').on(table.category),
    // Index for category counter (item ID generation)
    categoryCounterIdx: index('inventory_items_category_counter_idx').on(table.categoryCounter),
    // Composite index for category + counter
    categoryCounterCompositeIdx: index('inventory_items_category_counter_composite_idx').on(table.category, table.categoryCounter),
    // Index for creation date sorting
    createdAtIdx: index('inventory_items_created_at_idx').on(table.createdAt),
    // Full-text search indexes for better performance
    nameSearchIdx: index('inventory_items_name_search_idx').on(table.name),
    // Composite index for name + category searches
    nameCategoryIdx: index('inventory_items_name_category_idx').on(table.name, table.category),
  };
});

export const categoryCounters = pgTable('category_counters', {
  category: text('category').primaryKey(), // This will store encrypted category
  counter: integer('counter').notNull().default(0),
});

export const inventorySizes = pgTable('inventory_sizes', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => inventoryItems.id),
  title: text('title').notNull(), // This will store encrypted title
  quantity: text('quantity').notNull(), // This will store encrypted quantity
  onHand: text('on_hand').notNull(), // This will store encrypted onHand
  price: text('price').notNull(), // This will store encrypted price
}, (table) => {
  return {
    // Index for item ID lookups (most common query)
    itemIdIdx: index('inventory_sizes_item_id_idx').on(table.itemId),
  };
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // This will store encrypted name
});

export const inventoryTags = pgTable('inventory_tags', {
  itemId: integer('item_id')
    .notNull()
    .references(() => inventoryItems.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
}, (table) => {
  return {
    // Index for item ID lookups
    itemIdIdx: index('inventory_tags_item_id_idx').on(table.itemId),
    // Index for tag ID lookups
    tagIdIdx: index('inventory_tags_tag_id_idx').on(table.tagId),
    // Composite index for both (unique constraint)
    itemTagIdx: index('inventory_tags_item_tag_idx').on(table.itemId, table.tagId),
  };
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 255 }).notNull().unique(), // Updated from 20 to 255 for encrypted values
  company: varchar('company', { length: 255 }),
  address: varchar('address', { length: 255 }),
  notes: text('notes'),
  activeOrdersCount: integer('active_orders_count').notNull().default(0),
  lateOrdersCount: integer('late_orders_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for phone number lookups (customer search)
    phoneIdx: index('customers_phone_idx').on(table.phone),
    // Index for company filtering
    companyIdx: index('customers_company_idx').on(table.company),
    // Index for creation date sorting
    createdAtIdx: index('customers_created_at_idx').on(table.createdAt),
    // Index for active orders count (dashboard stats)
    activeOrdersIdx: index('customers_active_orders_idx').on(table.activeOrdersCount),
  };
});

// New order tables
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  orderDate: timestamp('order_date').notNull(),
  expectedReturnDate: timestamp('expected_return_date').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, cancelled, paid
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'), // 8% VAT on order total
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentMethod: varchar('payment_method', { length: 20 }), // 'cash', 'qr', 'partial'
  paymentStatus: varchar('payment_status', { length: 50 }).notNull().default('pending'), // 'pending', 'paid', 'partial', 'Paid Full', 'Partially Paid', 'Paid Full with Deposit'
  // Document deposit fields
  documentType: text('document_type'), // This will store encrypted document type
  documentOther: text('document_other'), // This will store encrypted document other info
  documentName: text('document_name'), // This will store encrypted document name
  documentId: text('document_id'), // This will store encrypted document ID
  documentStatus: varchar('document_status', { length: 50 }), // 'on_file', 'returned', etc.
  // Deposit info
  depositType: varchar('deposit_type', { length: 10 }), // 'vnd' or 'percent'
  depositValue: decimal('deposit_value', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for customer ID lookups (most common query)
    customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
    // Index for order date sorting and filtering
    orderDateIdx: index('orders_order_date_idx').on(table.orderDate),
    // Index for expected return date sorting
    expectedReturnDateIdx: index('orders_expected_return_date_idx').on(table.expectedReturnDate),
    // Index for status filtering (Processing, Completed, etc.)
    statusIdx: index('orders_status_idx').on(table.status),
    // Index for payment status filtering (Unpaid, Paid Full, etc.)
    paymentStatusIdx: index('orders_payment_status_idx').on(table.paymentStatus),
    // Composite index for customer + status (common query pattern)
    customerStatusIdx: index('orders_customer_status_idx').on(table.customerId, table.status),
    // Composite index for customer + payment status
    customerPaymentStatusIdx: index('orders_customer_payment_status_idx').on(table.customerId, table.paymentStatus),
    // Index for creation date sorting (recent orders)
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
    // Index for document status filtering
    documentStatusIdx: index('orders_document_status_idx').on(table.documentStatus),
    // Composite index for customer + created date (main table query optimization)
    customerCreatedAtIdx: index('orders_customer_created_at_idx').on(table.customerId, table.createdAt),
  };
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  inventoryItemId: integer('inventory_item_id')
    .references(() => inventoryItems.id), // Can be null for custom items
  name: text('name').notNull(), // This will store encrypted name
  size: text('size').notNull(), // This will store encrypted size
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  isExtension: boolean('is_extension').notNull().default(false),
  extraDays: integer('extra_days'),
  feeType: varchar('fee_type', { length: 20 }), // 'vnd' or 'percent'
  percent: integer('percent'),
  isCustom: boolean('is_custom').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for order ID lookups (most common query)
    orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
    // Index for inventory item ID lookups
    inventoryItemIdIdx: index('order_items_inventory_item_id_idx').on(table.inventoryItemId),
    // Index for custom items filtering
    isCustomIdx: index('order_items_is_custom_idx').on(table.isCustom),
    // Index for extension items filtering
    isExtensionIdx: index('order_items_is_extension_idx').on(table.isExtension),
  };
});

export const orderNotes = pgTable('order_notes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  itemId: integer('item_id')
    .references(() => orderItems.id), // Can be null for general notes
  text: text('text').notNull(), // This will store encrypted text
  done: boolean('done').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Index for order ID lookups (most common query)
    orderIdIdx: index('order_notes_order_id_idx').on(table.orderId),
    // Index for item ID lookups
    itemIdIdx: index('order_notes_item_id_idx').on(table.itemId),
    // Index for completion status filtering
    doneIdx: index('order_notes_done_idx').on(table.done),
  };
});
