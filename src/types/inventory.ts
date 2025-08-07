export interface InventorySize {
  title: string;
  quantity: string; // total (string for form, number for DB)
  onHand: string;
  price: string;
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
  id: string | number;
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
