import React from 'react';
import { CreditCard, User, Clock, DollarSign, QrCode } from 'lucide-react';
import { PaymentHistory } from './types';

interface OrderPaymentHistorySectionProps {
  paymentHistory: PaymentHistory[];
  totalPaid: number;
}

const OrderPaymentHistorySection: React.FC<OrderPaymentHistorySectionProps> = ({
  paymentHistory,
  totalPaid,
}) => {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    // Convert to Vietnam time (UTC+7)
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
    const vietnamDate = new Date(dateObj.getTime() + vietnamOffset);

    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[vietnamDate.getDay()];
    const formattedDate = vietnamDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = vietnamDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dayName}, ${formattedDate} - ${formattedTime}`;
  };

  const getPaymentMethodLabel = (method: 'cash' | 'qr') => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'qr':
        return 'QR Code';
      default:
        return method;
    }
  };

  const getPaymentMethodColor = (method: 'cash' | 'qr') => {
    switch (method) {
      case 'cash':
        return 'bg-green-600';
      case 'qr':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getPaymentMethodIcon = (method: 'cash' | 'qr', size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    switch (method) {
      case 'cash':
        return <DollarSign className={`${sizeClass} text-white`} />;
      case 'qr':
        return <QrCode className={`${sizeClass} text-white`} />;
      default:
        return <CreditCard className={`${sizeClass} text-white`} />;
    }
  };

  if (paymentHistory.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Lịch sử thanh toán</h2>
        </div>

        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Chưa có lịch sử thanh toán</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Lịch sử thanh toán</h2>
        <span className="hidden sm:inline bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
          {paymentHistory.length} giao dịch
        </span>
      </div>

      <div className="space-y-3">
        {paymentHistory.map((payment) => (
          <div
            key={payment.id}
            className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600"
          >
            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${getPaymentMethodColor(payment.paymentMethod)}`}>
                  {getPaymentMethodIcon(payment.paymentMethod)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </h3>
                  <p className="text-gray-400 text-xs">{formatDate(payment.paymentDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Xử lý bởi:</span>
                  <span className="text-white font-medium truncate">
                    {payment.processedByUser?.name || `User #${payment.processedByUser?.id}`}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-white font-bold text-lg">{formatCurrency(payment.amount)}</div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-md ${getPaymentMethodColor(payment.paymentMethod)}`}
                  >
                    {getPaymentMethodIcon(payment.paymentMethod, 'sm')}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </h3>
                    <p className="text-gray-400 text-xs">{formatDate(payment.paymentDate)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-base">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Xử lý bởi:</span>
                <span className="text-white font-medium truncate">
                  {payment.processedByUser?.name || `User #${payment.processedByUser?.id}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      {paymentHistory.length > 0 && (
        <div className="mt-6 p-[2px] rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Tổng đã thanh toán</h3>
                <p className="text-gray-400 text-xs">{paymentHistory.length} giao dịch</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPaymentHistorySection;
