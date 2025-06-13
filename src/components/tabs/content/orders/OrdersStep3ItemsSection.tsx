import React from 'react';
import { OrderItem } from './types';
import { useInventoryFetch, useOrderStep3ItemsLogic } from './hooks';
import OrderStep3AddItemInput from './OrderStep3AddItemInput';
import OrderStep3SearchResultsModal from './OrderStep3SearchResultsModal';
import OrderStep3SizeSelectModal from './OrderStep3SizeSelectModal';
import OrderStep3DeleteConfirmModal from './OrderStep3DeleteConfirmModal';
import OrderStep3AddedItemsList from './OrderStep3AddedItemsList';

interface OrdersStep3ItemsSectionProps {
  orderItems: OrderItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
}

const OrdersStep3ItemsSection: React.FC<OrdersStep3ItemsSectionProps> = ({
  orderItems,
  setOrderItems,
}) => {
  const { inventory, inventoryLoading, inventoryError } = useInventoryFetch();
  const logic = useOrderStep3ItemsLogic(orderItems, setOrderItems, inventory);

  if (inventoryLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-400 text-lg">
        Đang tải dữ liệu kho...
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
    <div className="flex-1 bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 min-h-[400px] flex flex-col gap-4">
      <OrderStep3AddItemInput
        value={logic.itemIdInput}
        onChange={logic.handleInputChange}
        onKeyDown={logic.handleKeyDown}
        onAdd={logic.handleAddItem}
        error={logic.addError}
        loading={logic.adding}
      />
      <OrderStep3SearchResultsModal
        show={logic.showSearchResults}
        items={logic.currentItems}
        totalPages={logic.totalPages}
        currentPage={logic.currentPage}
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
        items={orderItems}
        onQuantityChange={logic.handleQuantityChange}
        onDelete={(item) => {
          logic.setItemToDelete(item);
          logic.setShowDeleteModal(true);
        }}
      />
    </div>
  );
};

export default OrdersStep3ItemsSection;
