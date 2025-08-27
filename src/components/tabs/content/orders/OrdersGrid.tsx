import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Order } from '@/lib/actions/orders';
import { TRANSLATIONS } from '@/config/translations';
import { generateReceiptPDF, ReceiptData } from '@/lib/utils/pdfGenerator';
import { useUser } from '@/context/UserContext';

// Helper function to format date with Vietnamese day names
function formatVietnameseDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = days[date.getDay()];
  return `${dayName}, ${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

interface OrderItem {
  id: number;
  orderId: number;
  inventoryItemId: number | null;
  formattedId: string | null;
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface OrdersGridProps {
  orders: (Order & {
    customerName: string;
    calculatedReturnDate: Date;
    noteNotComplete: number;
    noteTotal: number;
  })[];
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export const OrdersGrid: React.FC<OrdersGridProps> = ({
  orders: initialOrders,
  loading,
  error,
  loadingMore,
  hasMore,
  loadMore,
}) => {
  const { sessionToken } = useUser();
  const [orders, setOrders] = React.useState(initialOrders);
  const [vatPercentage, setVatPercentage] = React.useState(8);
  const [orderItems, setOrderItems] = useState<Record<number, OrderItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Fetch order items for each order
  const fetchOrderItems = useCallback(
    async (orderId: number) => {
      if (orderItems[orderId] || loadingItems[orderId]) return;

      setLoadingItems((prev) => ({ ...prev, [orderId]: true }));

      try {
        const response = await fetch(`/api/orders/${orderId}/items`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const items = await response.json();
          setOrderItems((prev) => ({ ...prev, [orderId]: items }));
        }
      } catch (error) {
        console.error('Error fetching order items:', error);
      } finally {
        setLoadingItems((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [orderItems, loadingItems, sessionToken]
  );

  // Helper function to select the best item for display
  const getDisplayItem = (items: OrderItem[]) => {
    if (items.length === 0) return null;

    // First, try to find items with images
    const itemsWithImages = items.filter((item) => item.imageUrl);
    if (itemsWithImages.length > 0) {
      return itemsWithImages[0]; // Return first item with image
    }

    // If no items have images, return the first item
    return items[0];
  };

  // Fetch items for new orders
  useEffect(() => {
    orders.forEach((order) => {
      if (!orderItems[order.id] && !loadingItems[order.id]) {
        fetchOrderItems(order.id);
      }
    });
  }, [orders, orderItems, loadingItems, fetchOrderItems]);

  // Intersection Observer for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        },
        {
          rootMargin: '200px',
          threshold: 0.1,
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, loadingMore, loadMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Fetch VAT percentage on mount
  useEffect(() => {
    fetch('/api/store-settings/vat-percentage')
      .then((res) => res.json())
      .then((data) => {
        setVatPercentage(data.vatPercentage || 8);
      })
      .catch(() => {
        setVatPercentage(8); // Default fallback
      });
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const formatOrderId = (id: number) => {
    return `#${id.toString().padStart(6, '0')}`;
  };

  const hasDocument = (
    order: Order & {
      customerName: string;
      calculatedReturnDate: Date;
      noteNotComplete: number;
      noteTotal: number;
    }
  ) => {
    return !!(order.documentType && order.documentName);
  };

  const handlePrintReceipt = async (
    order: Order & {
      customerName: string;
      calculatedReturnDate: Date;
      noteNotComplete: number;
      noteTotal: number;
    }
  ) => {
    try {
      // Fetch order items and customer details
      const [itemsResponse, customerResponse] = await Promise.all([
        fetch(`/api/orders/${order.id}/items`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }),
        fetch(`/api/customers/${order.customerId}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }),
      ]);

      if (!itemsResponse.ok || !customerResponse.ok) {
        throw new Error('Failed to fetch order details');
      }

      const [items, customer] = await Promise.all([itemsResponse.json(), customerResponse.json()]);

      // Calculate payment history
      const paymentHistory = [];
      if (order.paymentMethod && order.paidAmount > 0) {
        paymentHistory.push({
          date: formatVietnameseDate(order.updatedAt.toISOString()),
          method: order.paymentMethod as 'cash' | 'qr',
          amount: order.paidAmount,
        });
      }

      // Calculate settlement info
      const totalPaid = order.paidAmount;
      const totalAmount =
        order.totalAmount +
        (order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100)));
      const remainingBalance = Math.max(0, totalAmount - totalPaid);
      const depositAmount = (() => {
        if (order.depositType && order.depositValue) {
          if (order.depositType === 'percent') {
            return Math.round(order.totalAmount * (order.depositValue / 100));
          } else {
            return order.depositValue;
          }
        }
        return 0;
      })();

      const receiptData: ReceiptData = {
        orderId: formatOrderId(order.id),
        customerName: customer.name || 'N/A',
        customerAddress: customer.address || 'N/A',
        customerPhone: customer.phone || 'N/A',
        orderDate: formatDate(order.orderDate),
        rentDate: formatDate(order.orderDate),
        returnDate: formatDate(order.calculatedReturnDate),
        items: items.map(
          (item: {
            id?: number;
            inventoryItemId?: number | null;
            formattedId?: string | null;
            name?: string;
            price?: number;
            quantity?: number;
          }) => ({
            id: item.formattedId || item.id?.toString() || 'N/A',
            inventoryItemId: item.inventoryItemId || null,
            formattedId: item.formattedId || null,
            name: item.name || 'N/A',
            price: item.price || 0,
            quantity: item.quantity || 0,
            total: (item.price || 0) * (item.quantity || 0),
          })
        ),
        totalAmount: order.totalAmount,
        vatAmount: order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100)),
        depositAmount: depositAmount,
        paymentHistory: paymentHistory,
        settlementInfo: {
          remainingBalance: remainingBalance,
          depositReturned: 0,
          documentType: order.documentType || undefined,
          documentReturned: false,
        },
        lastUpdated: order.updatedAt.toISOString(),
      };

      await generateReceiptPDF(receiptData);
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Có lỗi khi tạo biên nhận. Vui lòng thử lại.');
    }
  };

  const handleToggleTaxInvoice = async (orderId: number, currentStatus: boolean) => {
    // Optimistic update - immediately update UI
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              documentType: currentStatus
                ? 'TAX_INVOICE_EXPORTED:false'
                : 'TAX_INVOICE_EXPORTED:true',
            }
          : order
      )
    );

    try {
      const response = await fetch(`/api/orders/${orderId}/tax-invoice`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taxInvoiceExported: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tax invoice status');
      }
    } catch (error) {
      console.error('Error updating tax invoice status:', error);

      // Revert optimistic update on error
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                documentType: currentStatus
                  ? 'TAX_INVOICE_EXPORTED:true'
                  : 'TAX_INVOICE_EXPORTED:false',
              }
            : order
        )
      );

      alert('Có lỗi khi cập nhật trạng thái xuất hóa đơn. Vui lòng thử lại.');
    }
  };

  const getTaxInvoiceStatus = (
    order: Order & {
      customerName: string;
      calculatedReturnDate: Date;
      noteNotComplete: number;
      noteTotal: number;
    }
  ) => {
    return order.documentType === 'TAX_INVOICE_EXPORTED:true';
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-lg overflow-hidden">
        <div className="text-zinc-400 text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          Đang tải danh sách đơn hàng...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-lg overflow-hidden">
        <div className="text-red-400 text-center py-10">
          <div className="mb-4">❌ Lỗi tải dữ liệu</div>
          <div className="text-sm text-zinc-400">{error}</div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg shadow-lg overflow-hidden">
        <div className="text-zinc-400 text-center py-10">
          <div className="mb-4">📋 Chưa có đơn hàng nào</div>
          <div className="text-sm">Nhấn &quot;Thêm đơn hàng mới&quot; để tạo đơn hàng đầu tiên</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-xl shadow-2xl overflow-hidden">
      {/* Grid Layout */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {orders.map((order, index) => {
            // Calculate remaining balance
            const totalWithVAT =
              order.totalAmount +
              (order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100)));
            const depositAmount = (() => {
              if (order.depositType && order.depositValue) {
                if (order.depositType === 'percent') {
                  return Math.round(order.totalAmount * (order.depositValue / 100));
                } else {
                  return order.depositValue;
                }
              }
              return 0;
            })();
            const totalOwed = totalWithVAT + depositAmount;
            const remainingBalance = Math.max(0, totalOwed - order.paidAmount);

            // Get order items for this order
            const items = orderItems[order.id] || [];
            const displayItem = getDisplayItem(items);
            const itemCount = items.length;

            return (
              <div
                key={`${order.id}-${index}`}
                ref={index === orders.length - 1 ? lastElementRef : null}
                className="bg-neutral-800 rounded-2xl border border-neutral-700 hover:border-neutral-600 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-neutral-800 to-neutral-700 border-b border-neutral-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-bold text-white mb-2">
                        {formatOrderId(order.id)}
                      </div>
                      <div className="text-neutral-300 font-medium">{order.customerName}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          order.status === 'Processing'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {order.status === 'Processing'
                          ? '🔄 Đang xử lý'
                          : order.status === 'Completed'
                            ? '✅ Hoàn thành'
                            : order.status === 'Cancelled'
                              ? '❌ Đã hủy'
                              : order.status}
                      </div>
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          order.paymentStatus === 'Paid Full'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : order.paymentStatus === 'Unpaid'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {order.paymentStatus === 'Paid Full'
                          ? '💰 Đã trả đủ'
                          : order.paymentStatus === 'Partially Paid'
                            ? '⚠️ Trả một phần'
                            : order.paymentStatus === 'Unpaid'
                              ? '💳 Chưa trả'
                              : order.paymentStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Left Side - Order Details */}
                    <div className="flex-1 space-y-4">
                      {/* Dates */}
                      <div className="flex items-center gap-2 text-neutral-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          {formatDate(order.orderDate)} → {formatDate(order.calculatedReturnDate)}
                        </span>
                      </div>

                      {/* Financial Summary */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                          <span className="text-neutral-300 font-medium">Tổng tiền</span>
                          <span className="text-white font-bold text-lg">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">VAT ({vatPercentage}%)</span>
                          <span className="text-neutral-200">
                            {formatCurrency(
                              order.vatAmount ||
                                Math.round(order.totalAmount * (vatPercentage / 100))
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Tiền cọc</span>
                          <span className="text-neutral-200">{formatCurrency(depositAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Đã trả</span>
                          <span className="text-neutral-200">
                            {formatCurrency(order.paidAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Remaining Balance */}
                      <div
                        className={`p-4 rounded-xl border-2 ${
                          remainingBalance > 0
                            ? 'bg-red-50 border-red-200'
                            : 'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm font-semibold ${
                              remainingBalance > 0 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {remainingBalance > 0 ? 'Còn nợ' : 'Đã thanh toán đủ'}
                          </span>
                          <span
                            className={`text-xl font-bold ${
                              remainingBalance > 0 ? 'text-red-800' : 'text-emerald-800'
                            }`}
                          >
                            {formatCurrency(remainingBalance)}
                          </span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex gap-3">
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                            hasDocument(order)
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {hasDocument(order) ? '📄 Có giấy tờ' : '📄 Không giấy tờ'}
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                          📝 {order.noteNotComplete}/{order.noteTotal}
                        </span>
                      </div>
                    </div>

                    {/* Right Side - Product Image */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-xs text-neutral-400 mb-3 font-medium uppercase tracking-wide">
                        Sản phẩm
                      </div>
                      <div className="relative">
                        {/* Main image */}
                        <div className="w-32 h-40 bg-neutral-700 rounded-xl border border-neutral-600 overflow-hidden">
                          {loadingItems[order.id] ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          ) : displayItem && displayItem.imageUrl ? (
                            <img
                              src={displayItem.imageUrl}
                              alt={displayItem.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center text-neutral-400 text-xs text-center p-2">
                                    <div>
                                      <div class="text-lg mb-1">📦</div>
                                      <div class="truncate">${displayItem.name}</div>
                                    </div>
                                  </div>
                                `;
                              }}
                            />
                          ) : displayItem ? (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs text-center p-2">
                              <div>
                                <div className="text-lg mb-1">📦</div>
                                <div className="truncate">{displayItem.name}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs text-center p-2">
                              <div>
                                <div className="text-lg mb-1">📦</div>
                                <div>Không có</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Item count badge */}
                        {itemCount > 1 && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full border-2 border-neutral-800 flex items-center justify-center shadow-lg">
                            <span className="text-xs text-white font-bold">+{itemCount - 1}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-neutral-750 border-t border-neutral-700 space-y-3">
                  <button
                    onClick={() => handleToggleTaxInvoice(order.id, getTaxInvoiceStatus(order))}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      getTaxInvoiceStatus(order)
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                        : 'bg-neutral-600 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                    title={getTaxInvoiceStatus(order) ? 'Đã xuất hóa đơn' : 'Chưa xuất hóa đơn'}
                  >
                    {getTaxInvoiceStatus(order) ? '✅ Đã xuất hóa đơn' : '❌ Chưa xuất hóa đơn'}
                  </button>
                  <button
                    onClick={() => handlePrintReceipt(order)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="In Biên Nhận"
                  >
                    📄 In Biên Nhận
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator for infinite scroll */}
        {loadingMore && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-3 text-neutral-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span className="text-sm">Đang tải thêm đơn hàng...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="bg-neutral-800 px-6 py-4 border-t border-neutral-700">
        <div className="flex flex-col sm:flex-row justify-between text-sm text-neutral-300 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span>
              Tổng giá trị:{' '}
              <span className="text-white font-medium">
                {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
              </span>
            </span>
            <span>
              Tổng VAT:{' '}
              <span className="text-white">
                {formatCurrency(
                  orders.reduce(
                    (sum, order) =>
                      sum +
                      (order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100))),
                    0
                  )
                )}
              </span>
            </span>
          </div>
          <div className="text-right">
            <span>
              Tổng đơn hàng: <span className="text-white font-medium">{orders.length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
