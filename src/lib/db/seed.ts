import 'dotenv/config';
import { db } from './index';
import { users } from './schema';
import { UserRole, UserStatus } from '@/types/user';
import { eq } from 'drizzle-orm';

async function seed() {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, 'sutygon@icloud.com'),
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
        .where(eq(users.email, 'sutygon@icloud.com'));
      console.log('User updated successfully.');
    } else {
      console.log('Creating new user...');
      await db.insert(users).values({
        name: 'Calum',
        email: 'sutygon@icloud.com',
        role: 'admin' as UserRole,
        status: 'active' as UserStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('User created successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
