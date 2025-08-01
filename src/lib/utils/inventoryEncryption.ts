import { encrypt, decrypt, isEncrypted } from './encryption';

export interface InventoryData {
  id?: number;
  name: string;
  category: string;
  categoryCounter?: number;
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedInventoryData {
  id?: number;
  name: string; // This will be encrypted
  category: string; // This will be encrypted
  categoryCounter?: number;
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventorySizeData {
  id?: number;
  itemId: number;
  title: string; // This will be encrypted
  quantity: number; // This will be encrypted as string
  onHand: number; // This will be encrypted as string
  price: number; // This will be encrypted as string
}

export interface EncryptedInventorySizeData {
  id?: number;
  itemId: number;
  title: string; // This will be encrypted
  quantity: string; // This will be encrypted
  onHand: string; // This will be encrypted
  price: string; // This will be encrypted
}

export interface TagData {
  id?: number;
  name: string; // This will be encrypted
}

export interface EncryptedTagData {
  id?: number;
  name: string; // This will be encrypted
}

// Encrypt sensitive inventory data before storing
export function encryptInventoryData(inventory: InventoryData): EncryptedInventoryData {
  return {
    ...inventory,
    name: encrypt(inventory.name),
    category: encrypt(inventory.category),
  };
}

// Decrypt inventory data for display
export function decryptInventoryData(inventory: EncryptedInventoryData): InventoryData {
  return {
    ...inventory,
    name: decryptField(inventory.name),
    category: decryptField(inventory.category),
  };
}

// Encrypt inventory size data
export function encryptInventorySizeData(size: InventorySizeData): EncryptedInventorySizeData {
  return {
    ...size,
    title: encrypt(size.title),
    quantity: encrypt(String(size.quantity)),
    onHand: encrypt(String(size.onHand)),
    price: encrypt(String(size.price)),
  };
}

// Decrypt inventory size data with type safety
export function decryptInventorySizeData(size: EncryptedInventorySizeData): InventorySizeData {
  return {
    ...size,
    title: decryptField(size.title),
    quantity: parseInt(decryptField(size.quantity), 10),
    onHand: parseInt(decryptField(size.onHand), 10),
    price: parseInt(decryptField(size.price), 10),
  };
}

// Encrypt tag data
export function encryptTagData(tag: TagData): EncryptedTagData {
  return {
    ...tag,
    name: encrypt(tag.name),
  };
}

// Decrypt tag data
export function decryptTagData(tag: EncryptedTagData): TagData {
  return {
    ...tag,
    name: decryptField(tag.name),
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

// Helper to encrypt numeric field as string
export function encryptNumericField(value: number): string {
  return encrypt(String(value));
}

// Helper to decrypt numeric field with type safety
export function decryptNumericField(value: string): number {
  try {
    // Try to decrypt - if it fails, return original value as number
    if (isEncrypted(value)) {
      const decrypted = decrypt(value);
      return parseInt(decrypted, 10);
    }
    return parseInt(value, 10);
  } catch (error) {
    console.error('Numeric decryption failed:', error);
    return parseInt(value, 10); // Return original value as number if decryption fails
  }
} 