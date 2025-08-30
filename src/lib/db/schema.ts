import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  decimal,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { UserRole, UserStatus } from '@/types/user';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(), // This will store encrypted name
    employeeKey: varchar('employee_key', { length: 255 }).notNull().unique(), // Increased for hashed values
    role: varchar('role', { length: 255 }).notNull(), // Increased for encrypted values
    status: varchar('status', { length: 255 }).notNull(), // Increased for encrypted values
    deletedAt: timestamp('deleted_at'), // Soft delete timestamp
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for employee key lookups (authentication)
      employeeKeyIdx: index('users_employee_key_idx').on(table.employeeKey),
      // Index for status filtering (active/inactive users)
      statusIdx: index('users_status_idx').on(table.status),
      // Index for soft delete filtering
      deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
      // Index for creation date sorting
      createdAtIdx: index('users_created_at_idx').on(table.createdAt),
    };
  }
);

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeCode: varchar('store_code', { length: 255 }).notNull(), // Increased for hashed values
  vatPercentage: decimal('vat_percentage', { precision: 5, scale: 2 }).notNull().default('8.00'), // VAT percentage (default 8%)
  isOpen: boolean('is_open').notNull().default(false), // Store open/closed status
  openedBy: integer('opened_by').references(() => users.id), // Who opened the store
  openedAt: timestamp('opened_at'), // When store was opened
  closedBy: integer('closed_by').references(() => users.id), // Who closed the store
  closedAt: timestamp('closed_at'), // When store was closed
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const userSessions = pgTable(
  'user_sessions',
  {
    id: serial('id').primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(), // JWT or random token
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    userAgent: text('user_agent'), // Browser/device info
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6 support
  },
  (table) => {
    return {
      // Index for session token lookups (most common query)
      sessionTokenIdx: index('user_sessions_session_token_idx').on(table.sessionToken),
      // Index for user ID lookups (to find all user sessions)
      userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
      // Index for active sessions
      isActiveIdx: index('user_sessions_is_active_idx').on(table.isActive),
      // Index for expiration cleanup
      expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expiresAt),
    };
  }
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(), // This will store encrypted name
    category: text('category').notNull(), // This will store encrypted category
    categoryCounter: integer('category_counter').notNull(),
    imageUrl: text('image_url'),
    addedBy: integer('added_by').references(() => users.id),
    addedAt: timestamp('added_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for category filtering
      categoryIdx: index('inventory_items_category_idx').on(table.category),
      // Index for category counter (item ID generation)
      categoryCounterIdx: index('inventory_items_category_counter_idx').on(table.categoryCounter),
      // Composite index for category + counter
      categoryCounterCompositeIdx: index('inventory_items_category_counter_composite_idx').on(
        table.category,
        table.categoryCounter
      ),
      // Index for creation date sorting
      createdAtIdx: index('inventory_items_created_at_idx').on(table.createdAt),
      // Full-text search indexes for better performance
      nameSearchIdx: index('inventory_items_name_search_idx').on(table.name),
      // Composite index for name + category searches
      nameCategoryIdx: index('inventory_items_name_category_idx').on(table.name, table.category),
    };
  }
);

export const categoryCounters = pgTable('category_counters', {
  category: text('category').primaryKey(), // This will store encrypted category
  counter: integer('counter').notNull().default(0),
});

export const inventorySizes = pgTable(
  'inventory_sizes',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => inventoryItems.id),
    title: text('title').notNull(), // This will store encrypted title
    quantity: text('quantity').notNull(), // This will store encrypted quantity
    onHand: text('on_hand').notNull(), // This will store encrypted onHand
    price: text('price').notNull(), // This will store encrypted price
  },
  (table) => {
    return {
      // Index for item ID lookups (most common query)
      itemIdIdx: index('inventory_sizes_item_id_idx').on(table.itemId),
    };
  }
);

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // This will store encrypted name
});

export const inventoryTags = pgTable(
  'inventory_tags',
  {
    itemId: integer('item_id')
      .notNull()
      .references(() => inventoryItems.id),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (table) => {
    return {
      // Index for item ID lookups
      itemIdIdx: index('inventory_tags_item_id_idx').on(table.itemId),
      // Index for tag ID lookups
      tagIdIdx: index('inventory_tags_tag_id_idx').on(table.tagId),
      // Composite index for both (unique constraint)
      itemTagIdx: index('inventory_tags_item_tag_idx').on(table.itemId, table.tagId),
    };
  }
);

export const customers = pgTable(
  'customers',
  {
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
  },
  (table) => {
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
  }
);

// New order tables
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    orderDate: timestamp('order_date').notNull(),
    expectedReturnDate: timestamp('expected_return_date').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, cancelled, paid
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'), // VAT amount on order total
    vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('8.00'), // VAT rate used for this order
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
    taxInvoiceExported: boolean('tax_invoice_exported').notNull().default(false),
    // User tracking fields
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    pickedUpByUserId: integer('picked_up_by_user_id').references(() => users.id),
    pickedUpAt: timestamp('picked_up_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
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
      customerPaymentStatusIdx: index('orders_customer_payment_status_idx').on(
        table.customerId,
        table.paymentStatus
      ),
      // Index for creation date sorting (recent orders)
      createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
      // Index for document status filtering
      documentStatusIdx: index('orders_document_status_idx').on(table.documentStatus),
      // Composite index for customer + created date (main table query optimization)
      customerCreatedAtIdx: index('orders_customer_created_at_idx').on(
        table.customerId,
        table.createdAt
      ),
      // User tracking indexes
      createdByUserIdIdx: index('orders_created_by_user_id_idx').on(table.createdByUserId),
      pickedUpByUserIdIdx: index('orders_picked_up_by_user_id_idx').on(table.pickedUpByUserId),
      pickedUpAtIdx: index('orders_picked_up_at_idx').on(table.pickedUpAt),
    };
  }
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id),
    inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id), // Can be null for custom items
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
  },
  (table) => {
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
  }
);

