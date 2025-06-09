import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { UserRole, UserStatus } from '@/types/user';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().$type<UserRole>(),
  status: varchar('status', { length: 50 }).notNull().$type<UserStatus>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
