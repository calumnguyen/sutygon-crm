import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { UserRole, UserStatus } from '@/types/user';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  employeeKey: varchar('employee_key', { length: 6 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().$type<UserRole>(),
  status: varchar('status', { length: 50 }).notNull().$type<UserStatus>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeCode: varchar('store_code', { length: 8 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  categoryCounter: integer('category_counter').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const categoryCounters = pgTable('category_counters', {
  category: text('category').primaryKey(),
  counter: integer('counter').notNull().default(0),
});

export const inventorySizes = pgTable('inventory_sizes', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => inventoryItems.id),
  title: text('title').notNull(),
  quantity: integer('quantity').notNull(),
  onHand: integer('on_hand').notNull(),
  price: integer('price').notNull(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const inventoryTags = pgTable('inventory_tags', {
  itemId: integer('item_id')
    .notNull()
    .references(() => inventoryItems.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  company: varchar('company', { length: 255 }),
  address: varchar('address', { length: 255 }),
  notes: text('notes'),
  activeOrdersCount: integer('active_orders_count').notNull().default(0),
  lateOrdersCount: integer('late_orders_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
