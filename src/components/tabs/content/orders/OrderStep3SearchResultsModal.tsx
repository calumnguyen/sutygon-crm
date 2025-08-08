import React, { useState } from 'react';
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
  const [previewItem, setPreviewItem] = useState<InventoryItem | null>(null);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
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
              <div
                key={item.id}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg mb-2 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="w-14 h-14 rounded-md overflow-hidden bg-gray-700 flex items-center justify-center shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      title="Xem ảnh lớn"
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-xs">No Image</div>
                      )}
                    </button>
                    <button className="min-w-0 text-left" onClick={() => onItemClick(item)}>
                      <div className="font-semibold text-white truncate">{item.name}</div>
                      <div className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-blue-300">{item.formattedId}</span>
                        {item.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-gray-700 text-gray-200 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  </div>
                  <div className="text-gray-400 whitespace-nowrap">
                    {item.sizes?.length || 0} size
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
            onClick={onPrevPage}
            disabled={currentPage <= 1}
          >
            Trang trước
          </button>
          <div className="text-gray-300 text-sm">
            Trang {currentPage} / {totalPages}
          </div>
          <button
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
            onClick={onNextPage}
            disabled={currentPage >= totalPages}
          >
            Trang sau
          </button>
        </div>

        {/* Preview Modal */}
        {previewItem && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="bg-gray-900 rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-2xl border border-gray-700 flex flex-col items-center max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="self-end text-gray-400 hover:text-white text-2xl"
                onClick={() => setPreviewItem(null)}
                aria-label="Đóng"
              >
                ×
              </button>
              <div className="text-lg sm:text-xl font-bold text-white mb-3 text-center truncate w-full">
                {previewItem.name}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewItem.imageUrl || '/no-image.png'}
                alt={previewItem.name}
                className="w-full h-80 object-contain rounded-lg bg-gray-700 border border-gray-800"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/no-image.png';
                }}
              />
              <div className="w-full text-center mt-3 text-xs text-gray-300">
                <div className="font-mono text-blue-300">{previewItem.formattedId}</div>
                <div className="mt-1">{previewItem.category}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStep3SearchResultsModal;
