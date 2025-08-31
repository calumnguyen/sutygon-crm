export interface Customer {
  id: number;
  name: string;
  phone: string;
  company?: string | null;
}

export interface OrderItem {
  id: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
  inventoryItemId?: number | null;
  imageUrl?: string | null;
  onHand?: number;
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
  onHand?: number;
}
