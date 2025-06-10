import 'dotenv/config';
import { db } from './index';
import { users, storeSettings } from './schema';
import { UserRole, UserStatus } from '@/types/user';
import { eq } from 'drizzle-orm';

async function seed() {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.employeeKey, '123456'),
    });

    if (existingUser) {
      console.log('User already exists, updating...');
      await db
        .update(users)
        .set({
          name: 'Calum',
          role: 'admin' as UserRole,
          status: 'active' as UserStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.employeeKey, '123456'));
      console.log('User updated successfully.');
    } else {
      console.log('Creating new user...');
      await db.insert(users).values({
        name: 'Calum',
        employeeKey: '123456',
        role: 'admin' as UserRole,
        status: 'active' as UserStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('User created successfully.');
    }

    // Seed store code
    const existingStore = await db.query.storeSettings.findFirst({});
    if (!existingStore) {
      await db.insert(storeSettings).values({
        storeCode: '99999999',
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
