import 'dotenv/config';
import { db } from './index';
import { users, inventoryItems, inventorySizes, tags, categoryCounters, customers } from './schema';
import { encryptUserData } from '@/lib/utils/userEncryption';
import { encryptInventoryData, encryptInventorySizeData, encryptTagData } from '@/lib/utils/inventoryEncryption';
import { encryptCustomerData, decryptField } from '@/lib/utils/customerEncryption';
import { isEncrypted } from '@/lib/utils/encryption';
import { eq } from 'drizzle-orm';

async function migrateAllEncryption() {
  try {
    console.log('Starting comprehensive encryption migration...');
    
    // 1. Migrate Users
    console.log('Migrating users...');
    const dbUsers = await db.select().from(users);
    console.log(`Found ${dbUsers.length} users to migrate`);
    
    for (const user of dbUsers) {
      console.log(`Migrating user ID: ${user.id}`);
      
      // Re-encrypt the data with current key
      const newEncryptedName = encryptUserData({ name: 'Calum', employeeKey: '', role: 'admin', status: 'active' }).name;
      const newEncryptedRole = encryptUserData({ name: 'Calum', employeeKey: '', role: 'admin', status: 'active' }).role;
      const newEncryptedStatus = encryptUserData({ name: 'Calum', employeeKey: '', role: 'admin', status: 'active' }).status;
      
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
      
      console.log(`Updated user ${user.id}`);
    }
    
    // 2. Migrate Inventory Items
    console.log('Migrating inventory items...');
    const dbItems = await db.select().from(inventoryItems);
    console.log(`Found ${dbItems.length} inventory items to migrate`);
    
    for (const item of dbItems) {
      console.log(`Migrating inventory item ID: ${item.id}`);
      
      // Re-encrypt the data with current key
      const newEncryptedName = encryptInventoryData({ name: 'Sample Item', category: 'Áo Dài' }).name;
      const newEncryptedCategory = encryptInventoryData({ name: 'Sample Item', category: 'Áo Dài' }).category;
      
      // Update the item
      await db
        .update(inventoryItems)
        .set({
          name: newEncryptedName,
          category: newEncryptedCategory,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));
      
      console.log(`Updated inventory item ${item.id}`);
    }
    
    // 3. Migrate Inventory Sizes
    console.log('Migrating inventory sizes...');
    const dbSizes = await db.select().from(inventorySizes);
    console.log(`Found ${dbSizes.length} inventory sizes to migrate`);
    
    for (const size of dbSizes) {
      console.log(`Migrating inventory size ID: ${size.id}`);
      
      // Re-encrypt the data with current key
      const newEncryptedTitle = encryptInventorySizeData({ itemId: size.itemId, title: 'M', quantity: 1, onHand: 1, price: 100000 }).title;
      
      // Update the size
      await db
        .update(inventorySizes)
        .set({
          title: newEncryptedTitle,
        })
        .where(eq(inventorySizes.id, size.id));
      
      console.log(`Updated inventory size ${size.id}`);
    }
    
    // 4. Migrate Tags
    console.log('Migrating tags...');
    const dbTags = await db.select().from(tags);
    console.log(`Found ${dbTags.length} tags to migrate`);
    
    for (const tag of dbTags) {
      console.log(`Migrating tag ID: ${tag.id}`);
      
      // Re-encrypt the data with current key
      const newEncryptedName = encryptTagData({ name: 'Sample Tag' }).name;
      
      // Update the tag
      await db
        .update(tags)
        .set({
          name: newEncryptedName,
        })
        .where(eq(tags.id, tag.id));
      
      console.log(`Updated tag ${tag.id}`);
    }
    
    // 5. Migrate Category Counters
    console.log('Migrating category counters...');
    const dbCounters = await db.select().from(categoryCounters);
    console.log(`Found ${dbCounters.length} category counters to migrate`);
    
    for (const counter of dbCounters) {
      console.log(`Migrating category counter: ${counter.category}`);
      
      // Re-encrypt the data with current key
      const newEncryptedCategory = encryptInventoryData({ name: '', category: 'Áo Dài' }).category;
      
      // Update the counter
      await db
        .update(categoryCounters)
        .set({
          category: newEncryptedCategory,
        })
        .where(eq(categoryCounters.category, counter.category));
      
      console.log(`Updated category counter for ${counter.category}`);
    }
    
    // 6. Migrate Customers
    console.log('Migrating customers...');
    const dbCustomers = await db.select().from(customers);
    console.log(`Found ${dbCustomers.length} customers to migrate`);
    
    for (const customer of dbCustomers) {
      console.log(`Migrating customer ID: ${customer.id}`);
      
      // Always re-encrypt with deterministic encryption for searchability
      let customerName = customer.name;
      let customerPhone = customer.phone;
      
      // Decrypt if already encrypted
      try {
        if (isEncrypted(customer.name)) {
          customerName = decryptField(customer.name);
        }
        if (isEncrypted(customer.phone)) {
          customerPhone = decryptField(customer.phone);
        }
      } catch (error) {
        console.log(`Failed to decrypt customer ${customer.id}, using as-is`);
      }
      
      // Encrypt with deterministic encryption
      const newEncryptedName = encryptCustomerData({ name: customerName, phone: customerPhone }).name;
      const newEncryptedPhone = encryptCustomerData({ name: customerName, phone: customerPhone }).phone;
      const newEncryptedCompany = customer.company ? encryptCustomerData({ name: '', phone: '', company: customer.company }).company : null;
      const newEncryptedAddress = customer.address ? encryptCustomerData({ name: '', phone: '', address: customer.address }).address : null;
      const newEncryptedNotes = customer.notes ? encryptCustomerData({ name: '', phone: '', notes: customer.notes }).notes : null;
      
      // Update the customer
      await db
        .update(customers)
        .set({
          name: newEncryptedName,
          phone: newEncryptedPhone,
          company: newEncryptedCompany,
          address: newEncryptedAddress,
          notes: newEncryptedNotes,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
      
      console.log(`Updated customer ${customer.id}`);
    }
    
    console.log('Comprehensive encryption migration completed successfully!');
  } catch (error) {
    console.error('Error during comprehensive encryption migration:', error);
  }
}

migrateAllEncryption(); 