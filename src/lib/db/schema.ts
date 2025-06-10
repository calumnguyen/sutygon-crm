import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
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
