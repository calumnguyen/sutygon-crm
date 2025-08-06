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
  try {
    if (!user.name || typeof user.name !== 'string') {
      throw new Error(`Invalid name field: ${typeof user.name} (${user.name})`);
    }
    if (!user.role || typeof user.role !== 'string') {
      throw new Error(`Invalid role field: ${typeof user.role} (${user.role})`);
    }
    if (!user.status || typeof user.status !== 'string') {
      throw new Error(`Invalid status field: ${typeof user.status} (${user.status})`);
    }

    return {
      ...user,
      name: encrypt(user.name),
      employeeKey: user.employeeKey, // Keep as is - will be hashed separately
      role: encrypt(user.role),
      status: encrypt(user.status),
    };
  } catch (error) {
    console.error('Error in encryptUserData:', error);
    console.error('User data causing error:', user);
    throw error;
  }
}

// Decrypt user data for display
export function decryptUserData(user: EncryptedUserData): UserData {
  try {
    console.log('Decrypting user data for user ID:', user.id);

    if (!user) {
      throw new Error('User data is null or undefined');
    }

    const decryptedName = decryptField(user.name);
    const decryptedRole = decryptField(user.role);
    const decryptedStatus = decryptField(user.status);

    console.log('Decrypted values:', {
      name: decryptedName,
      role: decryptedRole,
      status: decryptedStatus,
    });

    return {
      ...user,
      name: decryptedName,
      employeeKey: user.employeeKey, // Keep as is - this is hashed
      role: decryptedRole,
      status: decryptedStatus,
    };
  } catch (error) {
    console.error('Error in decryptUserData:', error);
    console.error('Encrypted user data causing error:', user);
    throw error;
  }
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
