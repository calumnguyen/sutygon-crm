import React from 'react';
import { Discount } from './types';

interface OrderDiscountsSectionProps {
  discounts: Discount[];
  userNames: Record<number, string>;
}

const OrderDiscountsSection: React.FC<OrderDiscountsSectionProps> = ({ discounts, userNames }) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    // Convert to Vietnam time (UTC+7) - same as OrdersGrid
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
    const vietnamDate = new Date(dateObj.getTime() + vietnamOffset);

    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[vietnamDate.getDay()];
    const formattedDate = vietnamDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dayName}, ${formattedDate}`;
  };

  if (discounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
          <span className="text-white font-bold text-lg">%</span>
        </div>
        <h2 className="text-xl font-bold text-white">Giảm giá</h2>
        <span className="hidden sm:inline bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
          {discounts.length} giảm giá
        </span>
      </div>

      <div className="space-y-4">
        {discounts.map((discount) => (
          <div
            key={discount.id}
            className="bg-gray-700 rounded-lg p-3 sm:p-4 border border-gray-600"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm sm:text-base mb-1 break-words">
                  {discount.itemizedName}
                </h3>
                {discount.description && (
                  <p className="text-gray-300 text-xs sm:text-sm mb-1 line-clamp-2">
                    {discount.description}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-white font-bold text-base sm:text-lg">
                  {discount.discountType === 'vnd'
                    ? `-${formatCurrency(Number(discount.discountAmount))}`
                    : `-${discount.discountValue}%`}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {/* User information - responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {discount.requestedByUserId && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Yêu cầu bởi:</span>
                    <span className="text-white font-medium truncate">
                      {userNames[discount.requestedByUserId] ||
                        `User #${discount.requestedByUserId}`}
                    </span>
                  </div>
                )}

                {discount.authorizedByUserId && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">Phê duyệt bởi:</span>
                    <span className="text-white font-medium truncate">
                      {userNames[discount.authorizedByUserId] ||
                        `User #${discount.authorizedByUserId}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Date information */}
              <div className="flex items-center gap-1 text-gray-400">
                <span className="flex-shrink-0">Ngày tạo:</span>
                <span className="text-white font-medium">{formatDate(discount.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Total Discount Summary */}
        <div className="mt-4 p-[2px] rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500">
          <div className="bg-gray-800 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">Tổng giảm giá</h3>
                <p className="text-gray-400 text-xs sm:text-sm">{discounts.length} giảm giá</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-base sm:text-lg font-bold">
                  <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                    -
                    {formatCurrency(
                      discounts.reduce(
                        (total, discount) => total + Number(discount.discountAmount),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDiscountsSection;
