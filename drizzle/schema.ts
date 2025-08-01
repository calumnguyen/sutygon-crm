import { pgTable, index, unique, serial, text, varchar, timestamp, integer, uuid, boolean, foreignKey, numeric, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	employeeKey: varchar("employee_key", { length: 255 }).notNull(),
	role: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_users_employee_key").using("btree", table.employeeKey.asc().nullsLast().op("text_ops")),
	unique("users_employee_key_key").on(table.employeeKey),
]);

export const storeSettings = pgTable("store_settings", {
	id: serial().primaryKey().notNull(),
	storeCode: varchar("store_code", { length: 64 }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const categoryCounters = pgTable("category_counters", {
	category: text().primaryKey().notNull(),
	counter: integer().default(0).notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	categoryCounter: integer("category_counter").notNull(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_inventory_items_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
]);

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("tags_name_key").on(table.name),
]);

export const userViewPreferences = pgTable("user_view_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeCode: varchar("store_code", { length: 8 }).notNull(),
	viewName: varchar("view_name", { length: 255 }).notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_view_preferences_order").using("btree", table.storeCode.asc().nullsLast().op("int4_ops"), table.displayOrder.asc().nullsLast().op("text_ops")),
	index("idx_user_view_preferences_store_code").using("btree", table.storeCode.asc().nullsLast().op("text_ops")),
	unique("user_view_preferences_store_code_view_name_key").on(table.storeCode, table.viewName),
]);

export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	phone: varchar({ length: 255 }).notNull(),
	company: varchar({ length: 255 }),
	address: varchar({ length: 255 }),
	notes: text(),
	activeOrdersCount: integer("active_orders_count").default(0).notNull(),
	lateOrdersCount: integer("late_orders_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customers_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	unique("customers_phone_key").on(table.phone),
]);

export const inventorySizes = pgTable("inventory_sizes", {
	id: serial().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	title: text().notNull(),
	quantity: text().notNull(),
	onHand: text("on_hand").notNull(),
	price: text().notNull(),
}, (table) => [
	index("idx_inventory_sizes_item_id").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [inventoryItems.id],
			name: "inventory_sizes_item_id_fkey"
		}),
]);

export const orderItems = pgTable("order_items", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	inventoryItemId: integer("inventory_item_id"),
	name: text().notNull(),
	size: text().notNull(),
	quantity: integer().notNull(),
	price: integer().notNull(),
	isExtension: boolean("is_extension").default(false).notNull(),
	extraDays: integer("extra_days"),
	feeType: varchar("fee_type", { length: 20 }),
	percent: integer(),
	isCustom: boolean("is_custom").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_order_items_inventory_item_id").using("btree", table.inventoryItemId.asc().nullsLast().op("int4_ops")),
	index("idx_order_items_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}),
	foreignKey({
			columns: [table.inventoryItemId],
			foreignColumns: [inventoryItems.id],
			name: "order_items_inventory_item_id_fkey"
		}),
]);

export const orderNotes = pgTable("order_notes", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	itemId: integer("item_id"),
	text: text().notNull(),
	done: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_order_notes_item_id").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	index("idx_order_notes_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_notes_order_id_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [orderItems.id],
			name: "order_notes_item_id_fkey"
		}),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	customerId: integer("customer_id").notNull(),
	orderDate: timestamp("order_date", { mode: 'string' }).notNull(),
	expectedReturnDate: timestamp("expected_return_date", { mode: 'string' }).notNull(),
	status: varchar({ length: 50 }).default('active').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	depositAmount: numeric("deposit_amount", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	paidAmount: numeric("paid_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	paymentMethod: varchar("payment_method", { length: 20 }),
	paymentStatus: varchar("payment_status", { length: 20 }).default('pending').notNull(),
	documentType: text("document_type"),
	documentOther: text("document_other"),
	documentName: text("document_name"),
	documentId: text("document_id"),
	depositType: varchar("deposit_type", { length: 10 }),
	depositValue: numeric("deposit_value", { precision: 10, scale:  2 }),
	taxInvoiceExported: boolean("tax_invoice_exported").default(false).notNull(),
}, (table) => [
	index("idx_orders_customer_id").using("btree", table.customerId.asc().nullsLast().op("int4_ops")),
	index("idx_orders_order_date").using("btree", table.orderDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_fkey"
		}),
]);

export const inventoryTags = pgTable("inventory_tags", {
	itemId: integer("item_id").notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => [
	index("idx_inventory_tags_item_id").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	index("idx_inventory_tags_tag_id").using("btree", table.tagId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [inventoryItems.id],
			name: "inventory_tags_item_id_fkey"
		}),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "inventory_tags_tag_id_fkey"
		}),
	primaryKey({ columns: [table.itemId, table.tagId], name: "inventory_tags_pkey"}),
]);
