import React from 'react';
import { OrderItem } from './types';
import { InventoryItem } from '@/types/inventory';

interface OrderStep3AddedItemsListProps {
  items: OrderItem[];
  onQuantityChange: (id: string, delta: number) => void;
  onDelete: (item: OrderItem) => void;
  inventory: InventoryItem[];
  onItemClick: (item: OrderItem) => void;
  selectedItemId?: string | null;
}

const OrderStep3AddedItemsList: React.FC<OrderStep3AddedItemsListProps> = ({
  items,
  onQuantityChange,
  onDelete,
  inventory,
  onItemClick,
  selectedItemId,
}) => (
  <div className="flex-1 bg-gray-900 rounded-lg p-4 shadow-inner border border-gray-700 mt-2 overflow-y-auto w-full">
    {items.length === 0 ? (
      <div className="text-base text-gray-400 text-center">Chưa có sản phẩm nào được thêm</div>
    ) : (
      <div className="divide-y divide-gray-800">
        {items.map((item: OrderItem) => {
          if (item.isCustom) {
            const customKey = item.name + '_' + item.price;
            const isSelected = selectedItemId === customKey;
            return (
              <div
                key={customKey}
                className={`flex items-center justify-between py-3 gap-4 cursor-pointer rounded ${isSelected ? 'bg-gray-800' : 'bg-gray-900'}`}
                onClick={() => onItemClick({ ...item, id: customKey })}
              >
                <div className="flex-1">
                  <div className="font-semibold text-white">{item.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(customKey, -1);
                    }}
                    aria-label="Giảm số lượng"
                  >
                    <span className="text-lg">-</span>
                  </button>
                  <span className="w-8 text-center font-bold text-white select-none">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(customKey, 1);
                    }}
                    aria-label="Tăng số lượng"
                  >
                    <span className="text-lg">+</span>
                  </button>
                  <span className="text-sm text-gray-400">x</span>
                </div>
                <div className="font-bold text-green-400 min-w-[90px] text-right">
                  {item.price.toLocaleString('vi-VN')}₫
                </div>
              </div>
            );
          }
          // Inventory item (default)
          const invId = item.id.replace('-' + item.size, '');
          const inv = inventory.find(
            (invItem) => (invItem.formattedId || invItem.id) === invId || invItem.id === invId
          );
          const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();
          const invSize = inv?.sizes.find((s) => normalize(s.title) === normalize(item.size));
          const onHand = invSize ? Number(invSize.onHand) : 0;
          // Debug logging
          console.log('OrderItem:', item);
          console.log('InventoryItem:', inv);
          console.log(
            'Inventory sizes:',
            inv?.sizes.map((s) => s.title)
          );
          console.log('OrderItem.size:', item.size);
          console.log('Matched invSize:', invSize);
          console.log('onHand:', onHand);
          const showWarning = item.quantity > onHand;
          const isSelected = selectedItemId === item.id;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between py-3 gap-4 cursor-pointer rounded ${isSelected ? 'bg-gray-800' : 'bg-gray-900'}`}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item);
              }}
            >
              <div className="flex-1">
                <div className="font-semibold text-white">{item.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-blue-300 bg-gray-800 rounded px-2 py-0.5">
                    {item.id}
                  </span>
                  <span className="text-xs text-gray-400">
                    Size: <span className="font-bold">{item.size}</span>
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    Tồn kho: <span className="font-bold text-yellow-300">{onHand}</span>
                  </span>
                </div>
                {showWarning && (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-red-500 bg-red-100 bg-opacity-10 px-2 py-0.5 rounded">
                      Cảnh báo: vượt quá số lượng tồn kho
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuantityChange(item.id, -1);
                  }}
                  aria-label="Giảm số lượng"
                >
                  <span className="text-lg">-</span>
                </button>
                <span className="w-8 text-center font-bold text-white select-none">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuantityChange(item.id, 1);
                  }}
                  aria-label="Tăng số lượng"
                >
                  <span className="text-lg">+</span>
                </button>
                <span className="text-sm text-gray-400">x</span>
              </div>
              <div className="font-bold text-green-400 min-w-[90px] text-right">
                {item.price.toLocaleString('vi-VN')}₫
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default OrderStep3AddedItemsList;
