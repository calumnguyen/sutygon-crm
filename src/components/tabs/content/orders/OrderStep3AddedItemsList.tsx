import React, { useState, useEffect } from 'react';
import { OrderItem } from './types';
import { InventoryItem } from '@/types/inventory';

interface OrderStep3AddedItemsListProps {
  items: OrderItem[];
  onQuantityChange: (id: string, delta: number) => void;
  onDelete: (item: OrderItem) => void;
  inventory: InventoryItem[];
  onItemClick: (item: OrderItem) => void;
  selectedItemId?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

interface OverlappingOrder {
  orderId: number;
  customerName: string;
  orderDate: string;
  expectedReturnDate: string;
  quantity: number;
}

interface ImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlappingOrders: OverlappingOrder[];
  itemName: string;
  size: string;
  dateFrom: string;
  dateTo: string;
  originalOnHand: number;
  isLoading: boolean;
}

const ImpactModal: React.FC<ImpactModalProps> = ({
  isOpen,
  onClose,
  overlappingOrders,
  itemName,
  size,
  dateFrom,
  dateTo,
  originalOnHand,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">
            Tác động: {itemName} - Size {size}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-3 p-2 bg-blue-900 bg-opacity-20 rounded border border-blue-700">
          <div className="text-xs text-blue-300 font-medium">Thời gian thuê của bạn:</div>
          <div className="text-xs text-white">
            {new Date(dateFrom).toLocaleDateString('vi-VN')} -{' '}
            {new Date(dateTo).toLocaleDateString('vi-VN')}
          </div>
        </div>

        <div className="mb-3 p-2 bg-yellow-900 bg-opacity-20 rounded border border-yellow-700">
          <div className="text-xs text-yellow-300 font-medium">Tồn kho gốc:</div>
          <div className="text-xs text-white font-bold">{originalOnHand} sản phẩm</div>
        </div>

        {isLoading ? (
          <div className="text-gray-400 text-center py-4 text-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Đang tải dữ liệu...
            </div>
          </div>
        ) : overlappingOrders.length === 0 ? (
          <div className="text-gray-400 text-center py-4 text-sm">Không có đơn hàng trùng lịch</div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">Đơn hàng ảnh hưởng:</div>
            {overlappingOrders.map((order, index) => (
              <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-white text-sm">{order.customerName}</div>
                  <div className="text-xs text-gray-400">
                    #{order.orderId.toString().padStart(6, '0')}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Thuê:</span>
                    <div className="text-white font-medium">
                      {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Trả:</span>
                    <div className="text-white font-medium">
                      {new Date(order.expectedReturnDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">SL:</span>
                    <div className="text-white font-medium">{order.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderStep3AddedItemsList: React.FC<OrderStep3AddedItemsListProps> = ({
  items,
  onQuantityChange,
  onDelete,
  inventory,
  onItemClick,
  selectedItemId,
  dateFrom,
  dateTo,
}) => {
  const [impactModal, setImpactModal] = useState<{
    isOpen: boolean;
    overlappingOrders: OverlappingOrder[];
    itemName: string;
    size: string;
    originalOnHand: number;
    isLoading: boolean;
  }>({
    isOpen: false,
    overlappingOrders: [],
    itemName: '',
    size: '',
    originalOnHand: 0,
    isLoading: false,
  });
  const [preview, setPreview] = useState<{ url: string; title: string; id?: string } | null>(null);
  const [availableStockCache, setAvailableStockCache] = useState<Record<string, number>>({});

  // Clear cache when date range changes
  useEffect(() => {
    setAvailableStockCache({});
  }, [dateFrom, dateTo]);

  // Handle items changes - only when date range changes
  useEffect(() => {
    if (!dateFrom || !dateTo || items.length === 0) return;

    // Only calculate when date range changes, not when items change
    const calculateAllAvailableStock = async () => {
      const newCache: Record<string, number> = {};

      for (const item of items) {
        if (
          item.inventoryItemId &&
          (typeof item.inventoryItemId === 'number' || typeof item.inventoryItemId === 'string')
        ) {
          const inventoryItemId =
            typeof item.inventoryItemId === 'string'
              ? parseInt(item.inventoryItemId, 10)
              : item.inventoryItemId;
          if (isNaN(inventoryItemId)) {
            continue;
          }

          const originalOnHand = (item as { onHand?: number }).onHand || 0;
          const cacheKey = `${inventoryItemId}-${item.size}`;

          try {
            const overlappingOrders = await fetchOverlappingOrders(inventoryItemId, item.size);
            const totalOverlappingQuantity = overlappingOrders.reduce(
              (sum: number, order: OverlappingOrder) => sum + order.quantity,
              0
            );
            const availableStock = originalOnHand - totalOverlappingQuantity;
            newCache[cacheKey] = availableStock;
          } catch (error) {
            console.error('Error calculating available stock for item:', item.id, error);
            newCache[cacheKey] = originalOnHand;
          }
        }
      }

      setAvailableStockCache(newCache);
    };

    calculateAllAvailableStock();
  }, [dateFrom, dateTo]); // Only depend on date range changes

  // Calculate available stock for new items when they're added
  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    const calculateForNewItems = async () => {
      const currentCache = { ...availableStockCache };
      let hasChanges = false;

      for (const item of items) {
        if (
          item.inventoryItemId &&
          (typeof item.inventoryItemId === 'number' || typeof item.inventoryItemId === 'string')
        ) {
          const inventoryItemId =
            typeof item.inventoryItemId === 'string'
              ? parseInt(item.inventoryItemId, 10)
              : item.inventoryItemId;
          if (isNaN(inventoryItemId)) {
            continue;
          }

          const cacheKey = `${inventoryItemId}-${item.size}`;

          // Only calculate if not already in cache
          if (currentCache[cacheKey] === undefined) {
            const originalOnHand = (item as { onHand?: number }).onHand || 0;

            try {
              const overlappingOrders = await fetchOverlappingOrders(inventoryItemId, item.size);
              const totalOverlappingQuantity = overlappingOrders.reduce(
                (sum: number, order: OverlappingOrder) => sum + order.quantity,
                0
              );
              const availableStock = originalOnHand - totalOverlappingQuantity;
              currentCache[cacheKey] = availableStock;
              hasChanges = true;
            } catch (error) {
              console.error('Error calculating available stock for item:', item.id, error);
              currentCache[cacheKey] = originalOnHand;
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges) {
        setAvailableStockCache(currentCache);
      }
    };

    calculateForNewItems();
  }, [items.length, dateFrom, dateTo]); // Only depend on items count and date range

  const fetchOriginalOnHand = async (inventoryItemId: number, size: string) => {
    try {
      const response = await fetch(
        `/api/inventory/original-onhand?inventoryItemId=${inventoryItemId}&size=${encodeURIComponent(size)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.originalOnHand || 0;
      }
    } catch (error) {
      console.error('Error fetching original on-hand:', error);
    }
    return 0;
  };

  const fetchOverlappingOrders = async (inventoryItemId: number, size: string) => {
    try {
      if (!dateFrom || !dateTo) return [] as OverlappingOrder[];

      const response = await fetch(
        `/api/orders/overlapping?inventoryItemId=${inventoryItemId}&size=${encodeURIComponent(size)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.orders || [];
      }
    } catch (error) {
      console.error('Error fetching overlapping orders:', error);
    }
    return [] as OverlappingOrder[];
  };

  // Calculate available stock for all items when date range changes
  useEffect(() => {
    const calculateAllAvailableStock = async () => {
      if (!dateFrom || !dateTo || items.length === 0) return;

      const newCache: Record<string, number> = {};

      for (const item of items) {
        if (
          item.inventoryItemId &&
          (typeof item.inventoryItemId === 'number' || typeof item.inventoryItemId === 'string')
        ) {
          const inventoryItemId =
            typeof item.inventoryItemId === 'string'
              ? parseInt(item.inventoryItemId, 10)
              : item.inventoryItemId;
          if (isNaN(inventoryItemId)) {
            continue;
          }

          const originalOnHand = (item as { onHand?: number }).onHand || 0;
          const cacheKey = `${inventoryItemId}-${item.size}`;

          try {
            const overlappingOrders = await fetchOverlappingOrders(inventoryItemId, item.size);
            const totalOverlappingQuantity = overlappingOrders.reduce(
              (sum: number, order: OverlappingOrder) => sum + order.quantity,
              0
            );
            const availableStock = originalOnHand - totalOverlappingQuantity;
            newCache[cacheKey] = availableStock;
          } catch (error) {
            console.error('Error calculating available stock for item:', item.id, error);
            newCache[cacheKey] = originalOnHand;
          }
        }
      }

      setAvailableStockCache(newCache);
    };

    calculateAllAvailableStock();
  }, [dateFrom, dateTo]); // Removed items from dependency array

  const handleShowImpact = async (item: OrderItem) => {
    if (!item.inventoryItemId) return;

    const originalOnHand = await fetchOriginalOnHand(item.inventoryItemId, item.size);

    setImpactModal({
      isOpen: true,
      overlappingOrders: [],
      itemName: item.name,
      size: item.size,
      originalOnHand,
      isLoading: true,
    });

    const overlappingOrders = await fetchOverlappingOrders(item.inventoryItemId, item.size);
    setImpactModal((prev) => ({ ...prev, overlappingOrders, isLoading: false }));
  };

  return (
    <>
      <div className="space-y-2">
        {items.map((item: OrderItem, index: number) => {
          if (item.isCustom) {
            const customKey = item.name + '_' + item.price;
            const isSelected = selectedItemId === String(item.id);
            return (
              <div
                key={customKey}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-3 cursor-pointer rounded ${isSelected ? 'bg-gray-800' : 'bg-gray-900'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item);
                }}
              >
                <div className="flex items-start gap-3 min-w-0 w-full sm:flex-1">
                  <button
                    type="button"
                    className="w-12 h-12 rounded-md bg-gray-700 overflow-hidden shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview({ url: '/no-image.png', title: item.name, id: customKey });
                    }}
                    title="Xem ảnh lớn"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={'/no-image.png'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">Tùy chỉnh</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 w-full sm:w-auto flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuantityChange(String(item.id), -1);
                      }}
                      aria-label="Giảm số lượng"
                    >
                      <span className="text-lg">-</span>
                    </button>
                    <span className="w-8 text-center font-bold text-white select-none">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuantityChange(String(item.id), 1);
                      }}
                      aria-label="Tăng số lượng"
                    >
                      <span className="text-lg">+</span>
                    </button>
                    <span className="text-sm text-gray-400">x</span>
                  </div>
                  <div className="font-bold text-green-400 text-right sm:min-w-[90px]">
                    {item.price.toLocaleString('vi-VN')}₫
                  </div>
                </div>
              </div>
            );
          }

          let inv: InventoryItem | null = null;
          if (item.inventoryItemId && typeof item.inventoryItemId === 'number') {
            inv =
              inventory.find(
                (invItem) => invItem.id.toString() === item.inventoryItemId!.toString()
              ) || null;
          } else {
            // For items without inventoryItemId, try to find by formattedId or name
            inv =
              inventory.find(
                (invItem) => invItem.formattedId === item.name || invItem.name === item.name
              ) || null;
          }
          const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();
          const invSize = inv?.sizes.find((s) => normalize(s.title) === normalize(item.size));

          // Calculate available stock by subtracting overlapping orders from original on-hand
          let availableStock = 0;
          if (
            item.inventoryItemId &&
            (typeof item.inventoryItemId === 'number' || typeof item.inventoryItemId === 'string')
          ) {
            // Parse inventoryItemId if it's a string
            const inventoryItemId =
              typeof item.inventoryItemId === 'string'
                ? parseInt(item.inventoryItemId, 10)
                : item.inventoryItemId;

            if (!isNaN(inventoryItemId)) {
              // Use the stored onHand as original on-hand
              const originalOnHand =
                (item as { onHand?: number }).onHand ||
                (invSize ? parseInt(invSize.onHand.toString(), 10) : 0);

              // Use cached available stock if available, otherwise show original on-hand
              const cacheKey = `${inventoryItemId}-${item.size}`;
              availableStock =
                availableStockCache[cacheKey] !== undefined
                  ? availableStockCache[cacheKey]
                  : originalOnHand;
            } else {
              // Fallback to inventory lookup for items without valid inventoryItemId
              availableStock = invSize ? parseInt(invSize.onHand.toString(), 10) : 0;
            }
          } else {
            // Fallback to inventory lookup for items without inventoryItemId
            availableStock = invSize ? parseInt(invSize.onHand.toString(), 10) : 0;
          }
          const showWarning = item.quantity > availableStock;
          const isSelected = selectedItemId === String(item.id);
          const imageUrl = ((): string => {
            const fromItem = (item as { imageUrl?: string | null }).imageUrl;
            if (fromItem) return fromItem;
            const fromInv = inv && (inv as { imageUrl?: string }).imageUrl;
            return fromInv || '/no-image.png';
          })();
          const invDisplayId = String(inv?.formattedId || inv?.id || item.id);
          return (
            <div
              key={`${item.id}-${index}`}
              className={`grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-4 py-3 cursor-pointer rounded ${isSelected ? 'bg-gray-800' : 'bg-gray-900'}`}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item);
              }}
            >
              <div className="col-span-2 sm:flex-1 flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="w-12 h-12 rounded overflow-hidden bg-gray-700 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview({ url: imageUrl, title: item.name, id: invDisplayId });
                  }}
                  title="Xem ảnh lớn"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/no-image.png';
                    }}
                  />
                </button>
                <div className="min-w-0">
                  <div className="font-semibold text-white break-words">{item.name}</div>
                  <div className="flex items-center gap-2 mt-1 pr-2">
                    <span className="text-xs font-mono text-blue-300 bg-gray-800 rounded px-2 py-0.5 break-all">
                      {item.id}
                    </span>
                    <span className="text-xs text-gray-400">
                      Size: <span className="font-bold">{item.size}</span>
                    </span>
                    <span className="text-xs text-gray-400 ml-2 flex items-center gap-1">
                      Tồn kho: <span className="font-bold text-yellow-300">{availableStock}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowImpact(item);
                        }}
                        className="w-4 h-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold flex items-center justify-center transition-colors ml-1"
                        title="Xem tác động đến tồn kho"
                      >
                        ?
                      </button>
                    </span>
                  </div>
                  {showWarning && (
                    <div className="mt-1">
                      <span className="text-xs font-bold text-red-500 bg-red-100 bg-opacity-10 px-2 py-0.5 rounded">
                        Cảnh báo: vượt quá số lượng tồn kho
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 sm:mt-0 w-full sm:w-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(String(item.id), -1);
                    }}
                    aria-label="Giảm số lượng"
                  >
                    <span className="text-lg">-</span>
                  </button>
                  <span className="w-8 text-center font-bold text-white select-none">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(String(item.id), 1);
                    }}
                    aria-label="Tăng số lượng"
                  >
                    <span className="text-lg">+</span>
                  </button>
                  <span className="text-sm text-gray-400">x</span>
                </div>
                <div className="font-bold text-green-400 min-w-[90px] text-right">
                  {item.price.toLocaleString('vi-VN')}₫
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ImpactModal
        isOpen={impactModal.isOpen}
        onClose={() =>
          setImpactModal({
            isOpen: false,
            overlappingOrders: [],
            itemName: '',
            size: '',
            originalOnHand: 0,
            isLoading: false,
          })
        }
        overlappingOrders={impactModal.overlappingOrders}
        itemName={impactModal.itemName}
        size={impactModal.size}
        dateFrom={dateFrom || ''}
        dateTo={dateTo || ''}
        originalOnHand={impactModal.originalOnHand}
        isLoading={impactModal.isLoading}
      />

      {preview && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="float-right text-gray-400 hover:text-white text-2xl"
              onClick={() => setPreview(null)}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-lg sm:text-xl font-bold text-white mb-3 text-center truncate">
              {preview.title}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.title}
              className="w-full h-80 object-contain rounded bg-gray-700 border border-gray-800"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.src = '/no-image.png';
              }}
            />
            {preview.id && (
              <div className="mt-2 text-center text-xs text-blue-300 font-mono">{preview.id}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderStep3AddedItemsList;
