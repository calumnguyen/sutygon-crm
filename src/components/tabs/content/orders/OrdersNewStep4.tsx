import React, { useState } from 'react';
import { OrderItem } from './types';
import { useInventoryFetch } from './hooks';
import { OrderSummaryCustomerInfo } from './step4/OrderSummaryCustomerInfo';
import { OrderSummaryNotes } from './step4/OrderSummaryNotes';
import { OrderSummaryTable } from './step4/OrderSummaryTable';
import { OrderSummaryDocumentDeposit } from './step4/OrderSummaryDocumentDeposit';
import { OrderSummaryPaymentRequirement } from './step4/OrderSummaryPaymentRequirement';

interface Discount {
  id: number;
  discountType: 'vnd' | 'percent';
  discountValue: number;
  discountAmount: number;
  itemizedName: string;
  description: string;
}

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
  createdOrderId: number | null;
  onPaymentSuccess?: () => void;
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
  createdOrderId,
  onPaymentSuccess,
}) => {
  const [depositInfo, setDepositInfo] = useState<null | { type: 'vnd' | 'percent'; value: number }>(
    null
  );
  const [documentInfo, setDocumentInfo] = useState<null | {
    documentType: string;
    documentOther?: string;
    documentName: string;
    documentId: string;
  }>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState(false);

  // Calculate date range for inventory (order date to expected return date)
  const parseDateFromString = (dateStr: string): Date => {
    if (!dateStr || dateStr.length !== 10) return new Date();
    const [day, month, year] = dateStr.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
    return parsedDate;
  };

  const orderDate = date ? parseDateFromString(date) : new Date();

  // Calculate return date based on order items (including extensions)
  const extensionItem = orderItems.find((item) => item.isExtension);
  const extraDays = extensionItem?.extraDays || 0;
  const totalRentalDays = 3 + extraDays;
  const expectedReturnDate = new Date(orderDate);
  expectedReturnDate.setDate(orderDate.getDate() + 2 + extraDays); // Add 2 days for base 3-day rental + extra days

  const { inventory } = useInventoryFetch(
    orderDate.toISOString(),
    expectedReturnDate.toISOString()
  );

  // Use the real order ID from the database
  const orderId = createdOrderId !== null ? createdOrderId.toString() : '0000-A';
  return (
    <div className="p-6 text-white">
      {!isPaymentSubmitted && (
        <button
          className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
          onClick={() => setCurrentStep(2)}
        >
          Quay lại bước 3
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-stretch">
        <OrderSummaryCustomerInfo customer={customer} date={date} orderItems={orderItems} />
        <OrderSummaryPaymentRequirement
          total={orderItems.reduce((sum, i) => sum + i.quantity * i.price, 0)}
          subtotal={orderItems
            .filter((i) => !i.isExtension)
            .reduce((sum, i) => sum + i.quantity * i.price, 0)}
          depositInfo={depositInfo || undefined}
          documentInfo={documentInfo}
          discounts={discounts}
          isPaymentSubmitted={isPaymentSubmitted}
          setIsPaymentSubmitted={setIsPaymentSubmitted}
          orderId={orderId}
          customer={customer}
          date={date}
          orderItems={orderItems}
          notes={notes}
          onPaymentSuccess={onPaymentSuccess}
        />
        <OrderSummaryDocumentDeposit
          orderItems={orderItems}
          setDepositInfo={setDepositInfo}
          setDocumentInfo={setDocumentInfo}
          setDiscounts={setDiscounts}
          discounts={discounts}
          isPaymentSubmitted={isPaymentSubmitted}
          orderId={orderId}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-2">
          <OrderSummaryTable orderItems={orderItems} inventory={inventory} />
        </div>
        <div className="flex flex-col h-full">
          <OrderSummaryNotes notes={notes} orderItems={orderItems} />
        </div>
      </div>
    </div>
  );
};

export default OrdersNewStep4;