export const orderWarnings = pgTable(
  'order_warnings',
  {
    id: serial('id').primaryKey(),
    orderItemId: integer('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id),
    warningType: varchar('warning_type', { length: 50 }).notNull(),
    warningMessage: text('warning_message').notNull(),
    severity: varchar('severity', { length: 20 }).notNull().default('high'),
    isResolved: boolean('is_resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: integer('resolved_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for order item lookups (most common query)
      orderItemIdIdx: index('order_warnings_order_item_id_idx').on(table.orderItemId),
      // Index for inventory item lookups
      inventoryItemIdIdx: index('order_warnings_inventory_item_id_idx').on(table.inventoryItemId),
      // Index for resolution status filtering
      isResolvedIdx: index('order_warnings_is_resolved_idx').on(table.isResolved),
      // Index for warning type filtering
      warningTypeIdx: index('order_warnings_warning_type_idx').on(table.warningType),
      // Index for creation date sorting
      createdAtIdx: index('order_warnings_created_at_idx').on(table.createdAt),
    };
  }
);

export const orderNotes = pgTable(
  'order_notes',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id),
    itemId: integer('item_id').references(() => orderItems.id), // Can be null for general notes
    text: text('text').notNull(), // This will store encrypted text
    done: boolean('done').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for order ID lookups (most common query)
      orderIdIdx: index('order_notes_order_id_idx').on(table.orderId),
      // Index for item ID lookups
      itemIdIdx: index('order_notes_item_id_idx').on(table.itemId),
      // Index for completion status filtering
      doneIdx: index('order_notes_done_idx').on(table.done),
    };
  }
);

export const aiTrainingData = pgTable(
  'ai_training_data',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id').references(() => inventoryItems.id),
    name: text('name').notNull(),
    category: text('category').notNull(),
    imageUrl: text('image_url'),
    tags: text('tags'), // JSON string of tags
    description: text('description').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for active training data
      isActiveIdx: index('ai_training_data_is_active_idx').on(table.isActive),
      // Index for item lookups
      itemIdIdx: index('ai_training_data_item_id_idx').on(table.itemId),
      // Index for category filtering
      categoryIdx: index('ai_training_data_category_idx').on(table.category),
    };
  }
);

export const discountItemizedNames = pgTable(
  'discount_itemized_names',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for name lookups
      nameIdx: index('discount_itemized_names_name_idx').on(table.name),
    };
  }
);

export const orderDiscounts = pgTable(
  'order_discounts',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    discountType: varchar('discount_type', { length: 10 }).notNull(),
    discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
    itemizedNameId: integer('itemized_name_id')
      .notNull()
      .references(() => discountItemizedNames.id),
    description: text('description'),
    requestedByUserId: integer('requested_by_user_id')
      .notNull()
      .references(() => users.id),
    authorizedByUserId: integer('authorized_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for order ID lookups
      orderIdIdx: index('order_discounts_order_id_idx').on(table.orderId),
      // Index for requesting user lookups
      requestedByIdx: index('order_discounts_requested_by_idx').on(table.requestedByUserId),
      // Index for authorized user lookups
      authorizedByIdx: index('order_discounts_authorized_by_idx').on(table.authorizedByUserId),
      // Index for creation date sorting
      createdAtIdx: index('order_discounts_created_at_idx').on(table.createdAt),
    };
  }
);

export const paymentHistory = pgTable(
  'payment_history',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    paymentMethod: varchar('payment_method', { length: 10 }).notNull(), // 'cash' or 'qr'
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    processedByUserId: integer('processed_by_user_id')
      .notNull()
      .references(() => users.id),
    paymentDate: timestamp('payment_date').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Index for order ID lookups
      orderIdIdx: index('payment_history_order_id_idx').on(table.orderId),
      // Index for user who processed the payment
      processedByUserIdIdx: index('payment_history_processed_by_user_id_idx').on(
        table.processedByUserId
      ),
      // Index for payment date sorting
      paymentDateIdx: index('payment_history_payment_date_idx').on(table.paymentDate),
      // Index for payment method filtering
      paymentMethodIdx: index('payment_history_payment_method_idx').on(table.paymentMethod),
    };
  }
);

export const reviews = pgTable(
  'reviews',
  {
    id: text('id').primaryKey().notNull(),
    customerName: text('customerName').notNull(),
    phoneNumber: text('phoneNumber'),
    emailAddress: text('emailAddress'),
    invoiceNumber: text('invoiceNumber'),
    rating: integer('rating').notNull(),
    ratingDescription: text('ratingDescription').notNull(),
    helperName: text('helperName'),
    reviewDetail: text('reviewDetail').notNull(),
    dateCreated: timestamp('dateCreated').notNull().defaultNow(),
    ipAddress: text('ipAddress'),
    deviceType: text('deviceType'),
    browserType: text('browserType'),
  },
  (table) => {
    return {
      // Index for date-based queries
      dateCreatedIdx: index('reviews_dateCreated_idx').on(table.dateCreated),
      // Index for rating analytics
      ratingIdx: index('reviews_rating_idx').on(table.rating),
      // Index for customer name lookups (encrypted)
      customerNameIdx: index('reviews_customerName_idx').on(table.customerName),
    };
  }
);
