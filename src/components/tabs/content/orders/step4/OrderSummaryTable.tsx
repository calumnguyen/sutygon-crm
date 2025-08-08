import React from 'react';
import { OrderItem } from '../types';
import { InventoryItem } from '@/types/inventory';

/**
 * Order summary table for step 4.
 * Mobile: stacked cards; Desktop: traditional table.
 */
export const OrderSummaryTable: React.FC<{
  orderItems: OrderItem[];
  inventory?: InventoryItem[];
}> = ({ orderItems, inventory = [] }) => {
  // Helper function to calculate warning for an item
  const calculateWarning = (item: OrderItem): string | undefined => {
    if (item.isCustom) return undefined;

    // Use the inventoryItemId if available, otherwise fall back to old logic
    let inv: InventoryItem | undefined;
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

  const regularItems = orderItems.filter((i) => !i.isExtension);
  const extensionItems = orderItems.filter((i) => i.isExtension);

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow mb-6">
      <div className="text-lg font-bold text-pink-400 mb-2 text-left">Chi tiết đơn hàng</div>

      {/* Mobile layout: stacked cards */}
      <div className="md:hidden space-y-3">
        {regularItems.map((item) => (
          <div key={item.id} className="rounded-lg bg-gray-900 border border-gray-700 p-3">
            <div className="text-white font-semibold break-words">{item.name}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-gray-400">Size</div>
              <div className="text-gray-200">{item.size}</div>
              <div className="text-gray-400">SL</div>
              <div className="text-gray-200">{item.quantity}</div>
              <div className="text-gray-400">Đơn giá</div>
              <div className="text-gray-200">{item.price.toLocaleString('vi-VN')}</div>
              <div className="text-gray-400">Thành tiền</div>
              <div className="text-green-400 font-semibold">
                {(item.price * item.quantity).toLocaleString('vi-VN')}
              </div>
            </div>
            {calculateWarning(item) && (
              <div className="mt-2 text-xs font-medium text-red-300">{calculateWarning(item)}</div>
            )}
          </div>
        ))}
        {extensionItems.map((item) => (
          <div key={item.id} className="rounded-lg bg-gray-900 border border-gray-700 p-3">
            <div className="text-white font-semibold">{item.name || 'Gia hạn ngày trả'}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-gray-400">SL</div>
              <div className="text-gray-200">1</div>
              <div className="text-gray-400">Phí</div>
              <div className="text-gray-200">
                {item.price.toLocaleString('vi-VN')}
                {item.feeType === 'percent' && item.percent !== undefined && (
                  <span className="block text-xs text-gray-400">
                    ({item.percent}% của tổng đơn)
                  </span>
                )}
              </div>
              <div className="text-gray-400">Thành tiền</div>
              <div className="text-green-400 font-semibold">
                {item.price.toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop layout: table */}
      <div className="hidden md:block overflow-x-auto">
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
            {regularItems.map((item) => (
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
            {extensionItems.map((item) => (
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
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2 sm:gap-x-8 mt-4 text-base">
        <div className="text-gray-300">
          Tổng số sản phẩm:{' '}
          <span className="text-white font-bold">
            {regularItems.reduce((sum, i) => sum + i.quantity, 0)}
          </span>
        </div>
        <div className="text-gray-300">
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
