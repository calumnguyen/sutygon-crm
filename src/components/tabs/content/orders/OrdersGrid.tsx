import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Order } from '@/lib/actions/orders';
import { TRANSLATIONS } from '@/config/translations';
import { generateReceiptPDF, ReceiptData } from '@/lib/utils/pdfGenerator';
import { useUser } from '@/context/UserContext';
import {
  Clock,
  Calendar,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Package,
  Printer,
  Eye,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Phone,
  Building,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { WarningAffectedOrdersModal } from './WarningAffectedOrdersModal';

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
  warning?: string;
  warningResolved?: boolean;
  warningResolvedAt?: string | null;
  warningResolvedBy?: number | null;
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

interface CustomerDetails {
  id: number;
  name: string;
  phone: string;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
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
  const [customerDetails, setCustomerDetails] = useState<Record<number, CustomerDetails>>({});
  const [loadingCustomers, setLoadingCustomers] = useState<Record<number, boolean>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [resolvingWarnings, setResolvingWarnings] = useState<Record<number, boolean>>({});
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [currentWarningItem, setCurrentWarningItem] = useState<OrderItem | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setOrders(initialOrders);
    // Clear the order items cache when orders change (e.g., after refresh)
    setOrderItems({});
    setLoadingItems({});
  }, [initialOrders]);

  // Fetch customer details for each order
  const fetchCustomerDetails = useCallback(
    async (customerId: number) => {
      if (customerDetails[customerId] || loadingCustomers[customerId]) return;

      setLoadingCustomers((prev) => ({ ...prev, [customerId]: true }));

      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const customer = await response.json();
          setCustomerDetails((prev) => ({ ...prev, [customerId]: customer }));
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
      } finally {
        setLoadingCustomers((prev) => ({ ...prev, [customerId]: false }));
      }
    },
    [customerDetails, loadingCustomers, sessionToken]
  );

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

  // Helper function to count unresolved warnings in items
  const getWarningCount = (items: OrderItem[]) => {
    return items.filter((item) => item.warning && !item.warningResolved).length;
  };

  // Handle image modal
  const handleImageClick = (orderId: number) => {
    const items = orderItems[orderId] || [];
    if (items.length > 0) {
      setCurrentOrderItems(items);
      setCurrentImageIndex(0);
      setImageModalOpen(true);
    }
  };

  // Handle warning resolution
  const handleResolveWarning = async (orderItemId: number, resolved: boolean) => {
    setResolvingWarnings((prev) => ({ ...prev, [orderItemId]: true }));

    // Store original state for rollback
    const originalOrderItems = { ...orderItems };
    const originalCurrentOrderItems = [...currentOrderItems];

    // Optimistic update - immediately show the resolved state
    setOrderItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((orderId) => {
        updated[parseInt(orderId)] = updated[parseInt(orderId)].map((item) =>
          item.id === orderItemId
            ? {
                ...item,
                warningResolved: resolved,
                warningResolvedAt: resolved ? new Date().toISOString() : null,
                warningResolvedBy: resolved ? 1 : null, // TODO: Get actual user ID
              }
            : item
        );
      });
      return updated;
    });

    // Also update currentOrderItems for the modal
    setCurrentOrderItems((prev) =>
      prev.map((item) =>
        item.id === orderItemId
          ? {
              ...item,
              warningResolved: resolved,
              warningResolvedAt: resolved ? new Date().toISOString() : null,
              warningResolvedBy: resolved ? 1 : null,
            }
          : item
      )
    );

    try {
      const response = await fetch('/api/orders/resolve-warning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ orderItemId, resolved }),
      });

      if (!response.ok) {
        console.error('Failed to resolve warning');
        // Rollback on failure
        setOrderItems(originalOrderItems);
        setCurrentOrderItems(originalCurrentOrderItems);
      }
    } catch (error) {
      console.error('Error resolving warning:', error);
      // Rollback on error
      setOrderItems(originalOrderItems);
      setCurrentOrderItems(originalCurrentOrderItems);
    } finally {
      setResolvingWarnings((prev) => ({ ...prev, [orderItemId]: false }));
    }
  };

  // Handle showing warning modal
  const handleShowWarningModal = (item: OrderItem) => {
    setCurrentWarningItem(item);
    setWarningModalOpen(true);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < currentOrderItems.length - 1 ? prev + 1 : 0));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : currentOrderItems.length - 1));
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setCurrentImageIndex(0);
    setCurrentOrderItems([]);
  };

  // Fetch customer details for new orders
  useEffect(() => {
    orders.forEach((order) => {
      if (!customerDetails[order.customerId] && !loadingCustomers[order.customerId]) {
        fetchCustomerDetails(order.customerId);
      }
    });
  }, [orders, customerDetails, loadingCustomers, fetchCustomerDetails]);

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

  const formatVietnameseDate = (date: Date | string) => {
    const dateObj = new Date(date);
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[dateObj.getDay()];
    const formattedDate = dateObj.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dayName}, ${formattedDate}`;
  };

  const calculateDays = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
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

            // Calculate total amount including VAT and deposit
            const totalWithVat =
              order.totalAmount +
              (order.vatAmount || Math.round(order.totalAmount * (vatPercentage / 100)));

            // Check if we need to refund deposit
            const needsDepositRefund = order.paidAmount > totalWithVat;
            const refundAmount = needsDepositRefund
              ? Math.min(depositAmount, order.paidAmount - totalWithVat)
              : 0;

            // Get order items for this order
            const items = orderItems[order.id] || [];
            const displayItem = getDisplayItem(items);
            const itemCount = items.length;

            return (
              <div
                key={`${order.id}-${index}`}
                ref={index === orders.length - 1 ? lastElementRef : null}
                className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl border border-slate-700/50 hover:border-slate-600/70 hover:shadow-2xl transition-all duration-300 overflow-hidden backdrop-blur-sm"
              >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-b border-slate-700/50 backdrop-blur-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      {/* Order ID and Customer Name */}
                      <div className="mb-3">
                        <div className="text-xl font-bold text-white mb-1">
                          {formatOrderId(order.id)}
                        </div>
                        <div className="text-slate-200 font-medium text-sm leading-tight max-w-xs">
                          <div className="line-clamp-2">
                            {customerDetails[order.customerId]?.name || order.customerName}
                          </div>
                        </div>
                      </div>

                      {/* Customer Details Card */}
                      {customerDetails[order.customerId] && (
                        <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/50 backdrop-blur-sm">
                          <div className="space-y-1.5">
                            {customerDetails[order.customerId].phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-emerald-400" />
                                <span className="text-slate-300 font-medium">
                                  {customerDetails[order.customerId].phone}
                                </span>
                              </div>
                            )}
                            {customerDetails[order.customerId].company && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building className="w-4 h-4 text-purple-400" />
                                <span className="text-slate-300 font-medium">
                                  {customerDetails[order.customerId].company}
                                </span>
                              </div>
                            )}
                            {customerDetails[order.customerId].address && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-amber-400" />
                                <span className="text-slate-300 font-medium">
                                  {customerDetails[order.customerId].address}
                                </span>
                              </div>
                            )}
                            {customerDetails[order.customerId].notes && (
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-300 font-medium">
                                  {customerDetails[order.customerId].notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 ${
                          order.status === 'Processing'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : order.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : order.status === 'Cancelled'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {order.status === 'Processing' ? (
                          <>
                            <Clock className="w-4 h-4" />
                            Đang xử lý
                          </>
                        ) : order.status === 'Completed' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Hoàn thành
                          </>
                        ) : order.status === 'Cancelled' ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            Đã hủy
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            {order.status}
                          </>
                        )}
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 ${
                          order.paymentStatus === 'Paid Full'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : order.paymentStatus === 'Paid Full with Deposit'
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30'
                              : order.paymentStatus === 'Partially Paid'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : order.paymentStatus === 'Unpaid'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {order.paymentStatus === 'Paid Full' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {TRANSLATIONS.orders.paymentStatus['Paid Full']}
                          </>
                        ) : order.paymentStatus === 'Paid Full with Deposit' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {TRANSLATIONS.orders.paymentStatus['Paid Full with Deposit']}
                          </>
                        ) : order.paymentStatus === 'Partially Paid' ? (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            {TRANSLATIONS.orders.paymentStatus['Partially Paid']}
                          </>
                        ) : order.paymentStatus === 'Unpaid' ? (
                          <>
                            <CreditCard className="w-4 h-4" />
                            {TRANSLATIONS.orders.paymentStatus['Unpaid']}
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            {TRANSLATIONS.orders.paymentStatus[
                              order.paymentStatus as keyof typeof TRANSLATIONS.orders.paymentStatus
                            ] || order.paymentStatus}
                          </>
                        )}
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
                      <div className="flex items-center gap-3 text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <CalendarDays className="w-5 h-5 text-blue-400" />
                        <div className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span>
                              {formatVietnameseDate(order.orderDate)} →{' '}
                              {formatVietnameseDate(order.calculatedReturnDate)}
                            </span>
                            <span className="text-blue-400 font-semibold">
                              ({calculateDays(order.orderDate, order.calculatedReturnDate)} ngày)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="space-y-3 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                          <span className="text-slate-300 font-medium flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            Tổng tiền
                          </span>
                          <span className="text-white font-bold text-lg">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">VAT ({vatPercentage}%)</span>
                          <span className="text-slate-200">
                            {formatCurrency(
                              order.vatAmount ||
                                Math.round(order.totalAmount * (vatPercentage / 100))
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Tiền cọc</span>
                          <span className="text-slate-200">{formatCurrency(depositAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Đã trả</span>
                          <span className="text-slate-200">{formatCurrency(order.paidAmount)}</span>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-3">
                        {/* Remaining Balance */}
                        <div
                          className={`p-4 rounded-lg border-2 backdrop-blur-sm transition-all duration-200 ${
                            remainingBalance > 0
                              ? 'bg-red-500/10 border-red-500/30 text-red-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span
                              className={`text-sm font-semibold flex items-center gap-2 ${
                                remainingBalance > 0 ? 'text-red-300' : 'text-emerald-300'
                              }`}
                            >
                              {remainingBalance > 0 ? (
                                <>
                                  <AlertTriangle className="w-4 h-4" />
                                  Còn nợ
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Đã thanh toán đủ
                                </>
                              )}
                            </span>
                            <span
                              className={`text-xl font-bold ${
                                remainingBalance > 0 ? 'text-red-200' : 'text-emerald-200'
                              }`}
                            >
                              {formatCurrency(remainingBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Deposit Refund Notice */}
                        {needsDepositRefund && refundAmount > 0 && (
                          <div className="p-4 rounded-lg border-2 bg-amber-500/10 border-amber-500/30 backdrop-blur-sm transition-all duration-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Cần hoàn tiền cọc
                              </span>
                              <span className="text-lg font-bold text-amber-200">
                                {formatCurrency(refundAmount)}
                              </span>
                            </div>
                            <div className="text-xs text-amber-400 mt-1">
                              Khách đã trả thừa, cần hoàn lại tiền cọc
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="flex gap-3">
                        <span
                          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200 ${
                            hasDocument(order)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          {hasDocument(order) ? 'Có giấy tờ' : 'Không giấy tờ'}
                        </span>
                        <span className="px-3 py-2 rounded-lg bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-medium flex items-center gap-2">
                          <Receipt className="w-3 h-3" />
                          {order.noteTotal > 0
                            ? `${order.noteNotComplete}/${order.noteTotal} ghi chú`
                            : 'Không có ghi chú'}
                        </span>
                      </div>
                    </div>

                    {/* Right Side - Product Image */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        Sản phẩm
                      </div>
                      <div className="relative">
                        {/* Main image */}
                        <div
                          className="w-32 h-40 bg-slate-700/50 rounded-lg border border-slate-600/50 overflow-hidden backdrop-blur-sm cursor-pointer hover:border-slate-500/70 transition-colors"
                          onClick={() => handleImageClick(order.id)}
                        >
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
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-2">
                              <div className="flex flex-col items-center">
                                <Package className="w-6 h-6 mb-1 text-slate-500" />
                                <div className="truncate">{displayItem.name}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-2">
                              <div className="flex flex-col items-center">
                                <Package className="w-6 h-6 mb-1 text-slate-500" />
                                <div>Không có</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Item count badge */}
                        {itemCount > 1 && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500/90 rounded-full border-2 border-slate-800 flex items-center justify-center shadow-lg backdrop-blur-sm">
                            <span className="text-xs text-white font-bold">+{itemCount - 1}</span>
                          </div>
                        )}

                        {/* Warning badge */}
                        {(() => {
                          const warningCount = getWarningCount(items);
                          const hasUnresolvedWarnings = warningCount > 0;

                          if (hasUnresolvedWarnings) {
                            return (
                              <div className="absolute -top-2 -left-2 w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-3 border-slate-800 flex items-center justify-center shadow-lg backdrop-blur-sm">
                                <span className="text-sm text-white font-bold">{warningCount}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-slate-800/50 border-t border-slate-700/50 space-y-3 backdrop-blur-sm">
                  <button
                    onClick={() => handleToggleTaxInvoice(order.id, getTaxInvoiceStatus(order))}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      getTaxInvoiceStatus(order)
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60'
                        : 'bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 border border-slate-600/40 hover:border-slate-600/60 hover:text-white'
                    }`}
                    title={getTaxInvoiceStatus(order) ? 'Đã xuất hóa đơn' : 'Chưa xuất hóa đơn'}
                  >
                    {getTaxInvoiceStatus(order) ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Đã xuất hóa đơn
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Chưa xuất hóa đơn
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handlePrintReceipt(order)}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 hover:border-blue-500/60 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    title="In Biên Nhận"
                  >
                    <Printer className="w-4 h-4" />
                    In Biên Nhận
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator for infinite scroll */}
        {loadingMore && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-3 text-slate-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span className="text-sm">Đang tải thêm đơn hàng...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="bg-slate-800/80 px-6 py-4 border-t border-slate-700/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between text-sm text-slate-300 gap-2">
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

      {/* Image Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Sản phẩm đơn hàng ({currentImageIndex + 1}/{currentOrderItems.length})
              </h3>
              <button
                onClick={closeImageModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {currentOrderItems.length > 0 && (
                <div className="flex gap-6">
                  {/* Image Section */}
                  <div className="flex-1">
                    <div className="relative">
                      <div className="w-full h-80 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        {currentOrderItems[currentImageIndex]?.imageUrl ? (
                          <img
                            src={currentOrderItems[currentImageIndex].imageUrl}
                            alt={currentOrderItems[currentImageIndex].name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-slate-600" />
                          </div>
                        )}
                      </div>

                      {/* Navigation Buttons */}
                      {currentOrderItems.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-800/80 hover:bg-slate-700/80 text-white p-2 rounded-full transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800/80 hover:bg-slate-700/80 text-white p-2 rounded-full transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Navigation Dots */}
                    {currentOrderItems.length > 1 && (
                      <div className="flex justify-center space-x-2 mt-4">
                        {currentOrderItems.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentImageIndex
                                ? 'bg-blue-500'
                                : 'bg-slate-600 hover:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Item Details Section */}
                  <div className="flex-1">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Tên sản phẩm:</span>
                          <span className="text-white font-medium text-right">
                            {currentOrderItems[currentImageIndex]?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Mã sản phẩm:</span>
                          <span className="text-white font-medium text-right">
                            {currentOrderItems[currentImageIndex]?.formattedId || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Kích thước:</span>
                          <span className="text-white font-medium text-right">
                            {currentOrderItems[currentImageIndex]?.size || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Số lượng:</span>
                          <span className="text-white font-medium text-right">
                            {currentOrderItems[currentImageIndex]?.quantity || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Giá:</span>
                          <span className="text-white font-medium text-right">
                            {formatCurrency(currentOrderItems[currentImageIndex]?.price || 0)}
                          </span>
                        </div>
                        {currentOrderItems[currentImageIndex]?.warning && (
                          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-sm font-medium">
                                  Cảnh báo tồn kho
                                </span>
                              </div>
                              {!currentOrderItems[currentImageIndex].warningResolved && (
                                <button
                                  onClick={() =>
                                    handleResolveWarning(
                                      currentOrderItems[currentImageIndex].id,
                                      true
                                    )
                                  }
                                  disabled={
                                    resolvingWarnings[currentOrderItems[currentImageIndex].id]
                                  }
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
                                >
                                  {resolvingWarnings[currentOrderItems[currentImageIndex].id]
                                    ? 'Đang xử lý...'
                                    : 'Đã xử lý'}
                                </button>
                              )}
                              {currentOrderItems[currentImageIndex].warningResolved && (
                                <div className="text-green-400 text-xs flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Đã xử lý</span>
                                </div>
                              )}
                            </div>

                            <div className="text-red-200 text-sm mb-3">
                              {currentOrderItems[currentImageIndex].warning}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                              <span className="text-red-300 text-xs">Đơn hàng bị ảnh hưởng</span>
                              <button
                                onClick={() =>
                                  handleShowWarningModal(currentOrderItems[currentImageIndex])
                                }
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Affected Orders Modal */}
      {currentWarningItem && (
        <WarningAffectedOrdersModal
          isOpen={warningModalOpen}
          onClose={() => {
            setWarningModalOpen(false);
            setCurrentWarningItem(null);
          }}
          orderItemId={currentWarningItem.id}
          inventoryItemId={currentWarningItem.inventoryItemId!}
          size={currentWarningItem.size}
          itemName={currentWarningItem.name}
          warningMessage={currentWarningItem.warning!}
        />
      )}
    </div>
  );
};
