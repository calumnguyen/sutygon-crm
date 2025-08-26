import React, { useState, useEffect } from 'react';
import { OrderItem } from './types';
import { useInventoryFetch, useOrderStep3ItemsLogic } from './hooks';
import OrderStep3AddItemInput from './OrderStep3AddItemInput';
import OrderStep3SearchResultsModal from './OrderStep3SearchResultsModal';
import OrderStep3SizeSelectModal from './OrderStep3SizeSelectModal';
import OrderStep3DeleteConfirmModal from './OrderStep3DeleteConfirmModal';
import OrderStep3AddedItemsList from './OrderStep3AddedItemsList';
import InventoryLoading from '@/components/common/InventoryLoading';

interface OrdersStep3ItemsSectionProps {
  orderItems: OrderItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  onItemClick: (item: OrderItem) => void;
  selectedItemId?: string | null;
  date?: string;
}

const OrdersStep3ItemsSection: React.FC<OrdersStep3ItemsSectionProps> = ({
  orderItems,
  setOrderItems,
  onItemClick,
  selectedItemId,
  date,
}) => {
  // Calculate date range for inventory (order date to expected return date)
  // Parse date from dd/MM/yyyy format
  const parseDateFromString = (dateStr: string): Date => {
    if (!dateStr || dateStr.length !== 10) return new Date();
    const [day, month, year] = dateStr.split('/').map(Number);

    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed

    return parsedDate;
  };

  const orderDate = date ? parseDateFromString(date) : new Date();

  // Calculate total rental days including extension
  const extensionItem = orderItems.find((item) => item.isExtension);
  const extraDays = extensionItem?.extraDays || 0;
  const totalRentalDays = 3 + extraDays; // Base 3 days + extension days

  const expectedReturnDate = new Date(
    orderDate.getTime() + (totalRentalDays - 1) * 24 * 60 * 60 * 1000
  ); // +totalRentalDays-1 days

  const { inventory, inventoryLoading, inventoryError } = useInventoryFetch(
    orderDate.toISOString(),
    expectedReturnDate.toISOString()
  );

  const logic = useOrderStep3ItemsLogic(orderItems, setOrderItems, inventory);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customError, setCustomError] = useState('');

  // Helper: split regular and extension items
  const regularItems = orderItems.filter((item) => !item.isExtension);

  // Robust handler: only event-driven state updates
  const handleQuantityChange = (id: string, delta: number) => {
    const item = orderItems.find((i) => i.id === id);
    if (!item) return;
    if (item.quantity === 1 && delta === -1) {
      logic.setItemToDelete(item);
      logic.setShowDeleteModal(true);
      return;
    }
    logic.handleQuantityChange(id, delta);
  };

  const handleDelete = (item: OrderItem) => {
    logic.setItemToDelete(item);
    logic.setShowDeleteModal(true);
  };

  if (inventoryLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <InventoryLoading />
      </div>
    );
  }
  if (inventoryError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-lg">
        {inventoryError}
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg border border-gray-700 min-h-[400px] flex flex-col gap-3 sm:gap-4">
      <OrderStep3AddItemInput
        value={logic.itemIdInput}
        onChange={logic.handleInputChange}
        onKeyDown={logic.handleKeyDown}
        onAdd={logic.handleAddItem}
        error={logic.addError}
        loading={logic.adding}
        renderCustomButton={
          <div className="flex items-center justify-center w-full mt-2 gap-2">
            <span className="text-gray-400 text-sm">hoặc</span>
            <button
              className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-sm"
              onClick={() => setShowCustomModal(true)}
              type="button"
            >
              Thêm sản phẩm ngoài kho
            </button>
          </div>
        }
      />
      <OrderStep3SearchResultsModal
        show={logic.showSearchResults}
        items={logic.currentItems}
        totalPages={logic.totalPages}
        currentPage={logic.currentPage}
        loading={logic.searching}
        onClose={() => logic.setShowSearchResults(false)}
        onItemClick={logic.handleSearchResultClick}
        onPrevPage={() => logic.setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => logic.setCurrentPage((p) => Math.min(logic.totalPages, p + 1))}
      />
      <OrderStep3SizeSelectModal
        show={logic.showSizeModal}
        sizeOptions={logic.sizeOptions}
        onSelect={logic.handleSelectSize}
        onClose={() => logic.setShowSizeModal(false)}
      />
      <OrderStep3DeleteConfirmModal
        show={logic.showDeleteModal}
        item={logic.itemToDelete}
        onConfirm={logic.handleConfirmDelete}
        onCancel={logic.handleCancelDelete}
      />
      <OrderStep3AddedItemsList
        items={regularItems}
        onQuantityChange={handleQuantityChange}
        onDelete={handleDelete}
        inventory={inventory}
        onItemClick={onItemClick}
        selectedItemId={typeof selectedItemId !== 'undefined' ? selectedItemId : null}
        dateFrom={orderDate.toISOString()}
        dateTo={expectedReturnDate.toISOString()}
      />

      {/* Special Extension Item Section */}
      {extensionItem && (
        <div className="bg-gray-900 rounded-lg p-4 shadow-inner border border-gray-700 mt-2 w-full">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold text-white">{extensionItem.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-center font-bold text-white select-none">1</span>
            </div>
            <div className="flex flex-col items-end min-w-[90px] text-right">
              <span className="font-bold text-green-400 text-lg">
                {extensionItem.price.toLocaleString('vi-VN')}₫
              </span>
              {extensionItem.feeType === 'percent' && extensionItem.percent !== undefined && (
                <span className="text-xs text-gray-400 mt-1">
                  {extensionItem.percent}% của tổng đơn hàng
                </span>
              )}
            </div>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
              onClick={() => {
                logic.setItemToDelete(extensionItem);
                logic.setShowDeleteModal(true);
              }}
              aria-label="Xoá gia hạn"
            >
              <span className="text-lg">-</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Item Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setShowCustomModal(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-yellow-400 mb-2">Thêm sản phẩm ngoài kho</div>
            <div className="text-sm text-red-400 mb-4 text-center font-semibold">
              Bạn sẽ không thể theo dõi sản phẩm không có trong kho và số lượng tồn kho hoặc các đơn
              hàng trùng lặp.
            </div>
            <div className="w-full flex flex-col gap-3 items-center mb-2">
              <input
                type="text"
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Tên sản phẩm"
              />
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Giá sản phẩm (VND)"
              />
              {customError && <div className="text-red-400 text-sm mt-1">{customError}</div>}
              <div className="flex gap-4 mt-2">
                <button
                  className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                  onClick={() => setShowCustomModal(false)}
                >
                  Huỷ
                </button>
                <button
                  className="px-6 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                  onClick={() => {
                    setCustomError('');
                    if (!customName.trim()) {
                      setCustomError('Vui lòng nhập tên sản phẩm');
                      return;
                    }
                    if (!customPrice || isNaN(Number(customPrice)) || Number(customPrice) < 0) {
                      setCustomError('Vui lòng nhập giá sản phẩm hợp lệ');
                      return;
                    }
                    const customId = customName.trim() + '_' + customPrice;
                    setOrderItems((prev) => [
                      ...prev,
                      {
                        id: customId,
                        name: customName.trim(),
                        size: '',
                        quantity: 1,
                        price: Number(customPrice),
                        isCustom: true,
                      },
                    ]);
                    setShowCustomModal(false);
                    setCustomName('');
                    setCustomPrice('');
                  }}
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersStep3ItemsSection;
