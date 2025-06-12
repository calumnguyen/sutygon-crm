import React from 'react';
import Button from '@/components/common/dropdowns/Button';
import { InventoryItem } from '@/types/inventory';

interface InventoryPreviewModalProps {
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  filteredInventory: InventoryItem[];
  imageUrl: string;
}

const InventoryPreviewModal: React.FC<InventoryPreviewModalProps> = ({
  previewOpen,
  setPreviewOpen,
  filteredInventory,
  imageUrl,
}) => {
  if (!previewOpen || filteredInventory.length === 0) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {filteredInventory[0].name}
        </h2>
        <img
          src={imageUrl}
          alt={filteredInventory[0].name}
          className="w-60 h-80 object-contain rounded-lg bg-gray-700 border border-gray-800 mb-6"
        />
        <Button variant="secondary" onClick={() => setPreviewOpen(false)} type="button">
          Đóng
        </Button>
      </div>
    </div>
  );
};

export default InventoryPreviewModal;
