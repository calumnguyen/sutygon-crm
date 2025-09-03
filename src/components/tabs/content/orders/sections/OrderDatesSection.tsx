import React, { useState } from 'react';
import { Calendar, Clock, Package } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import RentalDateModal from './RentalDateModal';
import ReturnDateModal from './ReturnDateModal';
import { OrderItem } from './types';

interface OrderDatesSectionProps {
  orderDate: Date;
  orderItems: OrderItem[];
  orderId: number;
  onOrderUpdate?: () => void;
}

const OrderDatesSection: React.FC<OrderDatesSectionProps> = ({
  orderDate,
  orderItems,
  orderId,
  onOrderUpdate,
}) => {
  const { sessionToken } = useUser();
  const [showRentalDateModal, setShowRentalDateModal] = useState(false);
  const [showReturnDateModal, setShowReturnDateModal] = useState(false);

  // API call to update rental date
  const handleUpdateRentalDate = async (newOrderDate: Date) => {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        orderDate: newOrderDate.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update rental date');
    }

    // Trigger order data refresh
    if (onOrderUpdate) {
      onOrderUpdate();
    }
  };

  // API call to update extensions
  const handleUpdateExtensions = async (extensions: OrderItem[]) => {
    // First, remove existing extensions
    const existingExtensions = orderItems.filter((item) => item.isExtension);
    for (const ext of existingExtensions) {
      await fetch(`/api/orders/${orderId}/items/${ext.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
    }

    // Then add new extensions
    for (const extension of extensions) {
      await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: extension.name,
          size: extension.size,
          quantity: extension.quantity,
          price: extension.price,
          isExtension: true,
          extraDays: extension.extraDays,
          feeType: extension.feeType,
          percent: extension.percent,
          isCustom: false,
        }),
      });
    }

    // Update payment status after changing extensions
    try {
      await fetch(`/api/orders/${orderId}/payment-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }

    // Trigger order data refresh
    if (onOrderUpdate) {
      onOrderUpdate();
    }
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

  // Calculate the correct return date based on rental date and extensions
  const calculateCorrectReturnDate = (rentalDate: Date, items: OrderItem[]) => {
    const totalExtraDays = items
      .filter((item) => item.isExtension)
      .reduce((sum, ext) => sum + (ext.extraDays || 0), 0);

    const returnDate = new Date(rentalDate);
    returnDate.setDate(rentalDate.getDate() + 2 + totalExtraDays); // Base 3 days (add 2) + extensions
    return returnDate;
  };

  const calculateTotalDays = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Reset time to compare dates only
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // For rental periods, we count both start and end dates
    // So if start date is Aug 30 and end date is Sep 1, that's 3 days (Aug 30, Aug 31, Sep 1)
    return diffDays + 1;
  };

  // Use the correct return date instead of the stored one
  const correctReturnDate = calculateCorrectReturnDate(orderDate, orderItems);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Thời gian thuê</h2>
        <div className="p-[1px] rounded-md bg-gradient-to-r from-blue-500 to-green-500">
          <div className="bg-gray-800 rounded-md px-3 py-1 text-sm font-medium">
            <span className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
              {calculateTotalDays(orderDate, correctReturnDate)} ngày
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={() => setShowRentalDateModal(true)}
          title="Nhấp để cập nhật ngày thuê"
        >
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

        <div
          className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={() => setShowReturnDateModal(true)}
          title="Nhấp để quản lý gia hạn và ngày trả"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Ngày trả</span>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getDateLabelColor(correctReturnDate)}`}
            >
              {getDateLabel(correctReturnDate)}
            </span>
          </div>
          <p className="text-white font-medium">{formatDate(correctReturnDate)}</p>
        </div>
      </div>

      {/* Modals */}
      <RentalDateModal
        isOpen={showRentalDateModal}
        onClose={() => setShowRentalDateModal(false)}
        currentOrderDate={orderDate}
        currentReturnDate={correctReturnDate}
        onUpdateDate={handleUpdateRentalDate}
      />

      <ReturnDateModal
        isOpen={showReturnDateModal}
        onClose={() => setShowReturnDateModal(false)}
        currentOrderDate={orderDate}
        currentReturnDate={correctReturnDate}
        orderItems={orderItems}
        onUpdateExtensions={handleUpdateExtensions}
      />
    </div>
  );
};

export default OrderDatesSection;
