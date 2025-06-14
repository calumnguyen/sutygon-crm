import { useState, useEffect } from 'react';

export function useOrderPayment(totalPay: number, orderId: string) {
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
          acqId: '970403',
          amount: totalPay,
          addInfo: `CK #${orderId}`,
          format: 'svg',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
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
      setPaidAmount((prev) => prev + amount);
      setInputAmount('');
    }
  }

  function handleQuickAmount(amount: number) {
    if (!paymentComplete) {
      setPaidAmount((prev) => prev + amount);
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
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setSelectedPaymentMethod(null);
  }

  function handleCloseModal() {
    if (paymentComplete) {
      setShowPrintModal(true);
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
    setShowPrintModal(true);
  }

  function handleCancelQRPayment() {
    setShowQRModal(false);
    setQrConfirmed(false);
  }

  return {
    showPaymentModal,
    setShowPaymentModal,
    showPaymentMethodModal,
    setShowPaymentMethodModal,
    showPrintModal,
    setShowPrintModal,
    showQRModal,
    setShowQRModal,
    qrSVG,
    setQrSVG,
    qrLoading,
    setQrLoading,
    qrError,
    setQrError,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paidAmount,
    setPaidAmount,
    inputAmount,
    setInputAmount,
    paymentComplete,
    setPaymentComplete,
    changeAmount,
    setChangeAmount,
    qrConfirmed,
    setQrConfirmed,
    handlePaymentOption,
    handlePaymentMethod,
    handleAmountInput,
    handleAddPayment,
    handleQuickAmount,
    handleKeyPress,
    handleConfirmPayment,
    handleCloseModal,
    handlePrint,
    handleClosePrintModal,
    handleConfirmQRPayment,
    handleCancelQRPayment,
    totalPay,
  };
}
