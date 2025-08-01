import { Customer, OrderItem } from './types';
import { formatPhoneNumber, getDayLabel, getExpectedReturnDate } from './utils';
import React, { useState } from 'react';
import OrdersStep3InfoSection from './OrdersStep3InfoSection';
import OrdersStep3ItemsSection from './OrdersStep3ItemsSection';
import OrdersStep3AlterationSection from './OrdersStep3AlterationSection';
import { addDays, parse, format } from 'date-fns';

interface OrdersNewStep3Props {
  customer: Customer;
  date: string;
  setDate: (date: string) => void;
  setCurrentStep: (step: number) => void;
  orderItems: OrderItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setCreatedOrderId: React.Dispatch<React.SetStateAction<number | null>>;
}

interface ItemSize {
  size: string;
  price: number;
}

interface Note {
  id: string;
  itemId: string | null;
  text: string;
  done: boolean;
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

const OrdersNewStep3 = ({
  customer,
  date,
  setDate,
  setCurrentStep,
  orderItems,
  setOrderItems,
  notes,
  setNotes,
  setCreatedOrderId,
}: OrdersNewStep3Props) => {
  const [showReturnDateModal, setShowReturnDateModal] = useState(false);
  const [itemIdInput, setItemIdInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<ItemSize[]>([]);
  const [pendingItem, setPendingItem] = useState<(typeof MOCK_ITEMS)[number] | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [extraDays, setExtraDays] = useState<number>(0);
  const [feeType, setFeeType] = useState<'vnd' | 'percent'>('vnd');
  const [extraFee, setExtraFee] = useState<string | number>(''); // for VND
  const [percent, setPercent] = useState<string | number>(''); // for %
  const [erdError, setErdError] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  // Helper: subtotal of regular items
  const subtotal = orderItems
    .filter((i) => !i.isExtension)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);
  // Helper: extension price (live)
  const extensionPrice =
    feeType === 'vnd'
      ? Number(extraFee) || 0
      : Math.round(subtotal * ((Number(percent) || 0) / 100));

  // When modal opens, prefill fields if extension item exists
  React.useEffect(() => {
    if (showReturnDateModal) {
      const ext = orderItems.find((i) => i.isExtension);
      if (ext) {
        setExtraDays(ext.extraDays || 0);
        setFeeType(ext.feeType || 'vnd');
        setExtraFee(ext.feeType === 'vnd' ? String(ext.price) : '');
        setPercent(ext.feeType === 'percent' ? String(ext.percent || '') : '');
      } else {
        setExtraDays(0);
        setFeeType('vnd');
        setExtraFee('');
        setPercent('');
      }
    }
  }, [showReturnDateModal, orderItems]);

  // Update extension item price live if feeType is percent
  React.useEffect(() => {
    const ext = orderItems.find((i) => i.isExtension);
    if (ext && ext.feeType === 'percent') {
      setOrderItems((prev) =>
        prev.map((i) =>
          i.isExtension
            ? { ...i, price: Math.round(subtotal * ((Number(ext.percent) || 0) / 100)) }
            : i
        )
      );
    }
  }, [subtotal, percent]);

  // Helper: get current ERD (with extension if present)
  function getCurrentERD() {
    let baseDate: Date;
    try {
      baseDate = parse(date, 'dd/MM/yyyy', new Date());
    } catch {
      return { date: '', day: '' };
    }
    const extension = orderItems.find((i) => i.isExtension);
    const totalRentalDays = 3 + (extension && extension.extraDays ? extension.extraDays : 0);
    // For rental period calculation: rent on day 1, return on day 3 = 3 days rental (add 2 days)
    const erdDate = addDays(baseDate, totalRentalDays - 1);
    const erdDateStr = format(erdDate, 'dd/MM/yyyy');
    return {
      date: erdDateStr,
      day: getDayLabel(erdDateStr),
    };
  }

  // Add or update extension item
  function handleAddExtension() {
    setErdError('');
    if (!extraDays || extraDays < 1) {
      setErdError('Vui lòng nhập số ngày gia hạn lớn hơn 0');
      return;
    }
    if (feeType === 'vnd' && (!extraFee || Number(extraFee) < 0)) {
      setErdError('Vui lòng nhập phụ phí gia hạn');
      return;
    }
    if (feeType === 'percent' && (!percent || Number(percent) < 0)) {
      setErdError('Vui lòng nhập phần trăm phụ phí');
      return;
    }
    setOrderItems((prev) => {
      // Remove any existing extension item
      const filtered = prev.filter((i) => !i.isExtension);
      return [
        ...filtered,
        {
          id: 'EXTENSION',
          name: `Gia hạn thời gian thuê - ${extraDays} ngày`,
          size: '',
          quantity: 1,
          price:
            feeType === 'vnd'
              ? Number(extraFee)
              : Math.round(subtotal * ((Number(percent) || 0) / 100)),
          isExtension: true,
          extraDays,
          feeType,
          percent: feeType === 'percent' ? Number(percent) : undefined,
        },
      ];
    });
    setShowReturnDateModal(false);
  }

  const handleProceedToCheckout = async () => {
    try {
      console.log('Creating order in database before proceeding to payment...');
      
      // Calculate total and deposit
      const total = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const depositValue = 0; // Default to 0 for now, can be updated in step 4
      
      // Calculate expected return date (base: 3 days + any extension days)
      const orderDate = new Date(date.split('/').reverse().join('-'));
      const extensionItem = orderItems.find((item) => item.isExtension);
      const extraDays = extensionItem?.extraDays || 0;
      const totalRentalDays = 3 + extraDays; // Total rental period (3 base days + extensions)
      
      // For rental period calculation:
      // - Rent on day 1, return on day 3 = 3 days rental (add 2 days to start date)
      // - So we add (totalRentalDays - 1) to the order date
      const expectedReturnDate = new Date(orderDate);
      expectedReturnDate.setDate(orderDate.getDate() + (totalRentalDays - 1));
      
      console.log(`Order date: ${orderDate.toLocaleDateString('vi-VN')}`);
      console.log(`Extension days: ${extraDays}`);
      console.log(`Total rental days: ${totalRentalDays}`);
      console.log(`Expected return date: ${expectedReturnDate.toLocaleDateString('vi-VN')}`);
      console.log(`Calculation: ${orderDate.toLocaleDateString('vi-VN')} + ${totalRentalDays - 1} days = ${expectedReturnDate.toLocaleDateString('vi-VN')}`);
      
      const orderData = {
        customerId: customer.id,
        orderDate: orderDate,
        expectedReturnDate: expectedReturnDate,
        totalAmount: total,
        depositAmount: depositValue,
        items: orderItems.map(item => ({
          inventoryItemId: null, // TODO: Map to real inventory items
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          isExtension: item.isExtension || false,
          extraDays: null,
          feeType: null,
          percent: null,
          isCustom: true,
        })),
        notes: notes.map(note => ({
          itemId: null, // TODO: Map to real item IDs
          text: note.text,
          done: note.done,
        })),
      };

      console.log('Order data:', JSON.stringify(orderData, null, 2));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const createdOrder = await response.json();
      console.log('Created order:', createdOrder);
      
      // Store the real order ID for use in step 4
      // We'll need to pass this to step 4 somehow
      // For now, we'll use a global variable or context
      setCreatedOrderId(createdOrder.id);
      
      // Proceed to step 4
      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating order:', error);
      // TODO: Show error message to user
      alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    }
  };

  return (
    <div className="flex min-h-[200px] items-start gap-6 transition-all duration-500 justify-start w-full bg-transparent">
      {/* Step 3+ layout: left/right split */}
      {/* Left section: Customer info, rent date, return date, and summary boxes */}
      <div className="w-[320px] max-w-[420px] sticky top-6 z-10 h-fit">
        <OrdersStep3InfoSection
          customer={customer}
          date={date}
          setDate={setDate}
          setCurrentStep={setCurrentStep}
          onShowReturnDateModal={() => setShowReturnDateModal(true)}
          orderItems={orderItems}
          erdDate={getCurrentERD().date}
          erdDay={getCurrentERD().day}
          onProceedToCheckout={handleProceedToCheckout}
        />
      </div>
      {/* Right section: Add items to order */}
      <div className="flex-1 min-w-0">
        <OrdersStep3ItemsSection
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          onItemClick={(item) => setSelectedItemId(item.id)}
          selectedItemId={selectedItemId}
        />
      </div>
      {/* Rightmost section: Alteration */}
      <div className="w-[260px] max-w-[320px] sticky top-6 z-10 h-fit">
        <OrdersStep3AlterationSection
          orderItems={orderItems}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          notes={notes}
          setNotes={setNotes}
        />
      </div>
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
            <div className="text-xl font-bold text-green-400 mb-2">Cập nhật ngày trả dự kiến</div>
            <div className="text-sm text-yellow-300 mb-4 text-center">
              Ngày trả dự kiến sẽ được tự động đặt sau 3 ngày kể từ ngày thuê. Bạn có thể gia hạn
              ngày thuê với phụ phí.
            </div>
            <div className="w-full flex flex-col gap-3 items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base text-gray-300">Ngày trả dự kiến hiện tại:</span>
                <span className="font-bold text-white text-lg">{getCurrentERD().date}</span>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <label className="text-sm text-gray-300">Số ngày muốn gia hạn</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  value={extraDays || ''}
                  onChange={(e) => setExtraDays(Number(e.target.value))}
                  placeholder="Nhập số ngày gia hạn"
                />
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <label className="text-sm text-gray-300 mb-1">Phụ phí gia hạn</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={feeType === 'vnd'}
                      onChange={() => setFeeType('vnd')}
                    />
                    <span className="text-sm">VND</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={feeType === 'percent'}
                      onChange={() => setFeeType('percent')}
                    />
                    <span className="text-sm">%</span>
                  </label>
                </div>
                {feeType === 'vnd' ? (
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white mt-2"
                    value={extraFee}
                    onChange={(e) => setExtraFee(e.target.value)}
                    placeholder="Nhập phụ phí gia hạn (VND)"
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white mt-2"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    placeholder="Nhập phần trăm phụ phí (%)"
                  />
                )}
              </div>
              {erdError && <div className="text-red-400 text-sm mt-2">{erdError}</div>}
              <button
                className="mt-4 px-6 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-lg"
                onClick={handleAddExtension}
              >
                Xác nhận gia hạn
              </button>
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
