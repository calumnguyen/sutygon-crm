import { db } from '../db';
import { customers } from '../db/schema';
import { eq, desc, asc, like, and, or, count } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { encryptCustomerData, decryptCustomerData, encryptField, decryptField } from '../utils/customerEncryption';
import { monitorDatabaseQuery } from '../utils/performance';

export async function getAllCustomers(options?: {
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'createdAt' | 'activeOrdersCount';
  orderDirection?: 'asc' | 'desc';
}) {
  return monitorDatabaseQuery(
    'getAllCustomers',
    async () => {
      const { 
        limit = 50, 
        offset = 0, 
        orderBy = 'createdAt', 
        orderDirection = 'desc' 
      } = options || {};

      // Use index-optimized query with limit
      const orderColumn = orderBy === 'name' ? customers.name : 
                         orderBy === 'activeOrdersCount' ? customers.activeOrdersCount : 
                         customers.createdAt;
      
      const orderFunc = orderDirection === 'asc' ? asc : desc;
      
      const dbCustomers = await db
        .select()
        .from(customers)
        .orderBy(orderFunc(orderColumn))
        .limit(limit)
        .offset(offset);
      
      // Decrypt sensitive data for display
      return dbCustomers.map(customer => decryptCustomerData(customer));
    },
    (result) => result.length
  );
}

export async function getCustomersCount(): Promise<number> {
  return monitorDatabaseQuery(
    'getCustomersCount',
    async () => {
      const result = await db.select({ count: count() }).from(customers);
      return result[0].count;
    }
  );
}

export async function searchCustomers(searchTerm: string, options?: {
  limit?: number;
  searchBy?: 'phone' | 'name' | 'company';
}) {
  const { limit = 10, searchBy = 'phone' } = options || {};
  
  if (searchBy === 'phone') {
    // Use encrypted phone search (deterministic encryption)
    return await getCustomerByPhone(searchTerm);
  } else {
    // For name/company search, we'd need to scan all records since encryption isn't searchable
    // For better performance with large datasets, consider implementing a search index
    const dbCustomers = await db
      .select()
      .from(customers)
      .limit(limit);
    
    // Filter client-side after decryption (not ideal for large datasets)
    const decryptedCustomers = dbCustomers.map(customer => decryptCustomerData(customer));
    
    return decryptedCustomers.filter(customer => {
      if (searchBy === 'name') {
        return customer.name?.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (searchBy === 'company') {
        return customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  }
}

type CustomerInsert = InferInsertModel<typeof customers>;

export async function createCustomer(data: CustomerInsert) {
  // Encrypt sensitive data before storing
  const encryptedData = encryptCustomerData(data);
  
  return await db
    .insert(customers)
    .values({
      name: encryptedData.name,
      phone: encryptedData.phone, // This is now encrypted
      company: encryptedData.company ?? null,
      address: encryptedData.address ?? null,
      notes: encryptedData.notes ?? null,
      activeOrdersCount: encryptedData.activeOrdersCount ?? 0,
      lateOrdersCount: encryptedData.lateOrdersCount ?? 0,
    })
    .returning();
}

export async function getCustomerByPhone(phone: string) {
  // Encrypt the search phone number to match encrypted data in DB
  const encryptedPhone = encryptField(phone);
  const dbCustomers = await db.select().from(customers).where(eq(customers.phone, encryptedPhone));
  
  // Decrypt results for display
  return dbCustomers.map(customer => decryptCustomerData(customer));
}

export async function updateCustomer(id: number, data: Partial<CustomerInsert>) {
  // Encrypt sensitive data before storing
  const encryptedData = encryptCustomerData(data as any);
  
  return await db
    .update(customers)
    .set({
      name: encryptedData.name,
      phone: encryptedData.phone,
      company: encryptedData.company ?? null,
      address: encryptedData.address ?? null,
      notes: encryptedData.notes ?? null,
      activeOrdersCount: encryptedData.activeOrdersCount ?? 0,
      lateOrdersCount: encryptedData.lateOrdersCount ?? 0,
    })
    .where(eq(customers.id, id))
    .returning();
}
