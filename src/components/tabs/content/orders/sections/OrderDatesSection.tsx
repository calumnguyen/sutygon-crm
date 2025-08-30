import React from 'react';
import { Calendar, Clock, Package } from 'lucide-react';

interface OrderDatesSectionProps {
  orderDate: Date;
  expectedReturnDate: Date;
}

const OrderDatesSection: React.FC<OrderDatesSectionProps> = ({ orderDate, expectedReturnDate }) => {
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

  const getDateLabel = (date: Date) => {
    // Convert both dates to Vietnam time for consistent comparison
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    const today = new Date();
    const todayVietnam = new Date(today.getTime() + vietnamOffset);
    todayVietnam.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    const targetDateVietnam = new Date(targetDate.getTime() + vietnamOffset);
    targetDateVietnam.setHours(0, 0, 0, 0);

    const diffTime = targetDateVietnam.getTime() - todayVietnam.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    if (diffDays === -1) return 'Hôm qua';
    if (diffDays > 1) return `${diffDays} ngày nữa`;
    if (diffDays < -1) return `${Math.abs(diffDays)} ngày trước`;

    return '';
  };

  const getDateLabelColor = (date: Date) => {
    // Convert both dates to Vietnam time for consistent comparison
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    const today = new Date();
    const todayVietnam = new Date(today.getTime() + vietnamOffset);
    todayVietnam.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    const targetDateVietnam = new Date(targetDate.getTime() + vietnamOffset);
    targetDateVietnam.setHours(0, 0, 0, 0);

    const diffTime = targetDateVietnam.getTime() - todayVietnam.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'bg-green-600 text-white font-bold shadow-lg'; // Today - most important
    if (diffDays === 1) return 'bg-blue-600 text-white font-bold shadow-md'; // Tomorrow - very important
    if (diffDays === -1) return 'bg-orange-600 text-white font-bold shadow-md'; // Yesterday - important reminder
    if (diffDays > 1) return 'bg-blue-400 text-white'; // Future
    if (diffDays < -1) return 'bg-red-500 text-white'; // Past

    return 'bg-gray-600 text-white';
  };

  const calculateTotalDays = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Reset time to compare dates only
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // No +1, just the difference

    return diffDays;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Thời gian thuê</h2>
        <div className="p-[1px] rounded-md bg-gradient-to-r from-blue-500 to-green-500">
          <div className="bg-gray-800 rounded-md px-3 py-1 text-sm font-medium">
            <span className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
              {calculateTotalDays(orderDate, expectedReturnDate)} ngày
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Ngày thuê</span>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getDateLabelColor(orderDate)}`}
            >
              {getDateLabel(orderDate)}
            </span>
          </div>
          <p className="text-white font-medium">{formatDate(orderDate)}</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Ngày trả</span>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getDateLabelColor(expectedReturnDate)}`}
            >
              {getDateLabel(expectedReturnDate)}
            </span>
          </div>
          <p className="text-white font-medium">{formatDate(expectedReturnDate)}</p>
        </div>
      </div>
    </div>
  );
};

export default OrderDatesSection;
