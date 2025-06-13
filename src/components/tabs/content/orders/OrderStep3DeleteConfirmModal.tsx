import React from 'react';
import { OrderItem } from './types';

interface OrderStep3DeleteConfirmModalProps {
  show: boolean;
  item: OrderItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const OrderStep3DeleteConfirmModal: React.FC<OrderStep3DeleteConfirmModalProps> = ({
  show,
  item,
  onConfirm,
  onCancel,
}) => {
  if (!show || !item) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onCancel}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="text-xl font-bold text-red-400 mb-4">Xoá sản phẩm khỏi đơn hàng?</div>
        <div className="text-white text-base mb-6">
          Bạn có chắc chắn muốn xoá <span className="font-bold">{item.name}</span> ({item.id}) khỏi
          đơn hàng không?
        </div>
        <div className="flex gap-4">
          <button
            className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
            onClick={onConfirm}
          >
            Xoá
          </button>
          <button
            className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold"
            onClick={onCancel}
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderStep3DeleteConfirmModal;
