import 'dotenv/config';
import { db } from './index';
import { users, storeSettings } from './schema';
import { UserRole, UserStatus } from '@/types/user';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { encryptUserData } from '@/lib/utils/userEncryption';

async function seed() {
  try {
    // Hash the employee key
    const hashedEmployeeKey = hashValue('123456');
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    // Encrypt user data
    const encryptedUserData = encryptUserData({
      name: 'Calum',
      employeeKey: hashedEmployeeKey,
      role: 'admin',
      status: 'active',
    });

    if (existingUser) {
      console.log('User already exists, updating...');
      await db
        .update(users)
        .set({
          name: encryptedUserData.name,
          role: encryptedUserData.role,
          status: encryptedUserData.status,
          updatedAt: new Date(),
        })
        .where(eq(users.employeeKey, hashedEmployeeKey));
      console.log('User updated successfully.');
    } else {
      console.log('Creating new user...');
      await db.insert(users).values({
        name: encryptedUserData.name,
        employeeKey: encryptedUserData.employeeKey,
        role: encryptedUserData.role,
        status: encryptedUserData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('User created successfully.');
    }

    // Hash the store code
    const hashedStoreCode = hashValue('00000000');

    // Seed store code
    const existingStore = await db.query.storeSettings.findFirst({});
    if (!existingStore) {
      await db.insert(storeSettings).values({
        storeCode: hashedStoreCode,
        updatedAt: new Date(),
      });
      console.log('Store code seeded.');
    } else {
      console.log('Store code already exists.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
