import { encrypt, decrypt, isEncrypted } from './encryption';

export interface OrderData {
  id?: number;
  customerId: number;
  orderDate: Date;
  expectedReturnDate: Date;
  status: string;
  totalAmount: string | number;
  vatAmount?: string | number; // Make optional for backward compatibility
  depositAmount: string | number;
  paidAmount: string | number;
  paymentMethod?: string | null;
  paymentStatus: string;
  // Document deposit fields
  documentType?: string | null;
  documentOther?: string | null;
  documentName?: string | null;
  documentId?: string | null;
  documentStatus?: string | null;
  // Deposit info
  depositType?: string | null;
  depositValue?: string | number | null;
  taxInvoiceExported: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedOrderData {
  id?: number;
  customerId: number;
  orderDate: Date;
  expectedReturnDate: Date;
  status: string;
  totalAmount: string | number;
  vatAmount?: string | number;
  depositAmount: string | number;
  paidAmount: string | number;
  paymentMethod?: string | null;
  paymentStatus: string;
  // Document deposit fields (encrypted) - optional for backward compatibility
  documentType?: string | null; // This will be encrypted
  documentOther?: string | null; // This will be encrypted
  documentName?: string | null; // This will be encrypted
  documentId?: string | null; // This will be encrypted
  // Deposit info
  depositType?: string | null;
  depositValue?: string | number | null;
  taxInvoiceExported: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItemData {
  id?: number;
  orderId: number;
  inventoryItemId?: number | null;
  name: string; // This will be encrypted
  size: string; // This will be encrypted
  quantity: number;
  price: number;
  isExtension: boolean;
  extraDays?: number | null;
  feeType?: string | null;
  percent?: number | null;
  isCustom: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedOrderItemData {
  id?: number;
  orderId: number;
  inventoryItemId?: number | null;
  name: string; // This will be encrypted
  size: string; // This will be encrypted
  quantity: number;
  price: number;
  isExtension: boolean;
  extraDays?: number | null;
  feeType?: string | null;
  percent?: number | null;
  isCustom: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderNoteData {
  id?: number;
  orderId: number;
  itemId?: number | null;
  text: string; // This will be encrypted
  done: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EncryptedOrderNoteData {
  id?: number;
  orderId: number;
  itemId?: number | null;
  text: string; // This will be encrypted
  done: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Encrypt sensitive order data before storing
export function encryptOrderData(order: OrderData): EncryptedOrderData {
  return {
    ...order,
    documentType: order.documentType ? encrypt(order.documentType) : null,
    documentOther: order.documentOther ? encrypt(order.documentOther) : null,
    documentName: order.documentName ? encrypt(order.documentName) : null,
    documentId: order.documentId ? encrypt(order.documentId) : null,
  };
}

// Decrypt order data for display
export function decryptOrderData(order: EncryptedOrderData): OrderData {
  // Handle case where order might be undefined or missing properties
  if (!order) {
    return {
      documentType: null,
      documentOther: null,
      documentName: null,
      documentId: null,
      documentStatus: null,
      vatAmount: 0,
    } as OrderData;
  }

  return {
    ...order,
    documentType: (order as any)?.documentType && (order as any).documentType.includes(':') 
      ? decryptField((order as any).documentType) 
      : (order as any)?.documentType || null,
    documentOther: (order as any)?.documentOther && (order as any).documentOther.includes(':') 
      ? decryptField((order as any).documentOther) 
      : (order as any)?.documentOther || null,
    documentName: (order as any)?.documentName && (order as any).documentName.includes(':') 
      ? decryptField((order as any).documentName) 
      : (order as any)?.documentName || null,
    documentId: (order as any)?.documentId && (order as any).documentId.includes(':') 
      ? decryptField((order as any).documentId) 
      : (order as any)?.documentId || null,
    documentStatus: (order as any)?.documentStatus || null, // documentStatus is not encrypted
  };
}

// Encrypt order item data
export function encryptOrderItemData(item: OrderItemData): EncryptedOrderItemData {
  return {
    ...item,
    name: encrypt(item.name),
    size: encrypt(item.size),
  };
}

// Decrypt order item data
export function decryptOrderItemData(item: EncryptedOrderItemData): OrderItemData {
  return {
    ...item,
    name: decryptField(item.name),
    size: decryptField(item.size),
  };
}

// Encrypt order note data
export function encryptOrderNoteData(note: OrderNoteData): EncryptedOrderNoteData {
  return {
    ...note,
    text: encrypt(note.text),
  };
}

// Decrypt order note data
export function decryptOrderNoteData(note: EncryptedOrderNoteData): OrderNoteData {
  return {
    ...note,
    text: decryptField(note.text),
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