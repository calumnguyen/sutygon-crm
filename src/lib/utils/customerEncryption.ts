import { encrypt, decrypt, isEncrypted } from './encryption';

export interface CustomerData {
  id?: number;
  name: string;
  phone: string;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
  activeOrdersCount?: number;
  lateOrdersCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedCustomerData {
  id?: number;
  name: string;
  phone: string; // This will be encrypted
  company?: string | null;
  address?: string | null;
  notes?: string | null;
  activeOrdersCount?: number;
  lateOrdersCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Encrypt sensitive customer data before storing
export function encryptCustomerData(customer: CustomerData): EncryptedCustomerData {
  return {
    ...customer,
    name: encrypt(customer.name),
    phone: encrypt(customer.phone),
    company: customer.company ? encrypt(customer.company) : null,
    address: customer.address ? encrypt(customer.address) : null,
    notes: customer.notes ? encrypt(customer.notes) : null,
  };
}

// Decrypt customer data for display
export function decryptCustomerData(customer: EncryptedCustomerData): CustomerData {
  return {
    ...customer,
    name: decryptField(customer.name),
    phone: decryptField(customer.phone),
    company: customer.company ? decryptField(customer.company) : null,
    address: customer.address ? decryptField(customer.address) : null,
    notes: customer.notes ? decryptField(customer.notes) : null,
  };
}

// Helper to encrypt a single field
export function encryptField(value: string): string {
  return encrypt(value);
}

// Helper to decrypt a single field
export function decryptField(value: string): string {
  try {
    // Try to decrypt - if it fails, return original value
    if (isEncrypted(value)) {
      return decrypt(value);
    }
    return value;
  } catch (error) {
    console.error('Decryption failed:', error);
    return value; // Return original value if decryption fails
  }
} 