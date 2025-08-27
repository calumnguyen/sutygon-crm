import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, User, Package } from 'lucide-react';

interface AffectedOrder {
  orderId: number;
  customerName: string;
  orderDate: Date;
  expectedReturnDate: Date;
  quantity: number;
  itemName: string;
  size: string;
}

interface AffectedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItemId: number;
  size: string;
  dateFrom: string;
  dateTo: string;
  itemName: string;
}

export const AffectedOrdersModal: React.FC<AffectedOrdersModalProps> = ({
  isOpen,
  onClose,
  inventoryItemId,
  size,
  dateFrom,
  dateTo,
  itemName,
}) => {
  const [affectedOrders, setAffectedOrders] = useState<AffectedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAffectedOrders();
    }
  }, [isOpen, inventoryItemId, size, dateFrom, dateTo]);

  const fetchAffectedOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders/affected-orders?inventoryItemId=${inventoryItemId}&size=${encodeURIComponent(size)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
      );

      if (response.ok) {
        const data = await response.json();
        setAffectedOrders(data.affectedOrders || []);
      } else {
        setError('Không thể tải danh sách đơn hàng bị ảnh hưởng');
      }
    } catch (error) {
      console.error('Error fetching affected orders:', error);
      setError('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    // Convert to Vietnam time (UTC+7)
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
    const vietnamDate = new Date(date.getTime() + vietnamOffset);
    return vietnamDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Đơn hàng bị ảnh hưởng</h2>
              <p className="text-slate-400 text-sm">
                {itemName} - Size {size}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-slate-400">Đang tải...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : affectedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-slate-400">Không có đơn hàng nào bị ảnh hưởng</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Cảnh báo tồn kho âm</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Các đơn hàng sau sẽ bị ảnh hưởng khi thêm đơn hàng mới này:
                </p>
              </div>

              <div className="space-y-3">
                {affectedOrders.map((order, index) => (
                  <div
                    key={`${order.orderId}-${index}`}
                    className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">{order.customerName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400 text-sm">Đơn hàng</div>
                        <div className="text-white font-mono">
                          #{order.orderId.toString().padStart(6, '0')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Ngày thuê</span>
                        </div>
                        <div className="text-white">{formatDate(order.orderDate)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Ngày trả</span>
                        </div>
                        <div className="text-white">{formatDate(order.expectedReturnDate)}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-400 text-sm">Số lượng đặt:</div>
                        <div className="text-white font-medium">{order.quantity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <h3 className="text-amber-400 font-medium mb-1">Khuyến nghị</h3>
                    <p className="text-slate-300 text-sm">
                      Hãy kiểm tra lại số lượng tồn kho hoặc điều chỉnh ngày thuê để tránh xung đột
                      với các đơn hàng hiện có.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
