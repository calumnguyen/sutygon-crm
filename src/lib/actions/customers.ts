import { db } from '../db';
import { customers } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';

export async function getAllCustomers() {
  return await db.select().from(customers).orderBy(customers.id);
}

type CustomerInsert = InferInsertModel<typeof customers>;

export async function createCustomer(data: CustomerInsert) {
  return await db
    .insert(customers)
    .values({
      name: data.name,
      phone: data.phone,
      company: data.company ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      activeOrdersCount: data.activeOrdersCount ?? 0,
      lateOrdersCount: data.lateOrdersCount ?? 0,
    })
    .returning();
}

export async function getCustomerByPhone(phone: string) {
  return await db.select().from(customers).where(eq(customers.phone, phone));
}
