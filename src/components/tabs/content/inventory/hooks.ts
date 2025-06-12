import { useState, useMemo } from 'react';
import type { InventoryItem, AddItemFormState } from '@/types/inventory';
import { getItemPrice } from './InventoryUtils';

export function useInventoryTable(inventory: InventoryItem[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | ''>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lastModifiedSort, setLastModifiedSort] = useState<'asc' | 'desc' | ''>('');
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | ''>('');
  const [idSort, setIdSort] = useState<'asc' | 'desc' | ''>('');

  const priceRangeInvalid = Boolean(
    priceRange.min && priceRange.max && Number(priceRange.max) < Number(priceRange.min)
  );

  const filteredInventory = useMemo(() => {
    let result = inventory.filter((item) => {
      if (priceRangeInvalid) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const formattedId = (item.formattedId || '').toLowerCase().replace(/-/g, '');
        const qNoDash = q.replace(/-/g, '');
        const inFormattedId = formattedId.includes(qNoDash);
        const inId = String(item.id).toLowerCase().includes(q);
        const inName = item.name.toLowerCase().includes(q);
        const inTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!(inFormattedId || inId || inName || inTags)) return false;
      }
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category))
        return false;
      const price = getItemPrice(item);
      if (priceRange.min && price < Number(priceRange.min)) return false;
      if (priceRange.max && price > Number(priceRange.max)) return false;
      return true;
    });
    if (priceSort) {
      result = [...result].sort((a, b) => {
        const pa = getItemPrice(a);
        const pb = getItemPrice(b);
        return priceSort === 'asc' ? pa - pb : pb - pa;
      });
    }
    if (nameSort) {
      result = [...result].sort((a, b) => {
        return nameSort === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    }
    if (lastModifiedSort) {
      result = [...result].sort((a, b) => {
        const aId = String(a.id);
        const bId = String(b.id);
        return lastModifiedSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
      });
    }
    if (idSort) {
      result = [...result].sort((a, b) => {
        const aId = a.formattedId || String(a.id);
        const bId = b.formattedId || String(b.id);
        return idSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
      });
    }
    return result;
  }, [
    inventory,
    searchQuery,
    priceSort,
    priceRange,
    selectedCategories,
    lastModifiedSort,
    nameSort,
    idSort,
    priceRangeInvalid,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    priceSort,
    setPriceSort,
    priceRange,
    setPriceRange,
    selectedCategories,
    setSelectedCategories,
    lastModifiedSort,
    setLastModifiedSort,
    nameSort,
    setNameSort,
    idSort,
    setIdSort,
    priceRangeInvalid,
    filteredInventory,
  };
}

const initialForm: AddItemFormState = {
  name: '',
  category: 'Áo Dài',
  tags: [],
  tagsInput: '',
  photoFile: null,
  sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
  samePrice: true,
};

export function useInventoryModals(refreshInventory: () => void) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [form, setForm] = useState<AddItemFormState>(initialForm);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

  const resetAddItemForm = () => {
    setAddStep(1);
    setForm(initialForm);
  };

  const handleAddItemClick = () => {
    setIdentityModalOpen(true);
  };

  const handleIdentitySuccess = () => {
    setIdentityModalOpen(false);
    setAddModalOpen(true);
  };

  const handleAddItem = async () => {
    const tags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);
    const sizes = form.sizes.map((s) => ({
      title: s.title,
      quantity: parseInt(s.quantity, 10) || 0,
      onHand: parseInt(s.onHand, 10) || 0,
      price: parseInt(s.price.replace(/\D/g, ''), 10) || 0,
    }));
    const imageUrl = form.photoFile ? URL.createObjectURL(form.photoFile) : undefined;
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        imageUrl,
        tags,
        sizes,
      }),
    });
    refreshInventory();
    resetAddItemForm();
    setAddModalOpen(false);
  };

  return {
    previewOpen,
    setPreviewOpen,
    addModalOpen,
    setAddModalOpen,
    addStep,
    setAddStep,
    form,
    setForm,
    identityModalOpen,
    setIdentityModalOpen,
    resetAddItemForm,
    handleAddItemClick,
    handleIdentitySuccess,
    handleAddItem,
  };
}
