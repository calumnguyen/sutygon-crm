import React from 'react';
import { InventoryItem } from '@/types/inventory';
import { formatPriceVND } from './InventoryUtils';
import Button from '@/components/common/dropdowns/Button';
import { Edit, Eye } from 'lucide-react';

interface InventoryGridProps {
  filteredInventory: InventoryItem[];
  setPreviewOpen: (item: InventoryItem) => void;
  handleEditItem: (item: InventoryItem) => void;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({
  filteredInventory,
  setPreviewOpen,
  handleEditItem,
}) => {
  if (filteredInventory.length === 0) {
    return <div className="text-center text-gray-400 py-10">Chưa có sản phẩm nào trong kho.</div>;
  }
  return (
    <div className="p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {filteredInventory.map((item) => (
        <div
          key={item.id}
          className="bg-gray-900 rounded-lg shadow border border-gray-700 flex flex-col items-center p-3 w-full min-w-0 hover:border-gray-600 transition-colors"
        >
          <div className="relative w-full">
            <img
              src={item.imageUrl || '/no-image.png'}
              alt={item.name}
              className="w-20 h-24 sm:w-24 sm:h-32 object-contain rounded bg-gray-700 border border-gray-800 mb-2 cursor-pointer hover:opacity-80 transition mx-auto"
              onClick={() => setPreviewOpen(item)}
              onError={(e) => {
                // Fallback to no-image if the image fails to load
                const target = e.target as HTMLImageElement;
                target.src = '/no-image.png';
              }}
            />
            <div className="absolute top-0 right-0 flex gap-1">
              <Button
                variant="secondary"
                onClick={() => setPreviewOpen(item)}
                className="p-1 w-6 h-6"
                title="Xem trước sản phẩm"
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleEditItem(item)}
                className="p-1 w-6 h-6"
                title="Chỉnh sửa sản phẩm"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="w-full flex flex-col items-center mb-2">
            <span className="font-mono text-xs text-gray-400 mb-1">{item.formattedId}</span>
            <h3 className="text-sm sm:text-base font-bold text-white text-center w-full truncate mb-1">
              {item.name}
            </h3>
          </div>
          {/* Inventory & Price Table */}
          <div className="w-full mb-2 overflow-x-auto">
            <div className="grid grid-cols-4 text-xs text-gray-400 mb-1 min-w-max">
              <span className="font-semibold">Size</span>
              <span className="font-semibold">Tồn</span>
              <span className="font-semibold">Còn</span>
              <span className="font-semibold">Giá</span>
            </div>
            <div className="flex flex-col gap-1">
              {item.sizes.map((size) => (
                <div key={size.title} className="grid grid-cols-4 text-xs text-gray-200 min-w-max">
                  <span className="font-mono whitespace-nowrap text-ellipsis overflow-hidden">
                    {size.title}
                  </span>
                  <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                    {size.quantity}
                  </span>
                  <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                    {size.onHand}
                  </span>
                  <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                    {formatPriceVND(size.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Move tags and category to the bottom for consistency */}
          <div className="flex flex-col gap-1 w-full mt-auto">
            <div className="flex flex-wrap gap-1 w-full justify-center mb-1">
              {item.tags.map((tag, index) => (
                <span key={index} className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
            <div className="w-full text-xs text-gray-400 text-center">
              Danh mục: <span className="text-gray-200">{item.category}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryGrid;
