import { encrypt, decrypt, isEncrypted } from './encryption';

export interface UserData {
  id?: number;
  name: string;
  employeeKey: string; // This will be hashed, not encrypted
  role: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedUserData {
  id?: number;
  name: string; // This will be encrypted
  employeeKey: string; // This will be hashed
  role: string; // This will be encrypted
  status: string; // This will be encrypted
  createdAt?: Date;
  updatedAt?: Date;
}

// Encrypt sensitive user data before storing
export function encryptUserData(user: UserData): EncryptedUserData {
  return {
    ...user,
    name: encrypt(user.name),
    employeeKey: user.employeeKey, // Keep as is - will be hashed separately
    role: encrypt(user.role),
    status: encrypt(user.status),
  };
}

// Decrypt user data for display
export function decryptUserData(user: EncryptedUserData): UserData {
  return {
    ...user,
    name: decryptField(user.name),
    employeeKey: user.employeeKey, // Keep as is - this is hashed
    role: decryptField(user.role),
    status: decryptField(user.status),
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