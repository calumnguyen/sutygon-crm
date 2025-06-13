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
}

export interface ItemSize {
  size: string;
  price: number;
}
