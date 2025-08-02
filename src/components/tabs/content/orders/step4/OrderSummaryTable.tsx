import React from 'react';
import { OrderItem } from '../types';
import { InventoryItem } from '@/types/inventory';

/**
 * Order summary table for step 4.
 * @param orderItems Array of order items
 * @param inventory Array of inventory items for warning calculation
 */
export const OrderSummaryTable: React.FC<{
  orderItems: OrderItem[];
  inventory?: InventoryItem[];
}> = ({ orderItems, inventory = [] }) => {
  // Helper function to calculate warning for an item
  const calculateWarning = (item: OrderItem): string | undefined => {
    if (item.isCustom) return undefined;

    // Use the inventoryItemId if available, otherwise fall back to old logic
    let inv = null;
    if (item.inventoryItemId && typeof item.inventoryItemId === 'number') {
      inv = inventory.find((invItem) => invItem.id.toString() === item.inventoryItemId!.toString());
    } else {
      const invId = item.id.replace('-' + item.size, '');
      inv = inventory.find(
        (invItem) => (invItem.formattedId || invItem.id) === invId || invItem.id === invId
      );
    }

    if (!inv) return undefined;

    const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();
    const invSize = inv.sizes.find((s) => normalize(s.title) === normalize(item.size));
    const availableStock = invSize ? parseInt(invSize.onHand.toString(), 10) : 0;

    return item.quantity > availableStock ? 'Cảnh báo: vượt quá số lượng tồn kho' : undefined;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow mb-6">
      <div className="text-lg font-bold text-pink-400 mb-2 text-left">Chi tiết đơn hàng</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-1">Sản phẩm</th>
            <th className="text-left py-1">Size</th>
            <th className="text-center py-1">SL</th>
            <th className="text-right py-1">Đơn giá</th>
            <th className="text-right py-1">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {orderItems
            .filter((i) => !i.isExtension)
            .map((item) => (
              <tr key={item.id} className="border-b border-gray-700 last:border-0">
                <td className="py-1 text-white font-semibold flex items-center gap-2">
                  {item.name}
                  {calculateWarning(item) && (
                    <span className="relative group inline-block">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer ml-1">
                        Cảnh báo
                      </span>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs bg-black text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-pre-line pointer-events-none">
                        {calculateWarning(item)}
                      </span>
                    </span>
                  )}
                </td>
                <td className="py-1 text-gray-300">{item.size}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{item.price.toLocaleString('vi-VN')}</td>
                <td className="py-1 text-right text-green-400">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          {orderItems
            .filter((i) => i.isExtension)
            .map((item) => (
              <tr key={item.id} className="border-b border-gray-700 last:border-0">
                <td className="py-1 text-white font-semibold">{item.name || 'Gia hạn ngày trả'}</td>
                <td className="py-1 text-gray-300">-</td>
                <td className="py-1 text-center">1</td>
                <td className="py-1 text-right">
                  {item.price.toLocaleString('vi-VN')}
                  {item.feeType === 'percent' && item.percent !== undefined && (
                    <div className="text-xs text-gray-400">({item.percent}% của tổng đơn)</div>
                  )}
                </td>
                <td className="py-1 text-right text-green-400">
                  {item.price.toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="flex justify-end items-center gap-x-8 mt-4 text-base">
        <div className="text-gray-300 whitespace-nowrap">
          Tổng số sản phẩm:{' '}
          <span className="text-white font-bold">
            {orderItems.filter((i) => !i.isExtension).reduce((sum, i) => sum + i.quantity, 0)}
          </span>
        </div>
        <div className="text-gray-300 whitespace-nowrap">
          Tổng tiền:{' '}
          <span className="text-pink-400 font-bold text-lg">
            {orderItems.reduce((sum, i) => sum + i.quantity * i.price, 0).toLocaleString('vi-VN')}
          </span>{' '}
          đ
        </div>
      </div>
    </div>
  );
};
