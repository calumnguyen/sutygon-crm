import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Order } from '@/lib/actions/orders';
import { TRANSLATIONS } from '@/config/translations';
import { generateReceiptPDF, ReceiptData } from '@/lib/utils/pdfGenerator';

// Helper function to format date with Vietnamese day names
function formatVietnameseDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = days[date.getDay()];
  return `${dayName}, ${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

interface OrdersTableProps {
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

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders: initialOrders,
  loading,
  error,
  loadingMore,
  hasMore,
  loadMore,
}) => {
  const [orders, setOrders] = useState(initialOrders);
  const [vatPercentage, setVatPercentage] = useState(8);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Update local state when props change
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Intersection Observer for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        },
        {
          rootMargin: '100px', // Start loading when 100px away from the bottom
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      Processing: 'bg-blue-500',
      Completed: 'bg-green-500',
      Cancelled: 'bg-red-500',
      Returned: 'bg-gray-500',
    };

    const color = statusColors[status as keyof typeof statusColors] || 'bg-gray-500';
    const label =
      TRANSLATIONS.orders.status[status as keyof typeof TRANSLATIONS.orders.status] || status;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${color}`}
      >
        {label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusColors = {
      'Paid Full': 'bg-green-500',
      'Partially Paid': 'bg-yellow-500',
      Unpaid: 'bg-red-500',
      'Paid Full with Deposit': 'bg-green-600',
    };

    const color = statusColors[paymentStatus as keyof typeof statusColors] || 'bg-gray-500';
    const label =
      TRANSLATIONS.orders.paymentStatus[
        paymentStatus as keyof typeof TRANSLATIONS.orders.paymentStatus
      ] || paymentStatus;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${color}`}
      >
        {label}
      </span>
    );
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
        fetch(`/api/orders/${order.id}/items`),
        fetch(`/api/customers/${order.customerId}`),
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
          depositReturned: 0, // Will be updated when deposit is returned
          documentType: order.documentType || undefined,
          documentReturned: false, // Will be updated when document is returned
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

      // Success - no need to do anything since we already updated optimistically
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
    // Check if tax invoice is exported by looking at documentType
    // This is a temporary solution until we have the proper database column
    return order.documentType === 'TAX_INVOICE_EXPORTED:true';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="text-gray-400 text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          Đang tải danh sách đơn hàng...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="text-red-400 text-center py-10">
          <div className="mb-4">❌ Lỗi tải dữ liệu</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="text-gray-400 text-center py-10">
          <div className="mb-4">📋 Chưa có đơn hàng nào</div>
          <div className="text-sm">Nhấn &quot;Thêm đơn hàng mới&quot; để tạo đơn hàng đầu tiên</div>
        </div>
      </div>
    );
  }

  // Mobile card component
  const OrderCard = ({
    order,
  }: {
    order: Order & {
      customerName: string;
      calculatedReturnDate: Date;
      noteNotComplete: number;
      noteTotal: number;
    };
  }) => (
    <div className="bg-gray-700 rounded-lg p-4 mb-4 border border-gray-600">
      <div className="flex justify-between items-start mb-3">
        <div className="text-lg font-semibold text-white">{formatOrderId(order.id)}</div>
        <div className="flex gap-2">
          {getStatusBadge(order.status)}
          {getPaymentStatusBadge(order.paymentStatus)}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Khách hàng:</span>
          <span className="text-white font-medium">{order.customerName}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Ngày thuê:</span>
          <span className="text-white">{formatDate(order.orderDate)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Ngày trả:</span>
          <span className="text-white">{formatDate(order.calculatedReturnDate)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Tổng tiền:</span>
          <span className="text-white font-medium">{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">VAT ({vatPercentage}%):</span>
          <span className="text-white">
            {formatCurrency(
              order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100))
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Tiền cọc:</span>
          <span className="text-white">
            {(() => {
              // Calculate deposit amount for display
              if (order.depositType && order.depositValue) {
                if (order.depositType === 'percent') {
                  // For percentage deposits, calculate based on order total
                  const calculatedAmount = Math.round(
                    order.totalAmount * (order.depositValue / 100)
                  );
                  return formatCurrency(calculatedAmount);
                } else {
                  // For fixed amount deposits, use the value directly
                  return formatCurrency(order.depositValue);
                }
              }
              // If no deposit info, show 0
              return formatCurrency(0);
            })()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Đã trả:</span>
          <span className="text-white">{formatCurrency(order.paidAmount)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Giấy tờ:</span>
          <span className="text-white">{hasDocument(order) ? 'Có' : 'Không'}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Ghi chú:</span>
          <span className="text-white">
            {order.noteNotComplete}/{order.noteTotal}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Xuất hóa đơn:</span>
          <button
            onClick={() => handleToggleTaxInvoice(order.id, getTaxInvoiceStatus(order))}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              getTaxInvoiceStatus(order)
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
            }`}
            title={getTaxInvoiceStatus(order) ? 'Đã xuất hóa đơn' : 'Chưa xuất hóa đơn'}
          >
            {getTaxInvoiceStatus(order) ? '✅ Đã xuất' : '❌ Chưa xuất'}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-600">
          <button
            onClick={() => handlePrintReceipt(order)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            title="In Biên Nhận"
          >
            📄 In Biên Nhận
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Mobile view - Cards */}
      <div className="block sm:hidden p-4">
        {orders.map((order, index) => (
          <div
            key={`${order.id}-${index}`}
            ref={index === orders.length - 1 ? lastElementRef : null}
          >
            <OrderCard order={order} />
          </div>
        ))}

        {/* Loading indicator for mobile */}
        {loadingMore && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Đang tải thêm đơn hàng...</span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Mã ĐH
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tên Khách Hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ngày Thuê
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ngày Trả Dự Kiến
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <span>Tổng Tiền</span>
                  <div className="relative">
                    <span
                      className="text-blue-400 cursor-help text-sm font-bold hover:text-blue-300 select-none"
                      onMouseEnter={(e) => {
                        const tooltip = document.createElement('div');
                        tooltip.id = 'total-tooltip';
                        tooltip.innerHTML = `
                          <div style="
                            position: fixed;
                            background: #1f2937;
                            color: white;
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            z-index: 10000;
                            border: 1px solid #374151;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                            max-width: 250px;
                            line-height: 1.4;
                            pointer-events: none;
                          ">
                            <div style="font-weight: 600; color: #93c5fd; margin-bottom: 4px;">Tổng tiền đơn hàng</div>
                            <div style="color: #d1d5db; margin-bottom: 4px;">Chỉ bao gồm tiền thuê sản phẩm</div>
                            <div style="color: #9ca3af; font-size: 11px;">Không bao gồm tiền cọc giấy tờ</div>
                          </div>
                        `;
                        document.body.appendChild(tooltip);

                        const target = e.target as HTMLElement;
                        const rect = target.getBoundingClientRect();
                        const tooltipDiv = tooltip.firstElementChild as HTMLElement;
                        if (tooltipDiv) {
                          tooltipDiv.style.left = rect.left + rect.width / 2 - 125 + 'px';
                          tooltipDiv.style.top = rect.top - 80 + 'px';
                        }
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.getElementById('total-tooltip');
                        if (tooltip) tooltip.remove();
                      }}
                    >
                      ?
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <span>VAT ({vatPercentage}%)</span>
                  <div className="relative">
                    <span
                      className="text-blue-400 cursor-help text-sm font-bold hover:text-blue-300 select-none"
                      onMouseEnter={(e) => {
                        const tooltip = document.createElement('div');
                        tooltip.id = 'vat-tooltip';
                        tooltip.innerHTML = `
                          <div style="
                            position: fixed;
                            background: #1f2937;
                            color: white;
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            z-index: 10000;
                            border: 1px solid #374151;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                            max-width: 250px;
                            line-height: 1.4;
                            pointer-events: none;
                          ">
                            <div style="font-weight: 600; color: #93c5fd; margin-bottom: 4px;">Thuế VAT</div>
                            <div style="color: #d1d5db; margin-bottom: 4px;">${vatPercentage}% trên tổng tiền đơn hàng</div>
                            <div style="color: #9ca3af; font-size: 11px;">Không áp dụng cho tiền cọc</div>
                          </div>
                        `;
                        document.body.appendChild(tooltip);

                        const target = e.target as HTMLElement;
                        const rect = target.getBoundingClientRect();
                        const tooltipDiv = tooltip.firstElementChild as HTMLElement;
                        if (tooltipDiv) {
                          tooltipDiv.style.left = rect.left + rect.width / 2 - 125 + 'px';
                          tooltipDiv.style.top = rect.top - 80 + 'px';
                        }
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.getElementById('vat-tooltip');
                        if (tooltip) tooltip.remove();
                      }}
                    >
                      ?
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tiền Cọc
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Đã Trả
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Giấy Tờ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Trạng Thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Thanh Toán
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ghi Chú
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Xuất Hóa Đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                In Biên Nhận
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {orders.map((order, index) => (
              <tr
                key={`${order.id}-${index}`}
                className="hover:bg-gray-700 transition-colors"
                ref={index === orders.length - 1 ? lastElementRef : null}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {formatOrderId(order.id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {order.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {formatDate(order.orderDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {formatDate(order.calculatedReturnDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {formatCurrency(
                    order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100))
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {(() => {
                    // Calculate deposit amount for display
                    if (order.depositType && order.depositValue) {
                      if (order.depositType === 'percent') {
                        // For percentage deposits, calculate based on order total
                        const calculatedAmount = Math.round(
                          order.totalAmount * (order.depositValue / 100)
                        );
                        return formatCurrency(calculatedAmount);
                      } else {
                        // For fixed amount deposits, use the value directly
                        return formatCurrency(order.depositValue);
                      }
                    }
                    // If no deposit info, show 0
                    return formatCurrency(0);
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {formatCurrency(order.paidAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {hasDocument(order) ? 'Có' : 'Không'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {getPaymentStatusBadge(order.paymentStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {order.noteNotComplete}/{order.noteTotal}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  <button
                    onClick={() => handleToggleTaxInvoice(order.id, getTaxInvoiceStatus(order))}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      getTaxInvoiceStatus(order)
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                    }`}
                    title={getTaxInvoiceStatus(order) ? 'Đã xuất hóa đơn' : 'Chưa xuất hóa đơn'}
                  >
                    {getTaxInvoiceStatus(order) ? '✅ Đã xuất' : '❌ Chưa xuất'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  <button
                    onClick={() => handlePrintReceipt(order)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    title="In Biên Nhận"
                  >
                    📄 In
                  </button>
                </td>
              </tr>
            ))}

            {/* Loading indicator for infinite scroll */}
            {loadingMore && (
              <tr>
                <td colSpan={13} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2 text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">Đang tải thêm đơn hàng...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary - Mobile */}
      <div className="block sm:hidden p-4 bg-gray-700 border-t border-gray-600">
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Tổng giá trị:</span>
            <span className="text-white font-medium">
              {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tổng VAT:</span>
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
          </div>
        </div>
      </div>

      {/* Footer summary - Desktop */}
      <div className="hidden sm:block bg-gray-700 px-6 py-4 border-t border-gray-600">
        <div className="flex justify-between text-sm text-gray-300">
          <div className="flex items-center gap-4">
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
