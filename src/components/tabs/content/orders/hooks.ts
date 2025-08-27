import { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OrderItem, ItemSize } from './types';
import { InventoryItem } from '@/types/inventory';
import { getOrdersWithCustomers, Order } from '@/lib/actions/orders';
import { useUser } from '@/context/UserContext';

interface Customer {
  id: number;
  name: string;
  company?: string | null;
  phone: string;
}

interface AddCustomerData {
  name: string;
  phone: string;
  company?: string;
  notes?: string;
}

export function useOrderNewFlow() {
  const { sessionToken } = useUser();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [phone, setPhone] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [date, setDate] = useState<string>('');
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [existingPhones, setExistingPhones] = useState<string[]>([]);
  const [prefillPhone, setPrefillPhone] = useState<string>('');

  useEffect(() => {
    async function fetchPhones() {
      if (!sessionToken) return;
      try {
        const res = await fetch('/api/customers', {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        const customers: Customer[] = await res.json();
        // Use decrypted phone numbers for validation since they're already decrypted
        setExistingPhones(customers.map((c: Customer) => c.phone));
      } catch (err) {
        setExistingPhones([]);
      }
    }
    fetchPhones();
  }, [sessionToken]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setSearched(false);
    setCustomer(null);
  };

  const handlePhoneEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle both Enter key and mobile keyboard "done" action
    if ((e.key === 'Enter' || e.key === 'Done') && phone) {
      e.preventDefault(); // Prevent any default form submission
      setSearching(true);
      setSearched(false);
      setCustomer(null);
      try {
        const res = await fetch(`/api/customers?phone=${phone}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        const data: Customer = await res.json();
        setCustomer(data);
      } catch (err) {
        setCustomer(null);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }
  };

  const handleAddCustomer = async (customerData: AddCustomerData) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: customerData.name,
          phone: customerData.phone,
          company: customerData.company ?? null,
          notes: customerData.notes ?? null,
          address: null,
          activeOrdersCount: 0,
          lateOrdersCount: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      const inserted: Customer = await res.json();
      setCustomer(inserted);
      setIsAddModalOpen(false);
      setExistingPhones((prev: string[]) => [...prev, inserted.phone]);
      return true;
    } catch (error) {
      console.error('Failed to add customer:', error);
      return false;
    }
  };

  const handleOpenAddModal = () => {
    setPrefillPhone(phone);
    setIsAddModalOpen(true);
  };

  const handleCustomerSelect = () => {
    if (customer) {
      setCurrentStep(1);
    }
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 2);
    }
    if (value.length > 2) {
      formatted += '/' + value.slice(2, 4);
    }
    if (value.length > 4) {
      formatted += '/' + value.slice(4, 8);
    }
    setDate(formatted);
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 2000 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  };

  const parseDate = (str: string): Date | null => {
    if (!str || str.length !== 10) return null;
    const parsed = parse(str, 'dd/MM/yyyy', new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateString = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  useEffect(() => {
    if (currentStep === 1 && validateDate(date)) {
      const timeout = setTimeout(() => setCurrentStep(2), 350);
      return () => clearTimeout(timeout);
    }
  }, [date, currentStep]);

  return {
    currentStep,
    setCurrentStep,
    phone,
    setPhone,
    searching,
    setSearching,
    searched,
    setSearched,
    customer,
    setCustomer,
    date,
    setDate,
    showCalendarModal,
    setShowCalendarModal,
    isAddModalOpen,
    setIsAddModalOpen,
    existingPhones,
    setExistingPhones,
    prefillPhone,
    setPrefillPhone,
    handlePhoneInput,
    handlePhoneEnter,
    handleAddCustomer,
    handleOpenAddModal,
    handleCustomerSelect,
    handleDateInput,
    validateDate,
    parseDate,
    formatDateString,
  };
}

export function useInventoryFetch(dateFrom?: string, dateTo?: string) {
  const { sessionToken } = useUser();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        // For orders, we don't need to load all inventory items
        // We'll use server-side search like the inventory content does
        // Just load a small initial set for basic functionality
        const url = '/api/inventory?limit=50&page=1';
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!res.ok) throw new Error('Lỗi khi tải dữ liệu kho');
        const data = await res.json();

        console.log(`Loaded ${data.items?.length || 0} initial inventory items for orders`);
        setInventory(data.items || []);
      } catch (error) {
        console.error('Inventory fetch error:', error);
        setInventoryError('Không thể tải dữ liệu kho');
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    }
    fetchInventory();
  }, [sessionToken]); // Remove date dependencies - we want all items loaded regardless of dates

  return { inventory, inventoryLoading, inventoryError };
}

export function useOrderStep3ItemsLogic(
  orderItems: OrderItem[],
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>,
  inventory: InventoryItem[]
) {
  const { sessionToken } = useUser();
  const [itemIdInput, setItemIdInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<ItemSize[]>([]);
  const [pendingItem, setPendingItem] = useState<null | {
    id: string;
    name: string;
    sizes: ItemSize[];
    inventoryItemId?: number;
    imageUrl?: string;
  }>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<(InventoryItem & { matchCount: number })[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Server-side search state (Elasticsearch)
  const [serverTotalPages, setServerTotalPages] = useState<number | null>(null);
  const [serverQuery, setServerQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // For orders, we use server-side search like the inventory content
  // This is more efficient and works with the full inventory
  const useServerSearch = true;

  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isItemId = (input: string) => /^[A-Za-z]{1,3}[-]?\d{4,6}$/i.test(input.trim());

  const normalizeVietnamese = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[đ]/g, 'd') // Replace đ with d
      .replace(/[Đ]/g, 'D'); // Replace Đ with D
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setServerTotalPages(null);
      setServerQuery('');
      return;
    }

    // Server-side search using Typesense (like inventory content)
    if (useServerSearch) {
      try {
        setCurrentPage(1);
        setServerQuery(query);

        const searchUrl = new URL('/api/inventory/search-typesense', window.location.origin);

        // For product IDs, normalize the search query to handle different formats
        let searchQuery = query;
        if (isItemId(query)) {
          // Normalize product ID format: "ad002349" -> "AD-002349"
          const match = query.match(/^([A-Za-z]{1,3})[-]?(\d{4,6})$/i);
          if (match) {
            const [, letters, numbers] = match;
            searchQuery = `${letters.toUpperCase()}-${numbers}`;
            console.log(`Normalized product ID search: "${query}" -> "${searchQuery}"`);
          }
        }

        searchUrl.searchParams.set('q', searchQuery);
        searchUrl.searchParams.set('page', '1');
        searchUrl.searchParams.set('limit', ITEMS_PER_PAGE.toString());

        const res = await fetch(searchUrl.toString(), {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!res.ok) throw new Error('Tìm kiếm thất bại');
        const data = await res.json();
        console.log('Search results from Typesense:', data.items?.length || 0, 'items');

        // Process search results to ensure they have the correct structure
        const processedItems = (data.items || []).map(
          (item: {
            id: string | number;
            formattedId?: string;
            imageUrl?: string;
            sizes?: Array<{ title: string; price: number; onHand?: number }>;
          }) => {
            const processedItem = {
              ...item,
              id: item.formattedId || String(item.id), // Use formattedId as the display ID
              inventoryItemId: (() => {
                // If item.id is already a number, use it
                if (typeof item.id === 'number') {
                  return item.id;
                }
                // If item.id is a formatted ID like 'AD-002350', try to extract the number
                const idStr = String(item.id);
                if (idStr.includes('-')) {
                  const match = idStr.match(/\d+$/);
                  return match ? parseInt(match[0]) : undefined;
                }
                // Try to parse as number
                const parsed = parseInt(idStr);
                return isNaN(parsed) ? undefined : parsed;
              })(), // Convert string ID to number for database ID
              imageUrl:
                item.imageUrl && item.imageUrl !== 'has_image' && item.imageUrl.startsWith('data:')
                  ? item.imageUrl
                  : null, // Only use valid base64 image URLs
              sizes:
                item.sizes?.map((size: { title: string; price: number; onHand?: number }) => ({
                  size: size.title, // Use title field from Typesense
                  price: size.price,
                  onHand: size.onHand || 0, // Ensure onHand is included
                })) || [],
            };

            return processedItem;
          }
        );

        console.log('Processed search results:', processedItems.length, 'items');
        setSearchResults(processedItems);
        setServerTotalPages(Number(data.totalPages || 1));
        setShowSearchResults(true);
      } catch (err) {
        console.error('Server search error:', err);
        setSearchResults([]);
        setServerTotalPages(null);
        setShowSearchResults(false);
        setAddError('Không tìm thấy sản phẩm phù hợp');
      }
      return;
    }

    // Client-side search as fallback (for small inventories)
    const searchQuery = query.toLowerCase().trim();
    const normalizedQuery = normalizeVietnamese(searchQuery);
    const queryWords = normalizedQuery.split(/\s+/).filter((word: string) => word.length > 0);

    const results = inventory.filter((item) => {
      if (isItemId(searchQuery)) {
        const itemId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
        const searchId = searchQuery.replace(/-/g, '').toUpperCase();
        return itemId.startsWith(searchId);
      }
      const normalizedName = normalizeVietnamese(item.name);
      const normalizedCategory = normalizeVietnamese(item.category);
      const nameMatch = queryWords.every((word: string) => normalizedName.includes(word));
      const categoryMatch = queryWords.every((word: string) => normalizedCategory.includes(word));
      const exactNameMatch = item.name.toLowerCase().includes(searchQuery);
      const exactCategoryMatch = item.category.toLowerCase().includes(searchQuery);
      const tagMatch = item.tags.some((tag) => {
        const normalizedTag = normalizeVietnamese(tag);
        return queryWords.some((word: string) => normalizedTag.includes(word));
      });
      const fullTagMatch = item.tags.some((tag) => {
        const normalizedTag = normalizeVietnamese(tag);
        return normalizedTag.includes(normalizedQuery);
      });
      return (
        nameMatch ||
        categoryMatch ||
        exactNameMatch ||
        exactCategoryMatch ||
        tagMatch ||
        fullTagMatch
      );
    });

    const resultsWithScore = results
      .map((item) => {
        let score = 0;
        const itemId = (item.formattedId || '').toLowerCase();
        const itemName = item.name.toLowerCase();
        const itemCategory = item.category.toLowerCase();
        if (itemId.includes(searchQuery)) score += 10;
        if (itemName.includes(searchQuery)) score += 8;
        if (itemCategory.includes(searchQuery)) score += 6;
        const tagMatches = item.tags.filter((tag) => {
          const normalizedTag = normalizeVietnamese(tag);
          return queryWords.some((word: string) => normalizedTag.includes(word));
        }).length;
        score += tagMatches * 4;
        queryWords.forEach((word: string) => {
          if (itemName.includes(word)) score += 2;
          if (itemCategory.includes(word)) score += 1;
        });
        return { ...item, matchCount: score };
      })
      .sort((a, b) => b.matchCount - a.matchCount);

    setSearchResults(resultsWithScore);
    setServerTotalPages(null);

    if (resultsWithScore.length === 0) {
      setAddError('Không tìm thấy sản phẩm nào phù hợp với tên này');
      setShowSearchResults(false);
    } else {
      setShowSearchResults(true);
    }
  };

  async function fetchItemById(id: string) {
    const normId = id.replace(/-/g, '').toUpperCase();

    // For product IDs, always use server-side search to ensure we get complete data
    if (isItemId(id)) {
    } else {
      // First check client-side cache for performance (only for non-product IDs)
      const exactMatch = inventory.find((item) => {
        const itemId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
        return itemId.startsWith(normId);
      });

      if (exactMatch) {
        return {
          id: exactMatch.formattedId ? exactMatch.formattedId : String(exactMatch.id),
          name: exactMatch.name,
          sizes: exactMatch.sizes.map((s: { title: string; price: number; onHand?: number }) => ({
            size: s.title,
            price: s.price,
            onHand: s.onHand || 0,
          })),
          inventoryItemId: typeof exactMatch.id === 'number' ? exactMatch.id : undefined,
          imageUrl: exactMatch.imageUrl || null,
        };
      }
    }

    // If not found in client cache, use server-side search
    try {
      const searchUrl = new URL('/api/inventory/search-typesense', window.location.origin);

      // Normalize product ID format for search
      let searchQuery = id;
      if (isItemId(id)) {
        const match = id.match(/^([A-Za-z]{1,3})[-]?(\d{4,6})$/i);
        if (match) {
          const [, letters, numbers] = match;
          searchQuery = `${letters.toUpperCase()}-${numbers}`;
          console.log(`Normalized product ID lookup: "${id}" -> "${searchQuery}"`);
        }
      }

      searchUrl.searchParams.set('q', searchQuery);
      searchUrl.searchParams.set('limit', '5');

      const res = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      const items = data.items || [];

      // Find exact match by comparing normalized IDs
      for (const item of items) {
        const itemId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
        const searchId = id.replace(/-/g, '').toUpperCase();

        // Check for exact match or if item ID starts with search ID
        if (itemId === searchId || itemId.startsWith(searchId)) {
          return {
            id: item.formattedId ? item.formattedId : String(item.id),
            name: item.name,
            sizes: item.sizes.map((s: { title: string; price: number; onHand?: number }) => ({
              size: s.title,
              price: s.price,
              onHand: s.onHand || 0,
            })),
            inventoryItemId: item.id, // Include the actual database ID
            imageUrl: item.imageUrl || null, // Include the image URL
          };
        }
      }
    } catch (error) {
      console.error('Server search error:', error);
    }

    return null;
  }

  function parseInputId(input: string) {
    const trimmed = input.trim();
    const match = trimmed.match(/^([A-Za-z]+-?\d{6})(.*)$/i);
    if (!match) return { id: trimmed, size: undefined };
    const id = match[1].replace(/-/g, '').toUpperCase();
    let size = match[2] ? match[2].replace(/^[-\s]*/, '') : undefined;
    if (size === '') size = undefined;
    return { id, size };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setItemIdInput(value);
    setAddError('');
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = itemIdInput.trim();
      if (!value) return;
      if (isItemId(value)) {
        handleAddItem();
      } else {
        setCurrentPage(1);
        setIsSearching(true); // Set loading state immediately
        try {
          await searchProducts(value);
        } finally {
          setIsSearching(false); // Clear loading state when done
        }
      }
    }
  };

  const handleAddItem = async () => {
    setAddError('');
    if (!itemIdInput.trim()) return;
    if (!isItemId(itemIdInput)) {
      setAddError('Không tìm thấy sản phẩm nào phù hợp với tên này');
      return;
    }
    setAdding(true);
    setIsSearching(true); // Also set search loading state for product ID searches
    const { id: inputId, size: inputSize } = parseInputId(itemIdInput.trim());
    const item = await fetchItemById(itemIdInput.trim());
    setAdding(false);
    setIsSearching(false); // Clear search loading state
    if (!item) {
      setAddError('Không tìm thấy sản phẩm với mã này');
      return;
    }
    if (!inputSize) {
      if (item.sizes.length === 1) {
        const onlySize = item.sizes[0];
        await addItemToOrder(item, onlySize.size, onlySize.price);
        setItemIdInput('');
        return;
      } else {
        setPendingItem(item);
        setSizeOptions(item.sizes);
        setShowSizeModal(true);
        setItemIdInput('');
        return;
      }
    }
    // Find the inventory size by normalized comparison
    const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();
    const selectedSize = item.sizes.find(
      (s: ItemSize) => normalize(s.size) === normalize(inputSize)
    );
    if (!selectedSize) {
      setPendingItem(item);
      setSizeOptions(item.sizes);
      setShowSizeModal(true);
      setItemIdInput('');
      return;
    }
    await addItemToOrder(item, selectedSize.size, selectedSize.price);
    setItemIdInput('');
  };

  // Function to fetch current onHand values from the database
  const fetchCurrentOnHand = async (
    inventoryItemId: number,
    sizeTitle: string
  ): Promise<number> => {
    try {
      // Since we can't search by database ID directly, let's use the main inventory API
      // to get a small set and find the item by ID
      const response = await fetch(`/api/inventory?limit=1000&page=1`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const item = data.items?.find(
          (item: {
            id: number;
            sizes?: Array<{ size?: string; title?: string; onHand?: number }>;
          }) => item.id === inventoryItemId
        );
        if (item) {
          // Try both 'size' and 'title' properties for size matching
          const size = item.sizes?.find(
            (s: { size?: string; title?: string; onHand?: number }) =>
              s.size === sizeTitle || s.title === sizeTitle
          );
          return size ? Number(size.onHand) : 0;
        }
      }
    } catch (error) {
      console.error('Error fetching onHand:', error);
    }
    return 0;
  };

  async function addItemToOrder(
    item: {
      id: string;
      name: string;
      sizes: ItemSize[];
      imageUrl?: string;
      inventoryItemId?: number;
    },
    sizeTitle: string,
    price: number,
    imageUrl?: string
  ) {
    // Use the inventoryItemId from the search result if available
    const inventoryItemId = item.inventoryItemId || null;
    const itemImageUrl = item.imageUrl || imageUrl || null;

    // Try to get onHand from search result sizes first, then fallback to database fetch
    let onHand = 0;

    const itemSize = item.sizes?.find((s: ItemSize) => s.size === sizeTitle);
    if (itemSize) {
      onHand = Number(itemSize.onHand) || 0;
    } else {
      // If we have inventoryItemId, try to fetch current onHand from database
      if (item.inventoryItemId) {
        try {
          const currentOnHand = await fetchCurrentOnHand(item.inventoryItemId, sizeTitle);
          onHand = currentOnHand;
        } catch (error) {
          console.error('🔍 Error fetching onHand from database:', error);
        }
      }
    }

    setOrderItems((prev: OrderItem[]) => {
      const key = `${item.id}-${sizeTitle}`;
      const idx = prev.findIndex((i) => i.id === key);

      if (idx !== -1) {
        const updated = prev.map((i, iIdx) => {
          if (iIdx === idx) {
            const newQty = i.quantity + 1;
            return {
              ...i,
              quantity: newQty,
              inventoryItemId: inventoryItemId || i.inventoryItemId,
              imageUrl: itemImageUrl || i.imageUrl,
              onHand: onHand || i.onHand, // Update onHand value
              isCustom: !inventoryItemId, // Only custom if no inventory item ID
              warning: newQty > onHand ? 'Cảnh báo: vượt quá số lượng tồn kho' : undefined,
            };
          }
          return i;
        });
        return updated;
      }

      const newOrderItem = {
        id: key,
        name: item.name,
        size: sizeTitle,
        quantity: 1,
        price,
        inventoryItemId: inventoryItemId,
        imageUrl: itemImageUrl,
        onHand: onHand, // Store the onHand value
        isCustom: !inventoryItemId, // Only custom if no inventory item ID
        warning: 1 > onHand ? 'Cảnh báo: vượt quá số lượng tồn kho' : undefined,
      };

      return [...prev, newOrderItem];
    });
  }

  async function handleSelectSize(size: ItemSize) {
    if (!pendingItem) return;
    await addItemToOrder(pendingItem, size.size, size.price);
    setShowSizeModal(false);
    setPendingItem(null);
    setSizeOptions([]);
  }

  const handleQuantityChange = (id: string, delta: number) => {
    setOrderItems((prev: OrderItem[]) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;

      // Use the stored onHand value from the order item
      const onHand = item.onHand || 0;

      if (item.quantity === 1 && delta === -1) {
        setItemToDelete(item);
        setShowDeleteModal(true);
        return prev;
      }
      return prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: Math.max(1, i.quantity + delta),
              warning:
                Math.max(1, i.quantity + delta) > onHand
                  ? 'Cảnh báo: vượt quá số lượng tồn kho'
                  : undefined,
            }
          : i
      );
    });
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      setOrderItems((prev: OrderItem[]) => prev.filter((i) => i.id !== itemToDelete.id));
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const [isProcessingClick, setIsProcessingClick] = useState(false);

  const handleSearchResultClick = (item: InventoryItem) => {
    // Prevent multiple rapid clicks
    if (isProcessingClick) {
      return;
    }

    setIsProcessingClick(true);

    // Reset the flag after a timeout to prevent it from getting stuck
    setTimeout(() => {
      setIsProcessingClick(false);
    }, 2000);

    setShowSearchResults(false);
    setItemIdInput('');
    if (item.sizes.length === 1) {
      const onlySize = item.sizes[0];
      const itemData = {
        id: item.formattedId || String(item.id),
        name: item.name,
        sizes: item.sizes.map((s) => ({ size: s.title, price: s.price, onHand: s.onHand })),
        inventoryItemId: (() => {
          // If item.id is already a number, use it
          if (typeof item.id === 'number') {
            return item.id;
          }
          // If item.id is a formatted ID like 'AD-002350', try to extract the number
          const idStr = String(item.id);
          if (idStr.includes('-')) {
            const match = idStr.match(/\d+$/);
            return match ? parseInt(match[0]) : undefined;
          }
          // Try to parse as number
          const parsed = parseInt(idStr);
          return isNaN(parsed) ? undefined : parsed;
        })(),
        imageUrl: item.imageUrl && item.imageUrl.startsWith('data:') ? item.imageUrl : undefined, // Only use valid base64 images
      };

      addItemToOrder(
        itemData,
        onlySize.title,
        onlySize.price,
        itemData.imageUrl // Use the filtered imageUrl
      );
      setIsProcessingClick(false);
    } else {
      const pendingItemData = {
        id: item.formattedId || String(item.id),
        name: item.name,
        sizes: item.sizes.map((s) => ({ size: s.title, price: s.price, onHand: s.onHand })),
        inventoryItemId: (() => {
          // If item.id is already a number, use it
          if (typeof item.id === 'number') {
            return item.id;
          }
          // If item.id is a formatted ID like 'AD-002350', try to extract the number
          const idStr = String(item.id);
          if (idStr.includes('-')) {
            const match = idStr.match(/\d+$/);
            return match ? parseInt(match[0]) : undefined;
          }
          // Try to parse as number
          const parsed = parseInt(idStr);
          return isNaN(parsed) ? undefined : parsed;
        })(),
        imageUrl: item.imageUrl && item.imageUrl.startsWith('data:') ? item.imageUrl : undefined, // Only use valid base64 images
      };
      setPendingItem(pendingItemData);
      const mappedSizeOptions = item.sizes.map(
        (s: { title: string; price: number; onHand?: number }) => {
          return {
            size: s.title, // Use title field from Typesense
            price: s.price,
            onHand: s.onHand || 0,
          };
        }
      );
      setSizeOptions(mappedSizeOptions);
      setShowSizeModal(true);
      setIsProcessingClick(false);
    }
  };

  // Server-side pagination for search results
  useEffect(() => {
    const fetchPage = async () => {
      if (!useServerSearch || !serverQuery.trim()) return;
      try {
        setIsSearching(true);
        const searchUrl = new URL('/api/inventory/search-typesense', window.location.origin);
        searchUrl.searchParams.set('q', serverQuery);
        searchUrl.searchParams.set('page', currentPage.toString());
        searchUrl.searchParams.set('limit', ITEMS_PER_PAGE.toString());

        const res = await fetch(searchUrl.toString(), {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!res.ok) return;
        const data = await res.json();
        setSearchResults(data.items || []);
        setServerTotalPages(Number(data.totalPages || 1));
      } finally {
        setIsSearching(false);
      }
    };
    fetchPage();
  }, [currentPage, serverQuery, useServerSearch, sessionToken]);

  const totalPages = serverTotalPages ?? Math.ceil(searchResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = serverTotalPages ? searchResults : searchResults.slice(startIndex, endIndex);

  return {
    itemIdInput,
    setItemIdInput,
    adding,
    addError,
    setAddError,
    showSizeModal,
    setShowSizeModal,
    sizeOptions,
    setSizeOptions,
    pendingItem,
    setPendingItem,
    showDeleteModal,
    setShowDeleteModal,
    itemToDelete,
    setItemToDelete,
    showSearchResults,
    setShowSearchResults,
    searchResults,
    setSearchResults,
    currentPage,
    setCurrentPage,
    ITEMS_PER_PAGE,
    handleInputChange,
    handleKeyDown,
    handleAddItem,
    handleSelectSize,
    handleQuantityChange,
    handleConfirmDelete,
    handleCancelDelete,
    handleSearchResultClick,
    totalPages,
    startIndex,
    endIndex,
    currentItems,
    searching: isSearching,
  };
}

export function useOrdersTable() {
  const [orders, setOrders] = useState<
    (Order & {
      customerName: string;
      calculatedReturnDate: Date;
      noteNotComplete: number;
      noteTotal: number;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 10;

  const fetchOrders = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const ordersData = await getOrdersWithCustomers({
        limit: ITEMS_PER_PAGE,
        offset,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      if (append) {
        setOrders((prev) => [...prev, ...ordersData]);
      } else {
        setOrders(ordersData);
      }

      // Check if we have more data
      setHasMore(ordersData.length === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (!loadingMore && hasMore) {
      await fetchOrders(page + 1, true);
    }
  };

  useEffect(() => {
    fetchOrders(1, false);
  }, []);

  return {
    orders,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchOrders(1, false),
  };
}
