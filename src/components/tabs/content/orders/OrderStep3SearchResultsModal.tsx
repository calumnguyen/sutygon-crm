import React from 'react';
import { InventoryItem } from '@/types/inventory';

interface OrderStep3SearchResultsModalProps {
  show: boolean;
  items: InventoryItem[];
  totalPages: number;
  currentPage: number;
  loading?: boolean;
  onClose: () => void;
  onItemClick: (item: InventoryItem) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const OrderStep3SearchResultsModal: React.FC<OrderStep3SearchResultsModalProps> = ({
  show,
  items,
  totalPages,
  currentPage,
  loading = false,
  onClose,
  onItemClick,
  onPrevPage,
  onNextPage,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl shadow-2xl border border-gray-700 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="text-xl font-bold text-blue-400 mb-4">Kết quả tìm kiếm</div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span>Đang tìm kiếm...</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              Không tìm thấy sản phẩm nào
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg mb-2 text-left transition-colors"
                onClick={() => onItemClick(item)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      <span className="font-mono text-blue-300">{item.formattedId}</span>
                      {item.tags.length > 0 && (
                        <span className="ml-2">
                          {item.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full mr-1"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">{item.sizes.length} size</div>
                </div>
              </button>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-700">
            <button
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onPrevPage}
              disabled={currentPage === 1}
            >
              Trước
            </button>
            <span className="text-gray-400">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStep3SearchResultsModal;
