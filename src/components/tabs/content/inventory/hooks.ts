import { useState, useMemo, useCallback } from 'react';
import { InventoryItem, AddItemFormState } from '@/types/inventory';

// Optimized search hook with debouncing and server-side search
export function useInventorySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: unknown, page: unknown = 1) => {
      const searchQuery = query as string;
      const searchPage = page as number;
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setHasMore(false);
        setTotal(0);
        return;
      }

      setIsSearching(true);
      setSearchError('');

      try {
        const response = await fetch(
          `/api/inventory/search?q=${encodeURIComponent(searchQuery)}&page=${searchPage}&limit=20`
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        if (page === 1) {
          setSearchResults(data.items);
        } else {
          setSearchResults((prev) => [...prev, ...data.items]);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
        setCurrentPage(data.page);
      } catch (error) {
        console.error('Search error:', error);
        setSearchError('Có lỗi khi tìm kiếm sản phẩm');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setCurrentPage(1);
      debouncedSearch(query, 1);
    },
    [debouncedSearch]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isSearching) {
      debouncedSearch(searchQuery, currentPage + 1);
    }
  }, [hasMore, isSearching, searchQuery, currentPage, debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setHasMore(false);
    setTotal(0);
    setCurrentPage(1);
    setSearchError('');
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    hasMore,
    total,
    handleSearch,
    loadMore,
    clearSearch,
  };
}

// Debounce utility function
function debounce(
  func: (...args: unknown[]) => unknown,
  wait: number
): (...args: unknown[]) => void {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Legacy hook for backward compatibility (will be deprecated)
export function useInventoryTable(inventory: InventoryItem[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lastModifiedSort, setLastModifiedSort] = useState<'asc' | 'desc' | null>(null);
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | null>(null);
  const [idSort, setIdSort] = useState<'asc' | 'desc' | null>(null);

  const priceRangeInvalid = useMemo(
    () => priceRange.min && priceRange.max && Number(priceRange.max) < Number(priceRange.min),
    [priceRange.min, priceRange.max]
  );

  const filteredInventory = useMemo(() => {
    // Helper to remove accent marks
    const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let result = inventory.filter((item: InventoryItem) => {
      if (priceRangeInvalid) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const formattedId = (item.formattedId || '').toLowerCase().replace(/-/g, '');
        const qNoDash = q.replace(/-/g, '');
        const inFormattedId = formattedId.includes(qNoDash);
        const inId = String(item.id).toLowerCase().includes(q);
        // Normalize both name and query for accent-insensitive search
        const normName = normalize(item.name.toLowerCase());
        const normQ = normalize(q);
        const queryWords = normQ.split(/\s+/).filter(Boolean);

        // Fuzzy ranking: count how many query words match name or tags
        let matchCount = 0;
        queryWords.forEach((word) => {
          if (normName.includes(word)) matchCount++;
        });
        item.tags.forEach((tag: string) => {
          const normTag = normalize(tag.toLowerCase());
          queryWords.forEach((word: string) => {
            if (normTag.includes(word)) matchCount++;
          });
        });
        // Only include if matches ID or at least one word in name/tags
        if (!(inFormattedId || inId || matchCount > 0)) return false;
        // Attach matchCount for later sorting
        (item as InventoryItem & { _matchCount?: number })._matchCount = matchCount;
      }
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category))
        return false;
      const price = getItemPrice(item);
      if (priceRange.min && price < Number(priceRange.min)) return false;
      if (priceRange.max && price > Number(priceRange.max)) return false;
      return true;
    });
    // Sort by matchCount descending if searching by name/tags
    if (searchQuery.trim()) {
      result = [...result].sort(
        (a, b) =>
          ((b as InventoryItem & { _matchCount?: number })._matchCount || 0) -
          ((a as InventoryItem & { _matchCount?: number })._matchCount || 0)
      );
    }
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

// Helper function to get item price
function getItemPrice(item: InventoryItem): number {
  if (!item.sizes || item.sizes.length === 0) return 0;
  return Math.min(...item.sizes.map((size) => size.price));
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
