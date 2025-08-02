import React, { useState } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { InventoryItem } from '@/types/inventory';

interface InventoryPreviewModalProps {
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  filteredInventory: InventoryItem[];
  selectedItem?: InventoryItem;
}

const InventoryPreviewModal: React.FC<InventoryPreviewModalProps> = ({
  previewOpen,
  setPreviewOpen,
  filteredInventory,
  selectedItem,
}) => {
  if (!previewOpen || !selectedItem) return null;

  const imageUrl = selectedItem.imageUrl || '/no-image.png';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-lg sm:max-w-md shadow-2xl border border-gray-700 flex flex-col items-center max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          {selectedItem.name}
        </h2>
        <img
          src={imageUrl}
          alt={selectedItem.name}
          className="w-full max-w-60 h-80 object-contain rounded-lg bg-gray-700 border border-gray-800 mb-4 sm:mb-6"
          onError={(e) => {
            // Fallback to no-image if the image fails to load
            const target = e.target as HTMLImageElement;
            target.src = '/no-image.png';
          }}
        />
        <div className="w-full text-center mb-4">
          <div className="text-sm text-gray-400 mb-2">Thông tin sản phẩm</div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>ID: {selectedItem.formattedId}</div>
            <div>Danh mục: {selectedItem.category}</div>
            <div>
              Tags: {selectedItem.tags.length > 0 ? selectedItem.tags.join(', ') : 'Không có'}
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setPreviewOpen(false)}
          type="button"
          className="w-full sm:w-auto"
        >
          Đóng
        </Button>
      </div>
    </div>
  );
};

export default InventoryPreviewModal;
