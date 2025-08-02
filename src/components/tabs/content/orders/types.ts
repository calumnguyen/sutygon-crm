export interface Customer {
  id: number;
  name: string;
  phone: string;
  company?: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  inventoryItemId?: number | null;
  isExtension?: boolean;
  extraDays?: number;
  feeType?: 'vnd' | 'percent';
  percent?: number;
  isCustom?: boolean;
  warning?: string;
}

export interface ItemSize {
  size: string;
  price: number;
}
