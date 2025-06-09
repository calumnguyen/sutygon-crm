'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { User, UserRole, UserStatus } from '@/types/user';
import { eq } from 'drizzle-orm';

export async function getUsers(): Promise<User[]> {
  return db.select().from(users);
}

export async function createUser(
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  try {
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        role: userData.role.toLowerCase() as UserRole,
        status: userData.status.toLowerCase() as UserStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

export async function updateUser(
  userId: number,
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        role: userData.role.toLowerCase() as UserRole,
        status: userData.status.toLowerCase() as UserStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(userId: number): Promise<void> {
  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}
