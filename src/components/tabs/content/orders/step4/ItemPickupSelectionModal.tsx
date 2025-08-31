import React, { useState, useEffect, useCallback } from 'react';

interface OrderItem {
  id?: number;
  inventoryItemId?: number | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface ItemPickupSelection {
  itemId: number; // This will be the database order_items.id
  quantity: number;
  isSelected: boolean;
}

interface ItemPickupSelectionModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: ItemPickupSelection[], customerName?: string) => void;
  orderItems: OrderItem[];
  isLoading?: boolean;
}

export const ItemPickupSelectionModal: React.FC<ItemPickupSelectionModalProps> = ({
  show,
  onClose,
  onConfirm,
  orderItems,
  isLoading = false,
}) => {
  const [itemSelections, setItemSelections] = useState<ItemPickupSelection[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [previewItem, setPreviewItem] = useState<OrderItem | null>(null);
  const [customerName, setCustomerName] = useState('');

  // Initialize item selections when modal opens
  useEffect(() => {
    if (show && orderItems.length > 0) {
      // Filter out rental extension items (gia hạn thời gian thuê)
      const pickupItems = orderItems.filter(
        (item) => !item.name.toLowerCase().includes('gia hạn thời gian thuê')
      );

      const initialSelections: ItemPickupSelection[] = pickupItems
        .filter((item) => item.id !== undefined) // Filter out items without IDs
        .map((item) => {
          // Use the database ID directly - it should always be a number from actualOrderItems
          return {
            itemId: item.id!,
            quantity: item.quantity,
            isSelected: true, // Default to all selected
          };
        });

      // Debug logging outside of the map to avoid re-render issues
      console.log(
        'Initial selections setup:',
        initialSelections.map((sel, idx) => ({
          index: idx,
          itemId: sel.itemId,
          quantity: sel.quantity,
          isSelected: sel.isSelected,
        }))
      );
      setItemSelections(initialSelections);
      setSelectAll(pickupItems.length > 0);
    }
  }, [show, orderItems]);

  // Handle select all/deselect all
  const handleSelectAll = useCallback(() => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setItemSelections((prev) => prev.map((item) => ({ ...item, isSelected: newSelectAll })));
  }, [selectAll]);

  // Handle individual item selection
  const handleItemSelection = useCallback((itemId: number, isSelected: boolean) => {
    setItemSelections((prev) => {
      const updated = prev.map((item) => (item.itemId === itemId ? { ...item, isSelected } : item));

      // Update select all state based on individual selections
      const allSelected = updated.every((item) => item.isSelected);
      const noneSelected = updated.every((item) => !item.isSelected);
      setSelectAll(allSelected);

      return updated;
    });
  }, []);

  // Handle quantity change for an item
  const handleQuantityChange = useCallback(
    (itemId: number, newQuantity: number) => {
      // Find item by database ID
      const item = orderItems.find((item) => item.id === itemId);
      if (!item || item.id === undefined) return;

      // Ensure quantity is within valid range
      const validQuantity = Math.max(1, Math.min(newQuantity, item.quantity));

      setItemSelections((prev) =>
        prev.map((selection) =>
          selection.itemId === itemId ? { ...selection, quantity: validQuantity } : selection
        )
      );
    },
    [orderItems]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!show) return;

      // Escape to close preview modal first, then main modal
      if (event.key === 'Escape') {
        if (previewItem) {
          setPreviewItem(null);
        } else {
          onClose();
        }
        return;
      }

      // Ctrl/Cmd + A for select all (only when preview is not open)
      if (!previewItem && (event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, handleSelectAll, onClose, previewItem]);

  // Get selected items for confirmation
  const getSelectedItems = useCallback(() => {
    return itemSelections.filter((item) => item.isSelected);
  }, [itemSelections]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const selectedItems = getSelectedItems();
    const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalSelectedQuantity === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để nhận hàng.');
      return;
    }

    if (!customerName || customerName.trim() === '') {
      alert('Vui lòng nhập tên khách hàng nhận hàng.');
      return;
    }

    onConfirm(selectedItems, customerName);
  }, [getSelectedItems, onConfirm]);

  if (!show) return null;

  // Filter out rental extension items for pickup tracking
  const pickupItems = orderItems.filter(
    (item) => !item.name.toLowerCase().includes('gia hạn thời gian thuê')
  );

  // Calculate based on quantities, not item count
  const selectedQuantity = itemSelections
    .filter((item) => item.isSelected)
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalQuantity = pickupItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-1 sm:p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-hidden border border-gray-600">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-600">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                Chọn Sản Phẩm Nhận Hàng
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm">
                {selectedQuantity}/{totalQuantity} sản phẩm
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectAll
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
                disabled={isLoading}
              >
                {selectAll ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-xl flex-shrink-0"
                disabled={isLoading}
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Customer Name Input */}
        <div className="p-3 sm:p-4 border-b border-gray-600">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tên khách hàng nhận hàng
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nhập tên khách hàng..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Items List */}
        <div className="p-2 sm:p-4 overflow-y-auto flex-1">
          {pickupItems.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Không có sản phẩm nào cần nhận hàng</p>
                <p className="text-gray-500 text-xs mt-1">Chỉ có các dịch vụ gia hạn</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {pickupItems
                .filter((item) => item.id !== undefined) // Filter out items without IDs
                .map((item) => {
                  // Use the database ID directly
                  const itemId = item.id!;
                  const selection = itemSelections.find((s) => s.itemId === itemId);
                  const isSelected = selection?.isSelected || false;
                  const pickupQuantity = selection?.quantity || 1;

                  return (
                    <div
                      key={itemId}
                      className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-900/20 border-blue-500'
                          : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => handleItemSelection(itemId, !isSelected)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Item Image */}
                        <div className="flex-shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewItem(item);
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium text-sm truncate">
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{item.size}</span>
                                <span>•</span>
                                <span>{item.price.toLocaleString('vi-VN')} đ</span>
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            <div className="flex items-center gap-2">
                              {isSelected && item.quantity > 1 && (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuantityChange(itemId, pickupQuantity - 1);
                                    }}
                                    disabled={pickupQuantity <= 1 || isLoading}
                                    className="w-6 h-6 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded flex items-center justify-center transition-colors text-sm"
                                  >
                                    −
                                  </button>
                                  <span className="text-white text-sm font-medium min-w-[20px] text-center">
                                    {pickupQuantity}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuantityChange(itemId, pickupQuantity + 1);
                                    }}
                                    disabled={pickupQuantity >= item.quantity || isLoading}
                                    className="w-6 h-6 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded flex items-center justify-center transition-colors text-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              {item.quantity > 1 && (
                                <span className="text-gray-400 text-xs">Max {item.quantity}</span>
                              )}
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-600 bg-gray-700/50 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-gray-300 text-xs sm:text-sm">
              {pickupItems.length === 0 ? (
                <span className="text-gray-400">Chỉ có dịch vụ gia hạn</span>
              ) : selectedQuantity > 0 ? (
                <span>{selectedQuantity} sản phẩm</span>
              ) : (
                <span className="text-yellow-400">Chọn ít nhất 1 sản phẩm</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition-colors"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={(pickupItems.length > 0 && selectedQuantity === 0) || isLoading}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  (pickupItems.length > 0 && selectedQuantity === 0) || isLoading
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? 'Đang xử lý...' : pickupItems.length === 0 ? 'Tiếp tục' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-600 flex flex-col">
            {/* Preview Header */}
            <div className="p-3 sm:p-4 border-b border-gray-600 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white font-medium text-base sm:text-lg truncate">
                  Xem trước sản phẩm
                </h3>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="text-gray-400 hover:text-white text-xl sm:text-2xl flex-shrink-0 p-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
              <div className="space-y-3 sm:space-y-4">
                {/* Image */}
                <div className="flex justify-center">
                  <img
                    src={previewItem.imageUrl}
                    alt={previewItem.name}
                    className="max-w-full max-h-48 sm:max-h-64 object-contain rounded-lg"
                  />
                </div>

                {/* Item Details */}
                <div className="space-y-2">
                  <div>
                    <h4 className="text-white font-medium text-base sm:text-lg">
                      {previewItem.name}
                    </h4>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      ID: {previewItem.id || previewItem.inventoryItemId || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs sm:text-sm">Kích thước:</span>
                      <p className="text-white font-medium text-sm sm:text-base">
                        {previewItem.size}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs sm:text-sm">Giá:</span>
                      <p className="text-white font-medium text-sm sm:text-base">
                        {previewItem.price.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 text-xs sm:text-sm">Số lượng:</span>
                      <p className="text-white font-medium text-sm sm:text-base">
                        {previewItem.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-600 flex-shrink-0">
              <button
                onClick={() => setPreviewItem(null)}
                className="w-full py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors text-sm sm:text-base"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
