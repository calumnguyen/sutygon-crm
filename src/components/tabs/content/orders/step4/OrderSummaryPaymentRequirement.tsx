import React, { useState, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useOrderPayment } from './useOrderPayment';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import PaymentMethodModal from './PaymentMethodModal';
import PrintReceiptModal from './PrintReceiptModal';
import VietQRModal from './VietQRModal';
import { DocumentRetentionModal } from './DocumentRetentionModal';
import { PayLaterConfirmationModal } from './PayLaterConfirmationModal';

/**
 * Payment summary card for step 4 summary.
 * @param total Order subtotal (excluding extension)
 * @param subtotal Order total (including extension)
 * @param depositInfo Deposit info object (optional)
 * @param isPaymentSubmitted Payment submission status
 * @param setIsPaymentSubmitted Function to set payment submission status
 * @param orderId Order ID
 */

// Types
interface DepositInfo {
  type: 'vnd' | 'percent';
  value: number;
}

interface OrderSummaryPaymentRequirementProps {
  total: number;
  subtotal: number;
  depositInfo?: DepositInfo;
  documentInfo?: {
    documentType: string;
    documentOther?: string;
    documentName: string;
    documentId: string;
  } | null;
  isPaymentSubmitted: boolean;
  setIsPaymentSubmitted: (v: boolean) => void;
  orderId: string;
  customer: { id: number; name: string; address?: string; phone?: string } | null;
  date: string;
  orderItems: Array<{
    inventoryItemId?: number | null;
    name: string;
    size: string;
    quantity: number;
    price: number;
    isExtension?: boolean;
    extraDays?: number | null;
    feeType?: string | null;
    percent?: number | null;
    isCustom?: boolean;
  }>;
  notes: Array<{
    itemId: string | null;
    text: string;
    done: boolean;
  }>;
  onPaymentSuccess?: () => void;
}

