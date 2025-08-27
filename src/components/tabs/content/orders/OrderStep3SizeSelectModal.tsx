import React from 'react';
import { ItemSize } from './types';

interface OrderStep3SizeSelectModalProps {
  show: boolean;
  sizeOptions: ItemSize[];
  onSelect: (size: ItemSize) => void;
  onClose: () => void;
}

const OrderStep3SizeSelectModal: React.FC<OrderStep3SizeSelectModalProps> = ({
  show,
  sizeOptions,
  onSelect,
  onClose,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="text-xl font-bold text-blue-400 mb-4">Chọn size cho sản phẩm</div>
        <div className="flex flex-col gap-3 w-full">
          {sizeOptions.map((s: ItemSize, index: number) => (
            <button
              key={`${s.size}-${s.price}-${index}`}
              className="w-full py-3 rounded-lg bg-gray-800 hover:bg-blue-700 text-white font-semibold border border-blue-500 mb-1 transition-colors"
              onClick={() => onSelect(s)}
            >
              Size {s.size} - {s.price.toLocaleString('vi-VN')}₫
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderStep3SizeSelectModal;
