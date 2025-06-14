import React, { useState, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useOrderPayment } from './useOrderPayment';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import PaymentMethodModal from './PaymentMethodModal';
import PrintReceiptModal from './PrintReceiptModal';
import VietQRModal from './VietQRModal';

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
  isPaymentSubmitted: boolean;
  setIsPaymentSubmitted: (v: boolean) => void;
  orderId: string;
}

export const OrderSummaryPaymentRequirement: React.FC<OrderSummaryPaymentRequirementProps> = ({
  total,
  subtotal,
  depositInfo,
  isPaymentSubmitted,
  setIsPaymentSubmitted,
  orderId,
}) => {
  // State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSVG, setQrSVG] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'qr' | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [qrConfirmed, setQrConfirmed] = useState(false);

  // Derived values
  const depositValue = depositInfo
    ? depositInfo.type === 'vnd'
      ? depositInfo.value
      : Math.round(subtotal * (depositInfo.value / 100))
    : 0;
  const totalPay = total + depositValue;

  // Effects
  useEffect(() => {
    if (showQRModal) {
      setQrSVG(null);
      setQrError(null);
      setQrLoading(true);
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
        .then(res => res.json())
        .then(data => {
          if (data.data && data.data.qrDataURL) {
            setQrSVG(data.data.qrDataURL);
          } else {
            setQrError('Không thể tạo mã QR.');
          }
        })
        .catch(() => setQrError('Không thể tạo mã QR.'))
        .finally(() => setQrLoading(false));
    }
  }, [showQRModal, totalPay, orderId]);

  useEffect(() => {
    if (paidAmount >= totalPay) {
      setPaymentComplete(true);
      setChangeAmount(paidAmount - totalPay);
    } else {
      setPaymentComplete(false);
      setChangeAmount(0);
    }
  }, [paidAmount, totalPay]);

  // Handlers
  function handlePaymentOption(option: 'full' | 'partial' | 'later') {
    if (option === 'full') {
      setShowPaymentMethodModal(true);
    } else {
      // TODO: Implement payment logic for partial or later payment
      console.log('Payment option selected:', option);
      setShowPaymentModal(false);
    }
  }

  function handlePaymentMethod(method: 'cash' | 'qr') {
    setSelectedPaymentMethod(method);
    if (method === 'qr') {
      setQrSVG(null);
      setQrError(null);
      setQrLoading(true);
      setShowQRModal(true);
      setShowPaymentMethodModal(false);
      setShowPaymentModal(false);
    }
  }

  function handleAmountInput(value: string) {
    if (/^\d*$/.test(value)) {
      setInputAmount(value);
    }
  }

  function handleAddPayment() {
    const amount = parseInt(inputAmount) || 0;
    if (amount > 0 && !paymentComplete) {
      setPaidAmount(prev => prev + amount);
      setInputAmount('');
    }
  }

  function handleQuickAmount(amount: number) {
    if (!paymentComplete) {
      setPaidAmount(prev => prev + amount);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPayment();
    }
  }

  function handleConfirmPayment() {
    setShowPrintModal(true);
    setShowPaymentMethodModal(false);
    setShowPaymentModal(false);
    setIsPaymentSubmitted(true);
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setSelectedPaymentMethod(null);
  }

  function handleCloseModal() {
    if (paymentComplete) {
      setShowPrintModal(true);
      setIsPaymentSubmitted(true);
    }
    setShowPaymentMethodModal(false);
    setShowPaymentModal(false);
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setSelectedPaymentMethod(null);
  }

  function handlePrint() {
    window.print();
    setShowPrintModal(false);
  }

  function handleClosePrintModal() {
    setShowPrintModal(false);
  }

  function handleConfirmQRPayment() {
    setQrConfirmed(true);
    setShowQRModal(false);
    setSelectedPaymentMethod('qr');
    setIsPaymentSubmitted(true);
    setShowPrintModal(true);
  }

  function handleCancelQRPayment() {
    setShowQRModal(false);
    setQrConfirmed(false);
  }

  // Use the useOrderPayment hook for all payment state/handlers
  const payment = useOrderPayment(totalPay, orderId);

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-3 shadow flex flex-col gap-2">
        <div className="text-base font-bold text-pink-400 mb-1 text-left">Thông Tin Thanh Toán</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">Tổng tiền đơn hàng</span>
          <span className="text-white font-bold">{total.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">Tiền cọc</span>
          <span className="text-white font-bold flex flex-col items-end">
            {depositInfo
              ? depositInfo.type === 'vnd'
                ? depositInfo.value.toLocaleString('vi-VN') + ' đ'
                : <>
                    {Math.round(subtotal * (depositInfo.value / 100)).toLocaleString('vi-VN')} đ
                    <span className="text-xs text-blue-200 mt-0.5">({depositInfo.value}% của đơn hàng)</span>
                  </>
              : '0 đ'}
          </span>
        </div>
        {isPaymentSubmitted && selectedPaymentMethod === 'qr' ? (
          <>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Thanh Toán Toàn Bộ - CK QR</span>
              <span className="text-white font-bold">- {totalPay.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-white font-medium">Trạng Thái Thanh Toán</span>
              <span className="text-green-400 font-bold">Hoàn Tất{depositValue > 0 ? ' - Có Đặt Cọc' : ''}</span>
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
              <span className="text-green-400 font-bold">Hoàn Tất{depositValue > 0 ? ' - Có Đặt Cọc' : ''}</span>
            </div>
          </>
        ) : null}
        <div className="flex items-center justify-between text-base mt-2 border-t border-gray-700 pt-2">
          <span className="text-white font-semibold">Số Tiền Cần Trả</span>
          <span className="text-green-400 font-bold text-lg">{isPaymentSubmitted ? '0 đ' : totalPay.toLocaleString('vi-VN') + ' đ'}</span>
        </div>
        {!isPaymentSubmitted && (
          <button
            className="mt-3 w-full py-2 rounded bg-pink-600 hover:bg-pink-700 text-white font-bold text-base shadow transition-colors"
            type="button"
            onClick={() => payment.setShowPaymentModal(true)}
          >
            Thanh toán & Gửi đơn
          </button>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        show={payment.showPaymentModal}
        onClose={payment.handleCloseModal}
        onPaymentOption={payment.handlePaymentOption}
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
      />

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
        totalPay={payment.totalPay}
        orderId={orderId}
        onConfirm={payment.handleConfirmQRPayment}
        onCancel={payment.handleCancelQRPayment}
      />
    </>
  );
}; ent.qrSVG}
        totalPay={payment.totalPay}
        orderId={orderId}
        onConfirm={payment.handleConfirmQRPayment}
        onCancel={payment.handleCancelQRPayment}
      />
    </>
  );
};
