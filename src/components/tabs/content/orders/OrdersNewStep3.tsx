import { Customer } from './types';
import { formatPhoneNumber, getDayLabel, getExpectedReturnDate } from './utils';
import React, { useState } from 'react';
import OrdersStep3InfoSection from './OrdersStep3InfoSection';
import OrdersStep3ItemsSection from './OrdersStep3ItemsSection';
import { OrderItem } from './types';
import OrdersStep3AlterationSection from './OrdersStep3AlterationSection';

interface OrdersNewStep3Props {
  customer: Customer;
  date: string;
  setDate: (date: string) => void;
  setCurrentStep: (step: number) => void;
}

interface ItemSize {
  size: string;
  price: number;
}

// Simulated item DB
const MOCK_ITEMS = [
  {
    id: 'AD-000001',
    name: 'Áo Sơ Mi Trắng',
    sizes: [
      { size: 'S', price: 110000 },
      { size: 'M', price: 120000 },
      { size: 'L', price: 130000 },
    ],
  },
];

const OrdersNewStep3 = ({ customer, date, setDate, setCurrentStep }: OrdersNewStep3Props) => {
  const [showReturnDateModal, setShowReturnDateModal] = useState(false);
  const [itemIdInput, setItemIdInput] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<ItemSize[]>([]);
  const [pendingItem, setPendingItem] = useState<(typeof MOCK_ITEMS)[number] | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);

  // Simulate fetching item from DB (replace with real API call)
  async function fetchItemById(id: string) {
    // Normalize: remove hyphens for matching
    const normId = id.replace(/-/g, '').toUpperCase();
    for (const item of MOCK_ITEMS) {
      const baseId = item.id.replace(/-/g, '').toUpperCase();
      if (normId.startsWith(baseId)) {
        return item;
      }
    }
    return null;
  }

  // Parse input for ID and optional size
  function parseInputId(input: string) {
    // Accept: AD-000001, AD000001, AD-000001-S, AD000001S, etc.
    const match = input
      .trim()
      .toUpperCase()
      .match(/^([A-Z]+-?\d+)(-?([A-Z]))?$/);
    if (!match) return { id: input.trim(), size: undefined };
    const id = match[1].replace(/-/g, '');
    const size = match[3];
    return { id, size };
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!itemIdInput.trim()) return;
    setAdding(true);
    const { id: inputId, size: inputSize } = parseInputId(itemIdInput.trim());
    // Find item by base ID
    const item = await fetchItemById(itemIdInput.trim());
    setAdding(false);
    if (!item) {
      setAddError('Không tìm thấy sản phẩm với mã này');
      return;
    }
    // If size is specified, check if valid
    let selectedSize = undefined;
    if (inputSize) {
      selectedSize = item.sizes.find((s) => s.size.toUpperCase() === inputSize.toUpperCase());
      if (!selectedSize) {
        // Invalid size, show modal
        setPendingItem(item);
        setSizeOptions(item.sizes);
        setShowSizeModal(true);
        setItemIdInput('');
        return;
      }
    }
    if (!inputSize || !selectedSize) {
      // No size specified, show modal
      setPendingItem(item);
      setSizeOptions(item.sizes);
      setShowSizeModal(true);
      setItemIdInput('');
      return;
    }
    // Add item with selected size
    addItemToOrder(item, selectedSize.size, selectedSize.price);
    setItemIdInput('');
  };

  function addItemToOrder(item: (typeof MOCK_ITEMS)[number], size: string, price: number) {
    setOrderItems((prev) => {
      // If already added (same id+size), increase quantity by 1 only
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
    setOrderItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      if (item.quantity === 1 && delta === -1) {
        setItemToDelete(item);
        setShowDeleteModal(true);
        return prev;
      }
      return prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      );
    });
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      setOrderItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  return (
    <div className="flex min-h-[200px] items-start gap-6 transition-all duration-500 justify-start w-full">
      {/* Step 3+ layout: left/right split */}
      {/* Left section: Customer info, rent date, return date, and summary boxes */}
      <OrdersStep3InfoSection
        customer={customer}
        date={date}
        setDate={setDate}
        setCurrentStep={setCurrentStep}
        onShowReturnDateModal={() => setShowReturnDateModal(true)}
      />
      {/* Right section: Add items to order */}
      <OrdersStep3ItemsSection orderItems={orderItems} setOrderItems={setOrderItems} />
      {/* Rightmost section: Alteration */}
      <OrdersStep3AlterationSection />
      {/* Update Return Date Modal */}
      {showReturnDateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowReturnDateModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setShowReturnDateModal(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-green-400 mb-4">Cập nhật ngày trả dự kiến</div>
            {/* Modal content for updating return date goes here */}
            <div className="text-white text-base">
              (Chức năng cập nhật ngày trả sẽ được bổ sung ở đây)
            </div>
          </div>
        </div>
      )}
      {/* Size selection modal */}
      {showSizeModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSizeModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setShowSizeModal(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-blue-400 mb-4">Chọn size cho sản phẩm</div>
            <div className="flex flex-col gap-3 w-full">
              {sizeOptions.map((s) => (
                <button
                  key={s.size}
                  className="w-full py-3 rounded-lg bg-gray-800 hover:bg-blue-700 text-white font-semibold border border-blue-500 mb-1 transition-colors"
                  onClick={() => handleSelectSize(s)}
                >
                  Size {s.size} - {s.price.toLocaleString('vi-VN')}₫
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Delete item confirmation modal */}
      {showDeleteModal && itemToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={handleCancelDelete}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-red-400 mb-4">Xoá sản phẩm khỏi đơn hàng?</div>
            <div className="text-white text-base mb-6">
              Bạn có chắc chắn muốn xoá <span className="font-bold">{itemToDelete.name}</span> (
              {itemToDelete.id}) khỏi đơn hàng không?
            </div>
            <div className="flex gap-4">
              <button
                className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={handleConfirmDelete}
              >
                Xoá
              </button>
              <button
                className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                onClick={handleCancelDelete}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersNewStep3;
