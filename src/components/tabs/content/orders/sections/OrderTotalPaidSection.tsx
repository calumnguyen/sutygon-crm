import React from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface OrderTotalPaidSectionProps {
  totalPaid: number;
  totalAmount: number;
  depositAmount: number;
  discounts: Array<{ discountAmount: number }>;
  vatRate: number;
}

const OrderTotalPaidSection: React.FC<OrderTotalPaidSectionProps> = ({
  totalPaid,
  totalAmount,
  depositAmount,
  discounts,
  vatRate,
}) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const calculateRemainingBalance = () => {
    const totalDiscountAmount = discounts.reduce(
      (sum, discount) => sum + discount.discountAmount,
      0
    );
    const subtotalAfterDiscount = totalAmount - totalDiscountAmount;
    const vatAmount = Math.round(subtotalAfterDiscount * (vatRate / 100));
    const totalWithVat = subtotalAfterDiscount + vatAmount;
    const totalWithDeposit = totalWithVat + depositAmount;

    return totalWithDeposit - totalPaid;
  };

  const remainingBalance = calculateRemainingBalance();
  const isFullyPaid = remainingBalance <= 0;
  const isPartiallyPaid = totalPaid > 0 && !isFullyPaid;

  const getPaymentStatusColor = () => {
    if (isFullyPaid) return 'text-green-400';
    if (isPartiallyPaid) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPaymentStatusIcon = () => {
    if (isFullyPaid) return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (isPartiallyPaid) return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return <AlertCircle className="w-5 h-5 text-red-400" />;
  };

  const getPaymentStatusText = () => {
    if (isFullyPaid) return 'Đã thanh toán đầy đủ';
    if (isPartiallyPaid) return 'Thanh toán một phần';
    return 'Chưa thanh toán';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Tổng thanh toán</h2>
        <div className="flex items-center gap-2">
          {getPaymentStatusIcon()}
          <span className={`text-sm font-medium ${getPaymentStatusColor()}`}>
            {getPaymentStatusText()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Paid Amount */}
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Đã thanh toán</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</div>
          {totalPaid > 0 && (
            <div className="text-xs text-gray-400 mt-1">Đã có giao dịch thanh toán</div>
          )}
        </div>

        {/* Remaining Balance */}
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Còn lại</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div
            className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-orange-400' : 'text-green-400'}`}
          >
            {formatCurrency(Math.abs(remainingBalance))}
          </div>
          {remainingBalance > 0 && (
            <div className="text-xs text-gray-400 mt-1">Cần thanh toán thêm</div>
          )}
          {remainingBalance < 0 && (
            <div className="text-xs text-green-400 mt-1">Đã thanh toán dư</div>
          )}
          {remainingBalance === 0 && (
            <div className="text-xs text-green-400 mt-1">Đã thanh toán đủ</div>
          )}
        </div>
      </div>

      {/* Payment Progress Bar */}
      {totalPaid > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Tiến độ thanh toán</span>
            <span className="text-white text-sm font-medium">
              {Math.round((totalPaid / (totalPaid + remainingBalance)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, (totalPaid / (totalPaid + remainingBalance)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Tổng đơn hàng:</span>
            <div className="text-white font-medium">{formatCurrency(totalAmount)}</div>
          </div>
          <div>
            <span className="text-gray-400">Tiền cọc:</span>
            <div className="text-white font-medium">{formatCurrency(depositAmount)}</div>
          </div>
          <div>
            <span className="text-gray-400">Tổng cần thanh toán:</span>
            <div className="text-white font-medium">
              {formatCurrency(totalPaid + remainingBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTotalPaidSection;
