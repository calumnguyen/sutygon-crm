import React from 'react';
import { OrderItem, Discount } from './types';

interface OrderVATSectionProps {
  orderItems: OrderItem[];
  discounts: Discount[];
  vatRate: number;
}

const OrderVATSection: React.FC<OrderVATSectionProps> = ({ orderItems, discounts, vatRate }) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalDiscountAmount = discounts.reduce(
    (total, discount) => total + Number(discount.discountAmount),
    0
  );
  const subtotalAfterDiscount = totalAmount - totalDiscountAmount;
  const vatAmount = Math.round(subtotalAfterDiscount * (vatRate / 100));

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <span className="text-white font-bold text-lg">%</span>
        </div>
        <h2 className="text-xl font-bold text-white">VAT</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Amount */}
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <div className="text-center">
            <div className="text-gray-400 text-xs mb-2">1</div>
            <h3 className="text-white font-bold text-sm mb-2">Tổng tiền</h3>
            <p className="text-gray-300 text-xs mb-3">Tổng tiền sản phẩm</p>
            <div className="text-white font-bold text-lg">{formatCurrency(totalAmount)}</div>
          </div>
        </div>

        {/* Card 2: Minus Discounts */}
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 relative">
          <div className="absolute -top-3 -left-3 bg-red-600 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">
            -
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs mb-2">2</div>
            <h3 className="text-white font-bold text-sm mb-2">Giảm giá</h3>
            <p className="text-gray-300 text-xs mb-3">Tổng giảm giá</p>
            <div className="text-red-400 font-bold text-lg">
              {formatCurrency(totalDiscountAmount)}
            </div>
          </div>
        </div>

        {/* Card 3: VAT Rate */}
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 relative">
          <div className="absolute -top-3 -left-3 bg-blue-600 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">
            ×
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs mb-2">3</div>
            <h3 className="text-white font-bold text-sm mb-2">Tỷ lệ VAT</h3>
            <p className="text-gray-300 text-xs mb-3">Thuế giá trị gia tăng</p>
            <div className="bg-blue-600 text-white text-lg px-4 py-2 rounded-md font-bold">
              {vatRate}%
            </div>
          </div>
        </div>
      </div>

      {/* VAT Result Card */}
      <div className="mt-6 p-[2px] rounded-xl bg-gradient-to-r from-blue-500 to-green-500">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base">Thuế VAT</h3>
              <p className="text-gray-400 text-xs">{orderItems.length} sản phẩm</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">
                <span className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
                  {formatCurrency(vatAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderVATSection;
