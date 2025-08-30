export interface OrderItem {
  id: number;
  orderId: number;
  inventoryItemId: number | null;
  formattedId: string | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  warning?: string;
  warningResolved?: boolean;
  noteNotComplete?: number;
}

export interface CustomerDetails {
  id: number;
  name: string;
  phone: string;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface Discount {
  id: number;
  orderId: number;
  discountType: 'vnd' | 'percent';
  discountValue: number;
  discountAmount: number;
  itemizedNameId: number;
  itemizedName: string;
  description?: string;
  requestedByUserId?: number;
  authorizedByUserId?: number;
  createdAt: string;
}

export interface PaymentHistory {
  id: number;
  orderId: number;
  paymentMethod: 'cash' | 'qr';
  amount: string;
  paymentDate: string;
  processedByUser: {
    id: number;
    name: string;
  };
}
