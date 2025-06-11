// Types moved to src/types/inventory.ts for centralization.
export * from '@/types/inventory';

export interface InventorySize {
  title: string;
  quantity: string; // total
  onHand: string; // on-hands/available
  price: string; // keep as string for input, convert to number on submit
}

export interface AddItemFormState {
  name: string;
  category: string;
  tags: string[];
  tagsInput: string;
  photoFile: File | null;
  sizes: InventorySize[];
  samePrice: boolean;
}

export interface InventoryItem {
  id: string;
  formattedId?: string;
  name: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  sizes: {
    title: string;
    quantity: number;
    onHand: number;
    price: number;
  }[];
}
