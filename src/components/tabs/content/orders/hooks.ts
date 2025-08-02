import { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OrderItem, ItemSize } from './types';
import { InventoryItem } from '@/types/inventory';
import { getOrdersWithCustomers, Order } from '@/lib/actions/orders';

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
      try {
        const res = await fetch('/api/customers');
        const customers: Customer[] = await res.json();
        // Use decrypted phone numbers for validation since they're already decrypted
        setExistingPhones(customers.map((c: Customer) => c.phone));
      } catch (err) {
        setExistingPhones([]);
      }
    }
    fetchPhones();
  }, []);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setSearched(false);
    setCustomer(null);
  };

  const handlePhoneEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phone) {
      setSearching(true);
      setSearched(false);
      setCustomer(null);
      try {
        const res = await fetch(`/api/customers?phone=${phone}`);
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
        headers: { 'Content-Type': 'application/json' },
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        // Build URL with date range parameters if provided
        let url = '/api/inventory/search?q=&page=1&limit=100';
        if (dateFrom && dateTo) {
          url += `&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
        } else {
        }

        // Use the optimized search API to get all items (empty query)
        const res = await fetch(url);
        if (!res.ok) throw new Error('Lỗi khi tải dữ liệu kho');
        const data = await res.json();

        setInventory(data.items);
      } catch (error) {
        console.error('Inventory fetch error:', error);
        setInventoryError('Không thể tải dữ liệu kho');
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    }
    fetchInventory();
  }, [dateFrom, dateTo]); // Restored dependencies to trigger on date changes

  return { inventory, inventoryLoading, inventoryError };
}

export function useOrderStep3ItemsLogic(
  orderItems: OrderItem[],
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>,
  inventory: InventoryItem[]
) {
  const [itemIdInput, setItemIdInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<ItemSize[]>([]);
  const [pendingItem, setPendingItem] = useState<null | {
    id: string;
    name: string;
    sizes: ItemSize[];
  }>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<(InventoryItem & { matchCount: number })[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isItemId = (input: string) => /^[A-Za-z]+-?\d{6}/.test(input.trim());

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
      return;
    }

    // Use client-side search for better performance
    const searchQuery = query.toLowerCase().trim();
    const normalizedQuery = normalizeVietnamese(searchQuery);
    const queryWords = normalizedQuery.split(/\s+/).filter((word: string) => word.length > 0);

    const results = inventory.filter((item) => {
      // Check for ID match first (fastest)
      if (isItemId(searchQuery)) {
        const itemId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
        const searchId = searchQuery.replace(/-/g, '').toUpperCase();
        return itemId.startsWith(searchId);
      }

      // Normalize item data for comparison
      const normalizedName = normalizeVietnamese(item.name);
      const normalizedCategory = normalizeVietnamese(item.category);

      // Check if all query words are in name or category
      const nameMatch = queryWords.every((word: string) => normalizedName.includes(word));
      const categoryMatch = queryWords.every((word: string) => normalizedCategory.includes(word));

      // Also check exact matches for better results
      const exactNameMatch = item.name.toLowerCase().includes(searchQuery);
      const exactCategoryMatch = item.category.toLowerCase().includes(searchQuery);

      // Check tags - look for any query word in any tag
      const tagMatch = item.tags.some((tag) => {
        const normalizedTag = normalizeVietnamese(tag);
        return queryWords.some((word: string) => normalizedTag.includes(word));
      });

      // Also check if any tag contains the full search query
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

    // Sort results by relevance
    const resultsWithScore = results
      .map((item) => {
        let score = 0;
        const itemId = (item.formattedId || '').toLowerCase();
        const itemName = item.name.toLowerCase();
        const itemCategory = item.category.toLowerCase();

        // Exact matches get higher scores
        if (itemId.includes(searchQuery)) score += 10;
        if (itemName.includes(searchQuery)) score += 8;
        if (itemCategory.includes(searchQuery)) score += 6;

        // Tag matches
        const tagMatches = item.tags.filter((tag) => {
          const normalizedTag = normalizeVietnamese(tag);
          return queryWords.some((word: string) => normalizedTag.includes(word));
        }).length;
        score += tagMatches * 4; // Each matching tag adds 4 points

        // Partial word matches in name and category
        queryWords.forEach((word: string) => {
          if (itemName.includes(word)) score += 2;
          if (itemCategory.includes(word)) score += 1;
        });

        return { ...item, matchCount: score };
      })
      .sort((a, b) => b.matchCount - a.matchCount);

    setSearchResults(resultsWithScore);

    if (resultsWithScore.length === 0) {
      setAddError('Không tìm thấy sản phẩm nào phù hợp với tên này');
      setShowSearchResults(false);
    } else {
      setShowSearchResults(true);
    }
  };

  async function fetchItemById(id: string) {
    const normId = id.replace(/-/g, '').toUpperCase();

    // Use client-side search for better performance
    const exactMatch = inventory.find((item) => {
      const itemId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
      return itemId.startsWith(normId);
    });

    if (exactMatch) {
      return {
        id: exactMatch.formattedId || exactMatch.id,
        name: exactMatch.name,
        sizes: exactMatch.sizes.map((s: { title: string; price: number }) => ({
          size: s.title,
          price: s.price,
        })),
      };
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
        await searchProducts(value);
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
    const { id: inputId, size: inputSize } = parseInputId(itemIdInput.trim());
    const item = await fetchItemById(itemIdInput.trim());
    setAdding(false);
    if (!item) {
      setAddError('Không tìm thấy sản phẩm với mã này');
      return;
    }
    if (!inputSize) {
      if (item.sizes.length === 1) {
        const onlySize = item.sizes[0];
        addItemToOrder(item, onlySize.size, onlySize.price);
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
    addItemToOrder(item, selectedSize.size, selectedSize.price);
    setItemIdInput('');
  };

  function addItemToOrder(
    item: { id: string; name: string; sizes: ItemSize[] },
    sizeTitle: string,
    price: number
  ) {
    setOrderItems((prev: OrderItem[]) => {
      const key = `${item.id}-${sizeTitle}`;
      const idx = prev.findIndex((i) => i.id === key);
      // Find inventory and onHand
      const inv = inventory.find(
        (invItem) => (invItem.formattedId || invItem.id) === item.id || invItem.id === item.id
      );
      const invSize = inv?.sizes.find((s) => s.title === sizeTitle);
      const onHand = invSize ? Number(invSize.onHand) : 0;
      if (idx !== -1) {
        const updated = prev.map((i, iIdx) => {
          if (iIdx === idx) {
            const newQty = i.quantity + 1;
            return {
              ...i,
              quantity: newQty,
              inventoryItemId: typeof inv?.id === 'number' ? inv.id : i.inventoryItemId,
              isCustom: !inv,
              warning: newQty > onHand ? 'Cảnh báo: vượt quá số lượng tồn kho' : undefined,
            };
          }
          return i;
        });
        return updated;
      }
      // Find the inventory item ID
      const inventoryItem = inventory.find(
        (invItem) => (invItem.formattedId || invItem.id) === item.id || invItem.id === item.id
      );

      return [
        ...prev,
        {
          id: key,
          name: item.name,
          size: sizeTitle,
          quantity: 1,
          price,
          inventoryItemId: typeof inventoryItem?.id === 'number' ? inventoryItem.id : null,
          isCustom: !inventoryItem, // Only custom if no inventory item found
          warning: 1 > onHand ? 'Cảnh báo: vượt quá số lượng tồn kho' : undefined,
        },
      ];
    });
  }

  function handleSelectSize(size: ItemSize) {
    if (!pendingItem) return;
    addItemToOrder(pendingItem, size.size, size.price);
    setShowSizeModal(false);
    setPendingItem(null);
    setSizeOptions([]);
  }

  const handleQuantityChange = (id: string, delta: number) => {
    setOrderItems((prev: OrderItem[]) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      // Find inventory and onHand
      const invId = id.replace(/-.+$/, '');
      const inv = inventory.find(
        (invItem) => (invItem.formattedId || invItem.id) === invId || invItem.id === invId
      );
      const invSize = inv?.sizes.find((s) => s.title === item.size);
      const onHand = invSize ? Number(invSize.onHand) : 0;
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

  const handleSearchResultClick = (item: InventoryItem) => {
    setShowSearchResults(false);
    setItemIdInput('');
    if (item.sizes.length === 1) {
      const onlySize = item.sizes[0];
      addItemToOrder(
        {
          id: item.formattedId || item.id,
          name: item.name,
          sizes: item.sizes.map((s) => ({ size: s.title, price: s.price })),
        },
        onlySize.title,
        onlySize.price
      );
    } else {
      setPendingItem({
        id: item.formattedId || item.id,
        name: item.name,
        sizes: item.sizes.map((s) => ({ size: s.title, price: s.price })),
      });
      setSizeOptions(item.sizes.map((s) => ({ size: s.title, price: s.price })));
      setShowSizeModal(true);
    }
  };

  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = searchResults.slice(startIndex, endIndex);

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
