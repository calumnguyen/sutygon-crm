import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Package,
  Calendar,
  DollarSign,
  X,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface WarningItem {
  id: number;
  name: string;
  size: string;
  quantity: number;
  warning: string;
  warningResolved: boolean;
  warningResolvedAt: string | null;
  warningResolvedBy: number | null;
}

interface OrderWithWarnings {
  id: number;
  orderDate: Date;
  expectedReturnDate: Date;
  status: string;
  totalAmount: number;
  customerId: number;
  customerName: string;
  warningItems: WarningItem[];
}

interface OrdersWithWarningsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersWithWarnings: React.FC<OrdersWithWarningsProps> = ({ isOpen, onClose }) => {
  const { sessionToken } = useUser();
  const [orders, setOrders] = useState<OrderWithWarnings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resolvingWarnings, setResolvingWarnings] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      fetchOrdersWithWarnings();
    }
  }, [isOpen, filter, page]);

  const fetchOrdersWithWarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      const resolvedParam = filter === 'all' ? undefined : filter === 'resolved' ? 'true' : 'false';
      const response = await fetch(
        `/api/orders/with-warnings?page=${page}&limit=10&resolved=${resolvedParam || ''}`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError('Không thể tải danh sách đơn hàng có cảnh báo');
      }
    } catch (error) {
      console.error('Error fetching orders with warnings:', error);
      setError('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveWarning = async (itemId: number, resolved: boolean) => {
    setResolvingWarnings((prev) => ({ ...prev, [itemId]: true }));

    try {
      const response = await fetch('/api/orders/resolve-warning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ orderItemId: itemId, resolved }),
      });

      if (response.ok) {
        // Update local state
        setOrders((prev) =>
          prev.map((order) => ({
            ...order,
            warningItems: order.warningItems.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    warningResolved: resolved,
                    warningResolvedAt: resolved ? new Date().toISOString() : null,
                    warningResolvedBy: resolved ? 1 : null,
                  }
                : item
            ),
          }))
        );
      } else {
        console.error('Failed to resolve warning');
      }
    } catch (error) {
      console.error('Error resolving warning:', error);
    } finally {
      setResolvingWarnings((prev) => ({ ...prev, [itemId]: false }));
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Quản lý cảnh báo tồn kho</h2>
              <p className="text-slate-400 text-sm">Danh sách đơn hàng có cảnh báo tồn kho âm</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Lọc:</span>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as 'all' | 'resolved' | 'unresolved');
                  setPage(1);
                }}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white text-sm"
              >
                <option value="unresolved">Chưa xử lý</option>
                <option value="resolved">Đã xử lý</option>
                <option value="all">Tất cả</option>
              </select>
            </div>
          </div>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-slate-400">
                {filter === 'unresolved'
                  ? 'Không có cảnh báo nào chưa xử lý'
                  : 'Không có đơn hàng nào có cảnh báo'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-slate-400 text-sm">Đơn hàng</div>
                        <div className="text-white font-mono text-lg">
                          #{order.id.toString().padStart(6, '0')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">{order.customerName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm">Tổng tiền</div>
                      <div className="text-white font-medium">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Order Dates */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
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

                  {/* Warning Items */}
                  <div className="space-y-3">
                    <div className="text-slate-400 text-sm font-medium">Sản phẩm có cảnh báo:</div>
                    {order.warningItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          item.warningResolved
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">{item.name}</span>
                              <span className="text-slate-400">- Size {item.size}</span>
                            </div>
                            <div className="text-sm text-slate-300 mb-2">{item.warning}</div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>Số lượng: {item.quantity}</span>
                              {item.warningResolved && item.warningResolvedAt && (
                                <span>
                                  Đã xử lý: {formatDate(new Date(item.warningResolvedAt))}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {!item.warningResolved ? (
                              <button
                                onClick={() => handleResolveWarning(item.id, true)}
                                disabled={resolvingWarnings[item.id]}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                              >
                                {resolvingWarnings[item.id] ? 'Đang xử lý...' : 'Đã xử lý'}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-green-400 text-xs">
                                <CheckCircle className="w-4 h-4" />
                                <span>Đã xử lý</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-slate-700">
            <div className="text-slate-400 text-sm">
              Trang {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}

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
