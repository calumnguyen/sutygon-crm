import React, { useState } from 'react';
import { OrderItem } from './types';
import { OrderSummaryCustomerInfo } from './step4/OrderSummaryCustomerInfo';
import { OrderSummaryNotes } from './step4/OrderSummaryNotes';
import { OrderSummaryTable } from './step4/OrderSummaryTable';
import { OrderSummaryDocumentDeposit } from './step4/OrderSummaryDocumentDeposit';
import { OrderSummaryPaymentRequirement } from './step4/OrderSummaryPaymentRequirement';

interface Customer {
  id: number;
  name: string;
  company?: string | null;
  phone: string;
}

interface Note {
  id: string;
  itemId: string | null;
  text: string;
  done: boolean;
}

interface OrdersNewStep4Props {
  customer: Customer | null;
  date: string;
  orderItems: OrderItem[];
  notes: Note[];
  setCurrentStep: (step: number) => void;
}

/**
 * Step 4 summary/review page for new order flow.
 * Modular, maintainable, and <120 lines.
 */
const OrdersNewStep4: React.FC<OrdersNewStep4Props> = ({
  customer,
  date,
  orderItems,
  notes,
  setCurrentStep,
}) => {
  const [depositInfo, setDepositInfo] = useState<null | { type: 'vnd' | 'percent'; value: number }>(
    null
  );
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState(false);
  const [orderId] = useState(() => {
    // You could persist this in localStorage or get from backend
    const last = window.localStorage.getItem('sutygon-last-order-id');
    if (last) {
      const n = parseInt(last.split('-')[0], 10) + 1;
      const id = n.toString().padStart(4, '0') + '-A';
      window.localStorage.setItem('sutygon-last-order-id', id);
      return id;
    } else {
      window.localStorage.setItem('sutygon-last-order-id', '0000-A');
      return '0000-A';
    }
  });
  return (
    <div className="p-6 text-white">
      {isPaymentSubmitted && (
        <div
          className="mb-4 px-4 py-2 rounded bg-green-600 text-white text-base font-semibold shadow flex items-center justify-center border border-green-400"
          style={{ minHeight: 0, lineHeight: 1.4 }}
        >
          Đơn hàng <span className="mx-1 font-mono bg-black/20 px-2 py-0.5 rounded">{orderId}</span>{' '}
          đã được gửi thành công với trạng thái{' '}
          <span className="ml-1 font-bold text-green-200">Đang xử lý</span>
        </div>
      )}
      {!isPaymentSubmitted && (
        <button
          className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
          onClick={() => setCurrentStep(2)}
        >
          Quay lại bước 3
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-stretch">
        <OrderSummaryCustomerInfo customer={customer} date={date} />
        <OrderSummaryPaymentRequirement
          total={orderItems.reduce((sum, i) => sum + i.quantity * i.price, 0)}
          subtotal={orderItems
            .filter((i) => !i.isExtension)
            .reduce((sum, i) => sum + i.quantity * i.price, 0)}
          depositInfo={depositInfo || undefined}
          isPaymentSubmitted={isPaymentSubmitted}
          setIsPaymentSubmitted={setIsPaymentSubmitted}
          orderId={orderId}
        />
        <OrderSummaryDocumentDeposit
          orderItems={orderItems}
          setDepositInfo={setDepositInfo}
          isPaymentSubmitted={isPaymentSubmitted}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-2">
          <OrderSummaryTable orderItems={orderItems} />
        </div>
        <div className="flex flex-col h-full">
          <OrderSummaryNotes notes={notes} orderItems={orderItems} />
        </div>
      </div>
    </div>
  );
};

export default OrdersNewStep4;
