import 'dotenv/config';
import { db } from './index';
import { users } from './schema';
import { encrypt } from '@/lib/utils/encryption';
import { eq } from 'drizzle-orm';

async function migrateEncryption() {
  try {
    console.log('Starting encryption migration...');
    
    // Get all users
    const dbUsers = await db.select().from(users);
    console.log(`Found ${dbUsers.length} users to migrate`);
    
    for (const user of dbUsers) {
      console.log(`Migrating user ID: ${user.id}`);
      
      // Re-encrypt the data with current key
      const newEncryptedName = encrypt('Calum');
      const newEncryptedRole = encrypt('admin');
      const newEncryptedStatus = encrypt('active');
      
      // Update the user
      await db
        .update(users)
        .set({
          name: newEncryptedName,
          role: newEncryptedRole,
          status: newEncryptedStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      console.log(`Updated user ${user.id}: name=${newEncryptedName}, role=${newEncryptedRole}, status=${newEncryptedStatus}`);
    }
    
    console.log('Encryption migration completed successfully!');
  } catch (error) {
    console.error('Error during encryption migration:', error);
  }
}

migrateEncryption(); 