import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export async function getAllUsers() {
  return await db.select().from(users);
}

export async function getUserById(id: number) {
  return await db.select().from(users).where(eq(users.id, id));
}

export async function getUserByEmployeeKey(employeeKey: string) {
  return await db.select().from(users).where(eq(users.employeeKey, employeeKey));
}
