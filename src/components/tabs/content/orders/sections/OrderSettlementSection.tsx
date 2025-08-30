import React from 'react';
import { Calculator } from 'lucide-react';

interface OrderSettlementSectionProps {
  totalAmount: number;
  vatAmount: number;
  depositAmount: number;
  discountAmount: number;
  paidAmount: number;
  depositReturned?: number;
}

const OrderSettlementSection: React.FC<OrderSettlementSectionProps> = ({
  totalAmount,
  vatAmount,
  depositAmount,
  discountAmount,
  paidAmount,
  depositReturned = 0,
}) => {
  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('vi-VN') + ' đ';
  };

  const calculateRemainingBalance = () => {
    return totalAmount + vatAmount + depositAmount - discountAmount - paidAmount;
  };

  const calculateDepositRefundNeeded = () => {
    // Calculate what the customer actually owes (excluding deposit)
    const totalOwed = totalAmount + vatAmount - discountAmount;

    // If customer paid more than they owe, they need a refund
    // The refund amount is the excess payment, but not more than the deposit amount
    if (paidAmount > totalOwed) {
      const excessPayment = paidAmount - totalOwed;
      // The refund is the minimum of excess payment or remaining deposit
      return Math.min(excessPayment, depositAmount - depositReturned);
    }

    return 0;
  };

  const remainingBalance = calculateRemainingBalance();
  const depositRefundNeeded = calculateDepositRefundNeeded();

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Tất toán</h2>
      </div>

      <div className="space-y-4">
        {/* Total Amount */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-base">Tổng tiền hàng:</span>
          <span className="text-white text-base font-medium">{formatCurrency(totalAmount)}</span>
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-base">Thuế VAT:</span>
          <span className="text-white text-base font-medium">{formatCurrency(vatAmount)}</span>
        </div>

        {/* Deposit */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-base">Tiền cọc:</span>
          <span className="text-white text-base font-medium">{formatCurrency(depositAmount)}</span>
        </div>

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-base">Giảm giá:</span>
            <span className="text-gray-300 text-base font-medium">
              -{formatCurrency(discountAmount)}
            </span>
          </div>
        )}

        {/* Paid Amount */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-base">Đã thanh toán:</span>
          <span className="text-gray-300 text-base font-medium">-{formatCurrency(paidAmount)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-600 my-4"></div>

        {/* Remaining Balance */}
        <div className="flex items-center justify-between">
          <span className="text-white text-lg font-bold">
            {remainingBalance > 0
              ? 'Khách hàng cần trả:'
              : remainingBalance < 0
                ? 'Cần hoàn khách:'
                : 'Số tiền còn lại:'}
          </span>
          <span className="text-white text-lg font-bold">
            {formatCurrency(Math.abs(remainingBalance))}
          </span>
        </div>

        {/* Settlement Status - Only show "Đã tất toán" when truly settled */}
        {remainingBalance === 0 && depositRefundNeeded === 0 && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
            <div className="flex items-center justify-center">
              <span className="text-green-400 text-sm font-medium">✓ Đã tất toán</span>
            </div>
          </div>
        )}

        {/* Deposit Return Information */}
        {depositRefundNeeded > 0 && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
            <div className="flex items-center justify-center">
              <span className="text-yellow-400 text-sm font-medium">
                ⚠ Tiền cọc cần được hoàn trả: {formatCurrency(depositRefundNeeded)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSettlementSection;
