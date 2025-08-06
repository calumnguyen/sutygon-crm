import { relations } from "drizzle-orm/relations";
import { inventoryItems, inventorySizes, orders, orderItems, orderNotes, customers, inventoryTags, tags, users } from "./schema";
import { userSessions } from "../src/lib/db/schema";

export const usersRelations = relations(users, ({many}) => ({
	userSessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const inventorySizesRelations = relations(inventorySizes, ({one}) => ({
	inventoryItem: one(inventoryItems, {
		fields: [inventorySizes.itemId],
		references: [inventoryItems.id]
	}),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({many}) => ({
	inventorySizes: many(inventorySizes),
	orderItems: many(orderItems),
	inventoryTags: many(inventoryTags),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	inventoryItem: one(inventoryItems, {
		fields: [orderItems.inventoryItemId],
		references: [inventoryItems.id]
	}),
	orderNotes: many(orderNotes),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	orderNotes: many(orderNotes),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
}));

export const orderNotesRelations = relations(orderNotes, ({one}) => ({
	order: one(orders, {
		fields: [orderNotes.orderId],
		references: [orders.id]
	}),
	orderItem: one(orderItems, {
		fields: [orderNotes.itemId],
		references: [orderItems.id]
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	orders: many(orders),
}));

export const inventoryTagsRelations = relations(inventoryTags, ({one}) => ({
	inventoryItem: one(inventoryItems, {
		fields: [inventoryTags.itemId],
		references: [inventoryItems.id]
	}),
	tag: one(tags, {
		fields: [inventoryTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	inventoryTags: many(inventoryTags),
}));