import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Package } from 'lucide-react';

interface RentalDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrderDate: Date;
  currentReturnDate: Date;
  onUpdateDate: (newOrderDate: Date) => Promise<void>;
}

const RentalDateModal: React.FC<RentalDateModalProps> = ({
  isOpen,
  onClose,
  currentOrderDate,
  currentReturnDate,
  onUpdateDate,
}) => {
  const [newOrderDate, setNewOrderDate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>('');

  // Calculate total rental days
  const calculateTotalDays = (startDate: Date, endDate: Date) => {
    const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
    const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // For rental periods, we count both start and end dates
    // So if start date is Aug 30 and end date is Sep 1, that's 3 days (Aug 30, Aug 31, Sep 1)
    return diffDays + 1;
  };

  // Calculate new return date based on new rental date
  const calculateNewReturnDate = (newDate: Date) => {
    // Always add 2 days for a 3-day base rental period (rent on day 1, return on day 3)
    const newReturnDate = new Date(newDate);
    newReturnDate.setDate(newDate.getDate() + 2);
    return newReturnDate;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const dateObj = new Date(date);
    // Convert to Vietnam time (UTC+7) - same as OrderDatesSection
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

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Format current date for input (YYYY-MM-DD)
      const orderDate =
        currentOrderDate instanceof Date ? currentOrderDate : new Date(currentOrderDate);
      const formattedDate = orderDate.toISOString().split('T')[0];
      setNewOrderDate(formattedDate);
      setError('');
    }
  }, [isOpen, currentOrderDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderDate) {
      setError('Vui lòng chọn ngày thuê mới');
      return;
    }

    const selectedDate = new Date(newOrderDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('Ngày thuê không thể là ngày trong quá khứ');
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      await onUpdateDate(selectedDate);
      onClose();
    } catch (err) {
      setError('Có lỗi xảy ra khi cập nhật ngày thuê');
      console.error('Error updating rental date:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const newReturnDate = newOrderDate ? calculateNewReturnDate(new Date(newOrderDate)) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>

        <div className="text-xl font-bold text-blue-400 mb-4">Cập nhật ngày thuê</div>

        {/* Current Information */}
        <div className="mb-6 space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">Thông tin hiện tại</div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm">
                Ngày thuê:{' '}
                {formatDate(
                  currentOrderDate instanceof Date ? currentOrderDate : new Date(currentOrderDate)
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">
                Ngày trả:{' '}
                {formatDate(
                  currentReturnDate instanceof Date
                    ? currentReturnDate
                    : new Date(currentReturnDate)
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm">
                Tổng thời gian:{' '}
                {calculateTotalDays(
                  currentOrderDate instanceof Date ? currentOrderDate : new Date(currentOrderDate),
                  currentReturnDate instanceof Date
                    ? currentReturnDate
                    : new Date(currentReturnDate)
                )}{' '}
                ngày
              </span>
            </div>
          </div>
        </div>

        {/* New Date Selection */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Chọn ngày thuê mới</label>
            <input
              type="date"
              value={newOrderDate}
              onChange={(e) => setNewOrderDate(e.target.value)}
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Preview of new dates */}
          {newReturnDate && (
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-2">Thông tin mới</div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm">
                  Ngày thuê: {formatDate(new Date(newOrderDate))}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm">Ngày trả: {formatDate(newReturnDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-white text-sm">
                  Tổng thời gian: {calculateTotalDays(new Date(newOrderDate), newReturnDate)} ngày
                </span>
              </div>
            </div>
          )}

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUpdating || !newOrderDate}
              className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium"
            >
              {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalDateModal;
