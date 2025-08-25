import React, { useMemo } from 'react';
import { InventoryItem } from '@/types/inventory';
import Button from '@/components/common/dropdowns/Button';
import { Edit, Eye } from 'lucide-react';

interface InventoryTableProps {
  filteredInventory: InventoryItem[];
  setPreviewOpen: (item: InventoryItem) => void;
  handleEditItem: (item: InventoryItem) => void;
  lastElementRef?: (node: HTMLElement | null) => void;
  loadingMore?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
}

// Utility function to deduplicate sizes by title
const deduplicateSizes = (
  sizes: { title: string; quantity: number; onHand: number; price: number }[]
) => {
  const seen = new Set<string>();
  let duplicateCount = 0;

  const result = sizes.filter((size) => {
    if (seen.has(size.title)) {
      duplicateCount++;
      return false;
    }
    seen.add(size.title);
    return true;
  });

  // Log only once per item if duplicates were found, not per duplicate
  if (duplicateCount > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`Removed ${duplicateCount} duplicate size(s) from inventory item`);
  }

  return result;
};

const InventoryTable: React.FC<InventoryTableProps> = ({
  filteredInventory,
  setPreviewOpen,
  handleEditItem,
  lastElementRef,
  loadingMore,
  loadMore,
  hasMore,
}) => {


  // Memoize the inventory with deduplicated sizes to prevent recalculation on every render
  const processedInventory = useMemo(() => {
    return filteredInventory.map((item) => ({
      ...item,
      sizes: deduplicateSizes(item.sizes || []),
    }));
  }, [filteredInventory]);

  if (filteredInventory.length === 0) {
    return <div className="text-center text-gray-400 py-10">Chưa có sản phẩm nào trong kho.</div>;
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-sm">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Tên sản phẩm</th>
              <th className="px-4 py-3 text-left font-medium">Tồn kho</th>
              <th className="px-4 py-3 text-left font-medium">Danh mục</th>
              <th className="px-4 py-3 text-left font-medium">Tags</th>
              <th className="px-4 py-3 text-left font-medium">Giá</th>
              <th className="px-4 py-3 text-left font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {processedInventory.map((item, index) => {
              return (
                <tr
                  key={`${item.id}-${index}`}
                  className="text-white hover:bg-gray-700/50"
                  ref={index === filteredInventory.length - 1 ? lastElementRef : undefined}
                >
                  <td className="px-4 py-3 font-mono text-sm">{item.formattedId}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-400">Tổng số:</div>
                      <div className="flex gap-4 text-sm">
                        {item.sizes.map(
                          (
                            size: {
                              title: string;
                              quantity: number;
                              onHand: number;
                              price: number;
                            },
                            idx: number
                          ) => (
                            <span key={`${item.id}-${size.title}-quantity-${idx}`}>
                              {size.title}: {size.quantity}
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-2">Còn lại:</div>
                      <div className="flex gap-4 text-sm">
                        {item.sizes.map(
                          (
                            size: {
                              title: string;
                              quantity: number;
                              onHand: number;
                              price: number;
                            },
                            idx: number
                          ) => (
                            <span key={`${item.id}-${size.title}-onhand-${idx}`}>
                              {size.title}: {size.onHand}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">
                    {item.tags.length === 0 ? (
                      <span className="text-yellow-400 text-xs italic">
                        Chưa có tag. Thêm tag để quản lý sản phẩm tốt hơn.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {item.sizes.map(
                        (
                          size: { title: string; quantity: number; onHand: number; price: number },
                          idx: number
                        ) => (
                          <div
                            key={`${item.id}-${size.title}-price-${idx}`}
                            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0"
                            style={{ wordBreak: 'break-all' }}
                          >
                            <span className="text-gray-400 font-mono text-xs sm:text-sm break-all">
                              {size.title}:
                            </span>
                            <span className="text-xs sm:text-sm break-all">{size.price}</span>
                          </div>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setPreviewOpen(item)}
                        className="p-2"
                        title="Xem trước sản phẩm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleEditItem(item)}
                        className="p-2"
                        title="Chỉnh sửa sản phẩm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-4">
        {processedInventory.map((item) => {
          return (
            <div key={item.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{item.formattedId}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-sm text-gray-300">{item.category}</span>
                  </div>
                  <h3 className="text-white font-semibold truncate">{item.name}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPreviewOpen(item)}
                    className="p-2 flex-shrink-0"
                    title="Xem trước sản phẩm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleEditItem(item)}
                    className="p-2 flex-shrink-0"
                    title="Chỉnh sửa sản phẩm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Inventory Info */}
              <div className="mb-3">
                <div className="text-sm text-gray-400 mb-2">Tồn kho:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.sizes.map(
                    (
                      size: { title: string; quantity: number; onHand: number; price: number },
                      idx: number
                    ) => (
                      <div
                        key={`${item.id}-${size.title}-inventory-${idx}`}
                        className="bg-gray-800 rounded p-2"
                      >
                        <div className="font-medium text-gray-200">{size.title}</div>
                        <div className="text-xs text-gray-400">
                          Tổng: {size.quantity} | Còn: {size.onHand}
                        </div>
                        <div className="text-xs text-blue-400 font-mono">{size.price}</div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-3">
                {item.tags.length === 0 ? (
                  <span className="text-yellow-400 text-xs italic">
                    Chưa có tag. Thêm tag để quản lý sản phẩm tốt hơn.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading indicator for infinite scroll */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="text-blue-400 text-sm">Đang tải thêm...</div>
        </div>
      )}

      {/* Manual load more button for mobile fallback */}
      {hasMore && !loadingMore && loadMore && (
        <div className="flex items-center justify-center py-4">
          <Button
            variant="secondary"
            onClick={loadMore}
            className="px-6 py-2 text-sm"
            disabled={loadingMore}
          >
            {loadingMore ? 'Đang tải...' : 'Tải thêm'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
