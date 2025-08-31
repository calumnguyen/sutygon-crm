import React from 'react';

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
  itemId: number;
  quantity: number;
  isSelected: boolean;
}

interface PickupConfirmationModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  orderItems?: OrderItem[];
  onItemPickupConfirm?: (selectedItems: ItemPickupSelection[]) => void;
}

export const PickupConfirmationModal: React.FC<PickupConfirmationModalProps> = ({
  show,
  onConfirm,
  onCancel,
  orderItems,
  onItemPickupConfirm,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Xác Nhận Nhận Hàng</h2>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-white text-base leading-relaxed">
              Khách hàng có nhận hàng ngay bây giờ không?
            </p>

            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-gray-300 text-sm">
                <span className="font-medium">Trạng thái đơn hàng:</span>{' '}
                <span className="text-blue-400 font-medium">Đang Xử Lý</span>
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Chưa Nhận
            </button>
            <button
              onClick={() => {
                // If we have order items and item pickup handler, show item selection
                if (orderItems && orderItems.length > 0 && onItemPickupConfirm) {
                  // Import and show ItemPickupSelectionModal
                  // For now, we'll call the original onConfirm and let the parent handle the item selection
                  onConfirm();
                } else {
                  onConfirm();
                }
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Đã Nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
