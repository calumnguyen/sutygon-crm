import { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OrderItem, ItemSize } from './types';
import { InventoryItem } from '@/types/inventory';

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

export function useInventoryFetch() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error('Lỗi khi tải dữ liệu kho');
        const data = await res.json();
        setInventory(data);
      } catch {
        setInventoryError('Không thể tải dữ liệu kho');
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    }
    fetchInventory();
  }, []);

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
  const isItemId = (input: string) => /^[A-Za-z]+-?\d+(-?[A-Za-z])?$/.test(input.trim());

  const searchProducts = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const normalizedQuery = normalize(query.toLowerCase());
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
    const resultsWithScore = inventory.map((item) => {
      const normName = normalize(item.name.toLowerCase());
      let matchCount = 0;
      queryWords.forEach((word) => {
        if (normName.includes(word)) matchCount++;
      });
      item.tags.forEach((tag: string) => {
        const normTag = normalize(tag.toLowerCase());
        queryWords.forEach((word) => {
          if (normTag.includes(word)) matchCount++;
        });
      });
      return { ...item, matchCount };
    });
    const filtered = resultsWithScore.filter((item) => item.matchCount > 0);
    filtered.sort((a, b) => b.matchCount - a.matchCount);
    setSearchResults(filtered);
    if (filtered.length === 0) {
      setAddError('Không tìm thấy sản phẩm nào phù hợp với tên này');
      setShowSearchResults(false);
    } else {
      setShowSearchResults(true);
    }
  };

  async function fetchItemById(id: string) {
    const normId = id.replace(/-/g, '').toUpperCase();
    for (const item of inventory) {
      const baseId = (item.formattedId || '').replace(/-/g, '').toUpperCase();
      if (normId.startsWith(baseId)) {
        return {
          id: item.formattedId || item.id,
          name: item.name,
          sizes: item.sizes.map((s) => ({
            size: s.title,
            price: s.price,
          })),
        };
      }
    }
    return null;
  }

  function parseInputId(input: string) {
    const match = input
      .trim()
      .toUpperCase()
      .match(/^([A-Z]+-?\d+)(-?([A-Z]))?$/);
    if (!match) return { id: input.trim(), size: undefined };
    const id = match[1].replace(/-/g, '');
    const size = match[3];
    return { id, size };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setItemIdInput(value);
    setAddError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = itemIdInput.trim();
      if (!value) return;
      if (isItemId(value)) {
        handleAddItem();
      } else {
        setCurrentPage(1);
        searchProducts(value);
      }
    }
  };

  const handleAddItem = async () => {
    setAddError('');
    if (!itemIdInput.trim()) return;
    if (!isItemId(itemIdInput)) {
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
    const selectedSize = item.sizes.find(
      (s: ItemSize) => s.size.toUpperCase() === inputSize.toUpperCase()
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
    size: string,
    price: number
  ) {
    setOrderItems((prev: OrderItem[]) => {
      const key = `${item.id}-${size}`;
      const idx = prev.findIndex((i) => i.id === key);
      if (idx !== -1) {
        return prev.map((i, iIdx) => (iIdx === idx ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: key,
          name: item.name,
          size,
          quantity: 1,
          price,
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
    setOrderItems((prev: OrderItem[]) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
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
