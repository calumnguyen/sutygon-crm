import React from 'react';
import { OrderItem } from './types';

interface OrderStep3AddedItemsListProps {
  items: OrderItem[];
  onQuantityChange: (id: string, delta: number) => void;
  onDelete: (item: OrderItem) => void;
}

const OrderStep3AddedItemsList: React.FC<OrderStep3AddedItemsListProps> = ({
  items,
  onQuantityChange,
  onDelete,
}) => (
  <div className="flex-1 bg-gray-900 rounded-lg p-4 shadow-inner border border-gray-700 mt-2 overflow-y-auto w-full">
    {items.length === 0 ? (
      <div className="text-base text-gray-400 text-center">Chưa có sản phẩm nào được thêm</div>
    ) : (
      <div className="divide-y divide-gray-800">
        {items.map((item: OrderItem) => (
          <div key={item.id} className="flex items-center justify-between py-3 gap-4">
            <div className="flex-1">
              <div className="font-semibold text-white">{item.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-blue-300 bg-gray-800 rounded px-2 py-0.5">
                  {item.id}
                </span>
                <span className="text-xs text-gray-400">
                  Size: <span className="font-bold">{item.size}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 border border-blue-500 text-blue-400 hover:bg-blue-700 transition-colors"
                onClick={() => {
                  if (item.quantity === 1) {
                    onDelete(item);
                  } else {
                    onQuantityChange(item.id, -1);
                  }
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
                onClick={() => onQuantityChange(item.id, 1)}
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
        ))}
      </div>
    )}
  </div>
);

export default OrderStep3AddedItemsList;