export const OrderSummaryPaymentRequirement: React.FC<OrderSummaryPaymentRequirementProps> = ({
  total,
  subtotal,
  depositInfo,
  documentInfo,
  isPaymentSubmitted,
  setIsPaymentSubmitted,
  orderId,
  customer,
  date,
  orderItems,
  notes,
  onPaymentSuccess,
}) => {
  const [vatPercentage, setVatPercentage] = useState(8);

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
  // Derived values - calculate totalPay first
  const depositValue = depositInfo
    ? depositInfo.type === 'vnd'
      ? depositInfo.value
      : Math.round(subtotal * (depositInfo.value / 100))
    : 0;
  const vatAmount = Math.round(total * (vatPercentage / 100)); // 8% VAT
  const totalPay = total + vatAmount + depositValue;

  // Calculate return date based on order items (including extensions)
  const extensionItem = orderItems.find((item) => item.isExtension);
  const extraDays = extensionItem?.extraDays || 0;
  const totalRentalDays = 3 + extraDays;

  // Parse date reliably and set to Vietnam time (UTC+7)
  const [day, month, year] = date.split('/').map(Number);
  const orderDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues

  // Adjust to Vietnam timezone (UTC+7)
  const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
  const orderDateVietnam = new Date(orderDate.getTime() + vietnamOffset);

  const expectedReturnDate = new Date(orderDateVietnam);
  expectedReturnDate.setDate(orderDateVietnam.getDate() + 2 + extraDays); // Add 2 days for base 3-day rental + extra days

  // Prepare order data for payment (only if order doesn't exist yet)
  const orderData =
    orderId === '0000-A'
      ? {
          customerId: customer?.id || 0,
          orderDate: (() => {
            const [day, month, year] = date.split('/').map(Number);
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          })(), // Convert dd/MM/yyyy to yyyy-MM-dd
          expectedReturnDate: expectedReturnDate.toISOString().split('T')[0],
          totalAmount: total,
          depositAmount: depositValue,
          items: orderItems.map((item) => ({
            inventoryItemId: item.inventoryItemId || null,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            isExtension: item.isExtension || false,
            extraDays: item.extraDays || null,
            feeType: item.feeType || null,
            percent: item.percent || null,
            isCustom: item.isCustom || false,
          })),
          notes: notes.map((note) => ({
            itemId: note.itemId,
            text: note.text,
            done: note.done,
          })),
        }
      : null;

  // Use the useOrderPayment hook for all payment state/handlers
  const payment = useOrderPayment(
    totalPay,
    orderId,
    orderData,
    documentInfo,
    depositInfo,
    onPaymentSuccess,
    setIsPaymentSubmitted,
    customer?.name,
    customer?.address || 'N/A',
    customer?.phone || 'N/A',
    date,
    date,
    expectedReturnDate.toLocaleDateString('vi-VN')
  );

  // Effects
  useEffect(() => {
    if (payment.showQRModal) {
      payment.setQrSVG(null);
      payment.setQrError(null);
      payment.setQrLoading(true);
      fetch('https://api.vietqr.io/v2/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNo: '1129999',
          accountName: 'NGUYEN HUU TAN',
          acqId: '970403', // Sacombank BIN
          amount: totalPay,
          addInfo: `CK #${orderId}`,
          format: 'svg',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.data && data.data.qrDataURL) {
            payment.setQrSVG(data.data.qrDataURL);
          } else {
            payment.setQrError('Không thể tạo mã QR.');
          }
        })
        .catch(() => payment.setQrError('Không thể tạo mã QR.'))
        .finally(() => payment.setQrLoading(false));
    }
  }, [payment.showQRModal, totalPay, orderId]);

  useEffect(() => {
    if (payment.paidAmount >= totalPay) {
      payment.setPaymentComplete(true);
      payment.setChangeAmount(payment.paidAmount - totalPay);
    } else {
      payment.setPaymentComplete(false);
      payment.setChangeAmount(0);
    }
  }, [payment.paidAmount, totalPay]);

  // Handlers
  function handlePaymentOption(option: 'full' | 'partial' | 'later') {
    if (option === 'full') {
      payment.setShowPaymentMethodModal(true);
    } else {
      // TODO: Implement payment logic for partial or later payment
      console.log('Payment option selected:', option);
      payment.setShowPaymentModal(false);
    }
  }

  function handlePaymentMethod(method: 'cash' | 'qr') {
    payment.setSelectedPaymentMethod(method);
    if (method === 'qr') {
      payment.setQrSVG(null);
      payment.setQrError(null);
      payment.setQrLoading(true);
      payment.setShowQRModal(true);
      payment.setShowPaymentMethodModal(false);
      payment.setShowPaymentModal(false);
    }
  }

  function handleAmountInput(value: string) {
    if (/^\d*$/.test(value)) {
      payment.setInputAmount(value);
    }
  }

  function handleAddPayment() {
    const amount = parseInt(payment.inputAmount) || 0;
    if (amount > 0 && !payment.paymentComplete) {
      payment.setPaidAmount((prev) => prev + amount);
      payment.setInputAmount('');
    }
  }

  function handleQuickAmount(amount: number) {
    if (!payment.paymentComplete) {
      payment.setPaidAmount((prev) => prev + amount);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPayment();
    }
  }

  function handleCloseModal() {
    if (payment.paymentComplete) {
      payment.setShowPrintModal(true);
      setIsPaymentSubmitted(true);
    }
    payment.setShowPaymentMethodModal(false);
    payment.setShowPaymentModal(false);
    payment.setPaidAmount(0);
    payment.setInputAmount('');
    payment.setPaymentComplete(false);
    payment.setChangeAmount(0);
    payment.setSelectedPaymentMethod(null);
  }

  function handlePrint() {
    window.print();
    payment.setShowPrintModal(false);
  }

  function handleClosePrintModal() {
    payment.setShowPrintModal(false);
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-3 shadow flex flex-col gap-2">
        <div className="text-base font-bold text-pink-400 mb-1 text-left">Thông Tin Thanh Toán</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">Tổng tiền đơn hàng</span>
          <span className="text-white font-bold">{total.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">VAT ({vatPercentage}%)</span>
          <span className="text-white font-bold">{vatAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">Tiền cọc</span>
          <span className="text-white font-bold flex flex-col items-end">
            {depositInfo ? (
              depositInfo.type === 'vnd' ? (
                depositInfo.value.toLocaleString('vi-VN') + ' đ'
              ) : (
                <>
                  {Math.round(subtotal * (depositInfo.value / 100)).toLocaleString('vi-VN')} đ
                  <span className="text-xs text-blue-200 mt-0.5">
                    ({depositInfo.value}% của đơn hàng)
                  </span>
                </>
              )
            ) : (
              '0 đ'
            )}
          </span>
        </div>
        {isPaymentSubmitted && payment.selectedPaymentMethod === 'qr' ? (
          <>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Thanh Toán Toàn Bộ - CK QR</span>
              <span className="text-white font-bold">- {totalPay.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Trạng Thái Thanh Toán</span>
              <span className="text-green-400 font-bold">
                Hoàn Tất{depositValue > 0 ? ' - Có Đặt Cọc' : ''}
              </span>
            </div>
          </>
        ) : isPaymentSubmitted ? (
          <>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Thanh Toán Toàn Bộ - Tiền Mặt</span>
              <span className="text-white font-bold">- {totalPay.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Trạng Thái Thanh Toán</span>
              <span className="text-green-400 font-bold">
                Hoàn Tất{depositValue > 0 ? ' - Có Đặt Cọc' : ''}
              </span>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between text-base mt-2 border-t border-gray-700 pt-2">
          <span className="text-white font-semibold">Số Tiền Cần Trả</span>
          <span className="text-green-400 font-bold text-lg">
            {isPaymentSubmitted ? '0 đ' : totalPay.toLocaleString('vi-VN') + ' đ'}
          </span>
        </div>
        {!isPaymentSubmitted && (
          <button
            className="mt-3 w-full py-2 rounded bg-pink-600 hover:bg-pink-700 text-white font-bold text-base shadow transition-colors"
            onClick={() => payment.setShowPaymentModal(true)}
          >
            Thanh Toán
          </button>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        show={payment.showPaymentModal}
        onClose={payment.resetAllPaymentState}
        onPaymentOption={payment.handlePaymentOption}
        hasDeposit={depositInfo ? depositInfo.value > 0 : false}
      />

      {/* Payment Method Selection Modal */}
      <PaymentMethodModal
        show={payment.showPaymentMethodModal}
        onClose={payment.handleCloseModal}
        selectedPaymentMethod={payment.selectedPaymentMethod}
        onSelectMethod={payment.handlePaymentMethod}
        totalPay={payment.totalPay}
        paidAmount={payment.paidAmount}
        paymentComplete={payment.paymentComplete}
        inputAmount={payment.inputAmount}
        onInputAmount={payment.handleAmountInput}
        onKeyPress={payment.handleKeyPress}
        onAddPayment={payment.handleAddPayment}
        onQuickAmount={payment.handleQuickAmount}
        onConfirmPayment={payment.handleConfirmPayment}
        isPartialPayment={payment.isPartialPayment}
        partialAmount={payment.partialAmount}
        onPartialAmountChange={payment.setPartialAmount}
      />

      {/* Partial Payment Modal */}
      {/* Removed PartialPaymentModal */}

      {/* Print Receipt Modal */}
      <PrintReceiptModal
        show={payment.showPrintModal}
        onPrint={payment.handlePrint}
        onClose={payment.handleClosePrintModal}
      />

      {/* VietQR Modal */}
      <VietQRModal
        show={payment.showQRModal}
        qrLoading={payment.qrLoading}
        qrError={payment.qrError}
        qrSVG={payment.qrSVG}
        totalPay={
          payment.isPartialPayment && payment.partialAmount
            ? parseInt(payment.partialAmount) || 0
            : payment.totalPay
        }
        orderId={orderId}
        onConfirm={payment.handleConfirmQRPayment}
        onCancel={payment.handleCancelQRPayment}
      />

      {/* Document Retention Modal */}
      {documentInfo && (
        <DocumentRetentionModal
          show={payment.showDocumentRetentionModal}
          documentType={documentInfo.documentType}
          documentName={documentInfo.documentName}
          onConfirm={payment.handleConfirmDocumentRetention}
        />
      )}

      {/* Pay Later Confirmation Modal */}
      <PayLaterConfirmationModal
        show={payment.showPayLaterModal}
        onConfirm={payment.handlePayLaterConfirm}
        onCancel={payment.handlePayLaterCancel}
      />
    </>
  );
};
