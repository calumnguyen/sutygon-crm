import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { Order } from '@/lib/actions/orders';
import {
  AlertTriangle,
  User,
  Calendar,
  Package,
  Percent,
  Receipt,
  CreditCard,
  Calculator,
} from 'lucide-react';
import { useLazySection } from '@/hooks/useLazySection';
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonInfoCard,
  SkeletonPaymentHistory,
  SkeletonSettlement,
} from '@/components/common/SkeletonLoader';
import {
  OrderCustomerSection,
  OrderDatesSection,
  OrderItemsSection,
  OrderDiscountsSection,
  OrderVATSection,
  OrderDepositSection,
  OrderPaymentHistorySection,
  OrderSettlementSection,
  CustomerDetails,
  OrderItem,
  Discount,
  PaymentHistory,
} from './sections';

interface OrderDetailsContentProps {
  orderId: string;
}

const OrderDetailsContent: React.FC<OrderDetailsContentProps> = ({ orderId }) => {
  const { sessionToken } = useUser();

  // Extract order ID from the tab ID (e.g., "order-details-123" -> "123")
  const actualOrderId = orderId.replace('order-details-', '');

  // Memoize fetch functions to prevent infinite loops
  const fetchOrder = useCallback(async () => {
    const response = await fetch(`/api/orders/${actualOrderId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch order details');
    return response.json();
  }, [actualOrderId, sessionToken]);

  const fetchOrderItems = useCallback(async () => {
    const response = await fetch(`/api/orders/${actualOrderId}/items`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch order items');
    return response.json();
  }, [actualOrderId, sessionToken]);

  const fetchDiscounts = useCallback(async () => {
    const response = await fetch(`/api/orders/${actualOrderId}/discounts`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch discounts');
    const data = await response.json();
    return data.discounts || [];
  }, [actualOrderId, sessionToken]);

  const fetchPaymentHistory = useCallback(async () => {
    const response = await fetch(`/api/orders/${actualOrderId}/payment-history`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch payment history');
    return response.json();
  }, [actualOrderId, sessionToken]);

  // Lazy load order details
  const {
    data: order,
    loading: orderLoading,
    error: orderError,
  } = useLazySection(fetchOrder, { delay: 0, minLoadTime: 300 });

  // Lazy load order items
  const {
    data: orderItems,
    loading: itemsLoading,
    error: itemsError,
  } = useLazySection(fetchOrderItems, { delay: 100, minLoadTime: 300 });

  // Lazy load discounts
  const {
    data: discountsData,
    loading: discountsLoading,
    error: discountsError,
  } = useLazySection(fetchDiscounts, { delay: 300, minLoadTime: 200 });

  // Create customer fetch function that can handle order dependency
  const fetchCustomer = useCallback(async () => {
    // Get the current order data from the hook
    const orderResponse = await fetch(`/api/orders/${actualOrderId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!orderResponse.ok) throw new Error('Failed to fetch order details');
    const orderData = await orderResponse.json();

    if (!orderData?.customerId) return null;
    const response = await fetch(`/api/customers/${orderData.customerId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch customer details');
    return response.json();
  }, [actualOrderId, sessionToken]);

  // Create user names fetch function that can handle discounts dependency
  const fetchUserNames = useCallback(async () => {
    // Get the current discounts data from the hook
    const discountsResponse = await fetch(`/api/orders/${actualOrderId}/discounts`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!discountsResponse.ok) return {};
    const discountsData = await discountsResponse.json();
    const discounts = discountsData.discounts || [];

    if (discounts.length === 0) return {};

    const userIds = new Set<number>();
    discounts.forEach((discount: Discount) => {
      if (discount.requestedByUserId) userIds.add(discount.requestedByUserId);
      if (discount.authorizedByUserId) userIds.add(discount.authorizedByUserId);
    });

    const userNamesMap: Record<number, string> = {};
    for (const userId of userIds) {
      try {
        const userResponse = await fetch(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userNamesMap[userId] = userData.name || `User #${userId}`;
        } else {
          userNamesMap[userId] = `User #${userId}`;
        }
      } catch {
        userNamesMap[userId] = `User #${userId}`;
      }
    }
    return userNamesMap;
  }, [actualOrderId, sessionToken]);

  // Lazy load customer details
  const {
    data: customerDetails,
    loading: customerLoading,
    error: customerError,
  } = useLazySection(fetchCustomer, { delay: 200, minLoadTime: 250 });

  // Lazy load user names for discounts
  const { data: userNames, loading: userNamesLoading } = useLazySection(fetchUserNames, {
    delay: 400,
    minLoadTime: 150,
  });

  // Lazy load payment history
  const {
    data: paymentHistory,
    loading: paymentHistoryLoading,
    error: paymentHistoryError,
  } = useLazySection(fetchPaymentHistory, { delay: 500, minLoadTime: 200 });

  // Show error if order failed to load
  if (orderError || (!orderLoading && !order)) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-2">Lỗi tải dữ liệu</p>
            <p className="text-gray-400">{orderError || 'Không tìm thấy đơn hàng'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Customer Information Section */}
        {customerLoading ? (
          <SkeletonInfoCard
            title="Thông tin khách hàng"
            icon={<User className="w-6 h-6 text-blue-400" />}
          />
        ) : (
          <OrderCustomerSection orderId={order?.id || 0} customerDetails={customerDetails} />
        )}

        {/* Rental Dates Section */}
        {orderLoading ? (
          <SkeletonCard
            title="Thông tin ngày thuê"
            icon={<Calendar className="w-6 h-6 text-green-400" />}
          />
        ) : (
          <OrderDatesSection
            orderDate={order?.orderDate || ''}
            expectedReturnDate={order?.expectedReturnDate || new Date()}
          />
        )}

        {/* Order Items Section */}
        {itemsLoading ? (
          <SkeletonTable
            rows={3}
            title="Danh sách sản phẩm"
            icon={<Package className="w-6 h-6 text-purple-400" />}
          />
        ) : (
          <OrderItemsSection orderItems={orderItems || []} />
        )}

        {/* Discounts Section */}
        {discountsLoading || userNamesLoading ? (
          <SkeletonCard title="Giảm giá" icon={<Percent className="w-6 h-6 text-yellow-400" />} />
        ) : (
          <OrderDiscountsSection discounts={discountsData || []} userNames={userNames || {}} />
        )}

        {/* VAT Section */}
        {orderLoading || itemsLoading ? (
          <SkeletonCard title="Thuế VAT" icon={<Receipt className="w-6 h-6 text-orange-400" />} />
        ) : (
          <OrderVATSection
            orderItems={orderItems || []}
            discounts={discountsData || []}
            vatRate={order?.vatRate || 8}
          />
        )}

        {/* Deposit Section */}
        {orderLoading ? (
          <SkeletonCard
            title="Tiền cọc & Giấy tờ"
            icon={<Receipt className="w-6 h-6 text-indigo-400" />}
          />
        ) : (
          <OrderDepositSection
            depositAmount={order?.depositAmount || 0}
            depositType={order?.depositType as 'vnd' | 'percent'}
            depositValue={order?.depositValue ? Number(order.depositValue) : undefined}
            documentType={order?.documentType}
            documentOther={order?.documentOther}
            documentName={order?.documentName}
            documentId={order?.documentId}
            documentStatus={order?.documentStatus}
            taxInvoiceExported={order?.taxInvoiceExported}
          />
        )}

        {/* Payment History Section */}
        {paymentHistoryLoading ? (
          <SkeletonPaymentHistory
            title="Lịch sử thanh toán"
            icon={<CreditCard className="w-6 h-6 text-cyan-400" />}
          />
        ) : (
          <OrderPaymentHistorySection
            paymentHistory={paymentHistory || []}
            totalPaid={order?.paidAmount || 0}
          />
        )}

        {/* Settlement Section */}
        {orderLoading || itemsLoading ? (
          <SkeletonSettlement
            title="Tất toán"
            icon={<Calculator className="w-6 h-6 text-green-400" />}
          />
        ) : (
          <OrderSettlementSection
            totalAmount={(orderItems || []).reduce(
              (sum: number, item: OrderItem) => sum + item.price * item.quantity,
              0
            )}
            vatAmount={order?.vatAmount || 0}
            depositAmount={order?.depositAmount || 0}
            discountAmount={(discountsData || []).reduce(
              (sum: number, discount: Discount) => sum + discount.discountAmount,
              0
            )}
            paidAmount={order?.paidAmount || 0}
            depositReturned={0} // TODO: Get from order data when available
          />
        )}
      </div>
    </div>
  );
};

export default OrderDetailsContent;
