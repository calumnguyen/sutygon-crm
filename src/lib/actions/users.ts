'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { User, UserRole, UserStatus } from '@/types/user';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { encryptUserData, decryptUserData } from '@/lib/utils/userEncryption';

export async function getUsers(): Promise<User[]> {
  const dbUsers = await db.select().from(users);

  // Decrypt sensitive data for display
  const decryptedUsers = dbUsers.map((user) => {
    const decrypted = decryptUserData(user);
    return {
      id: user.id,
      name: decrypted.name,
      role: decrypted.role.toLowerCase() as UserRole,
      status: decrypted.status.toLowerCase() as UserStatus,
      employeeKey: '••••••', // Mask the employee key with dots
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });

  return decryptedUsers;
}

export async function createUser(
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  try {
    // Hash the employee key
    const hashedEmployeeKey = hashValue(userData.employeeKey);

    // Encrypt sensitive user data
    const encryptedData = encryptUserData({
      ...userData,
      employeeKey: hashedEmployeeKey, // Use hashed key
    });

    const [newUser] = await db
      .insert(users)
      .values({
        name: encryptedData.name,
        employeeKey: encryptedData.employeeKey, // This is hashed
        role: encryptedData.role,
        status: encryptedData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return the new user with decrypted data and original employee key
    const decryptedUser = decryptUserData(newUser);
    return {
      id: newUser.id,
      name: decryptedUser.name,
      role: decryptedUser.role.toLowerCase() as UserRole,
      status: decryptedUser.status.toLowerCase() as UserStatus,
      employeeKey: userData.employeeKey, // Return original key for immediate UI update
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
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
    // Get the current user to check if employee key is changing
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Check if employee key is masked (••••••) - means it wasn't changed
    const isEmployeeKeyMasked = userData.employeeKey === '••••••';

    let hashedEmployeeKey = currentUser.employeeKey; // Keep existing hash by default

    if (!isEmployeeKeyMasked) {
      // Only hash if a real employee key was provided
      hashedEmployeeKey = hashValue(userData.employeeKey);
    }

    // Encrypt sensitive user data (excluding employee key)
    const encryptedData = encryptUserData({
      ...userData,
      employeeKey: userData.employeeKey, // Pass original for encryption function
    });

    const [updatedUser] = await db
      .update(users)
      .set({
        name: encryptedData.name,
        employeeKey: hashedEmployeeKey, // Use the properly hashed key
        role: encryptedData.role,
        status: encryptedData.status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Return the updated user with decrypted data and original employee key
    const decryptedUser = decryptUserData(updatedUser);

    return {
      id: updatedUser.id,
      name: decryptedUser.name,
      role: decryptedUser.role.toLowerCase() as UserRole,
      status: decryptedUser.status.toLowerCase() as UserStatus,
      employeeKey: userData.employeeKey, // Return original key for immediate UI update
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
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
