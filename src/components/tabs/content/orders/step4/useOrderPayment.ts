import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

export function useOrderPayment(
  totalPay: number,
  orderId: string,
  orderData?: {
    customerId: number;
    orderDate: string;
    expectedReturnDate: string;
    totalAmount: number;
    depositAmount: number;
    items: Array<{
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
  } | null,
  documentInfo?: {
    documentType: string;
    documentOther?: string;
    documentName: string;
    documentId: string;
  } | null,
  depositInfo?: {
    type: 'vnd' | 'percent';
    value: number;
  } | null,
  discounts?: Array<{
    id: number;
    discountType: 'vnd' | 'percent';
    discountValue: number;
    discountAmount: number;
    itemizedName: string;
    description: string;
    requestedByUserId?: number;
    authorizedByUserId?: number;
    itemizedNameId?: number;
  }> | null,
  onPaymentSuccess?: () => void,
  setIsPaymentSubmitted?: (submitted: boolean) => void,
  customerName?: string,
  customerAddress?: string,
  customerPhone?: string,
  orderDate?: string,
  rentDate?: string,
  returnDate?: string
) {
  // Get current user
  const { currentUser } = useUser();

  // State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDocumentRetentionModal, setShowDocumentRetentionModal] = useState(false);
  const [showPayLaterModal, setShowPayLaterModal] = useState(false);
  const [qrSVG, setQrSVG] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'qr' | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

  // Effects
  useEffect(() => {
    if (showQRModal) {
      setQrSVG(null);
      setQrError(null);
      setQrLoading(true);

      // Use partial payment amount if available, otherwise use total
      const qrAmount = isPartialPayment && partialAmount ? parseInt(partialAmount) : totalPay;

      fetch('https://api.vietqr.io/v2/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNo: '19036401234567',
          accountName: 'Sutygon',
          acqId: '970422',
          amount: qrAmount,
          addInfo: `Thanh toan don hang ${orderId}`,
          format: 'text',
          template: 'compact2',
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
  }, [showQRModal, totalPay, orderId, isPartialPayment, partialAmount]);

  useEffect(() => {
    // For partial payments, complete when paidAmount >= partialAmount
    // For full payments, complete when paidAmount >= totalPay
    const requiredAmount =
      isPartialPayment && partialAmount ? parseInt(partialAmount) || 0 : totalPay;

    console.log('=== Payment Completion Debug ===');
    console.log('paidAmount (number):', paidAmount, 'type:', typeof paidAmount);
    console.log('partialAmount (string):', partialAmount, 'type:', typeof partialAmount);
    console.log('requiredAmount (number):', requiredAmount, 'type:', typeof requiredAmount);
    console.log('paidAmount >= requiredAmount:', paidAmount >= requiredAmount);
    console.log('paidAmount > 0:', paidAmount > 0);

    if (paidAmount >= requiredAmount && paidAmount > 0) {
      console.log('✅ Setting paymentComplete to true');
      setPaymentComplete(true);
      setChangeAmount(Math.max(0, paidAmount - requiredAmount));
    } else {
      console.log('❌ Setting paymentComplete to false');
      setPaymentComplete(false);
      setChangeAmount(0);
    }
  }, [paidAmount, totalPay, isPartialPayment, partialAmount]);

  // Handlers
  function handlePaymentOption(option: 'full' | 'partial' | 'later') {
    if (option === 'full') {
      setIsPartialPayment(false);
      setPartialAmount('');
      setShowPaymentMethodModal(true);
      setShowPaymentModal(false);
    } else if (option === 'partial') {
      setIsPartialPayment(true);
      setShowPaymentMethodModal(true);
      setShowPaymentModal(false);
    } else if (option === 'later') {
      setShowPayLaterModal(true);
      setShowPaymentModal(false);
    } else {
      // fallback - close all modals and reset state
      resetAllPaymentState();
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

  async function handleConfirmPayment() {
    try {
      console.log('=== Payment Debug Info ===');
      console.log('documentInfo:', documentInfo);
      console.log('documentInfo.documentType:', documentInfo?.documentType);
      console.log('documentInfo.documentName:', documentInfo?.documentName);
      console.log('isPartialPayment:', isPartialPayment);
      console.log('partialAmount:', partialAmount);

      // Determine payment amount
      // For partial payments, use the partialAmount (target amount) or paidAmount (whichever is smaller)
      // For full payments, use the total amount
      const paymentAmount = isPartialPayment
        ? Math.min(parseInt(partialAmount) || 0, paidAmount)
        : totalPay;

      // Transform depositInfo to match backend expectation
      const transformedDepositInfo = depositInfo
        ? {
            depositType: depositInfo.type,
            depositValue: depositInfo.value,
          }
        : undefined;

      // Call API to complete payment
      const requestBody = {
        orderId: orderId === '0000-A' ? null : parseInt(orderId), // Pass null if it's a placeholder ID
        orderData: orderId === '0000-A' ? orderData : null, // Pass order data if order doesn't exist yet
        paymentMethod: selectedPaymentMethod,
        paidAmount: paymentAmount,
        documentInfo: documentInfo,
        depositInfo: transformedDepositInfo,
        discounts: orderId === '0000-A' ? discounts : null, // Pass discounts if order doesn't exist yet
        totalPay: totalPay, // Pass the frontend calculated total including discounts
        currentUser: currentUser, // Pass current user for payment history
      };

      console.log('🚨 PAYMENT API CALL - FRONTEND 🚨');
      console.log('Payment API request body:', requestBody);
      console.log('Discounts being sent:', discounts);
      console.log('🚨 END PAYMENT API CALL - FRONTEND 🚨');

      const response = await fetch('/api/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to complete payment');
      }

      // Mark payment as submitted
      setIsPaymentSubmitted?.(true);

      // Close payment modals
      setShowPaymentMethodModal(false);
      setShowPaymentModal(false);
      setPaidAmount(0);
      setInputAmount('');
      setPaymentComplete(false);
      setChangeAmount(0);
      setSelectedPaymentMethod(null);

      // Check if there's document info to show retention modal
      console.log('Checking document info for modal...');
      if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
        console.log('✅ Document info found - showing retention modal');
        setShowDocumentRetentionModal(true);
      } else {
        console.log('❌ No document info - skipping retention modal');
        // No document, proceed directly to print modal and success
        setShowPrintModal(true);
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      // Handle error - could show a toast notification
    }
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
    // Reset partial payment state
    setIsPartialPayment(false);
    setPartialAmount('');
  }

  function resetAllPaymentState() {
    setShowPaymentModal(false);
    setShowPaymentMethodModal(false);
    setShowPrintModal(false);
    setShowQRModal(false);
    setShowDocumentRetentionModal(false);
    setShowPayLaterModal(false);
    setSelectedPaymentMethod(null);
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setQrConfirmed(false);
    setIsPartialPayment(false);
    setPartialAmount('');
    setQrSVG(null);
    setQrError(null);
    setQrLoading(false);
  }

  async function handlePrint() {
    try {
      console.log('=== Print Debug Info ===');
      console.log('orderId:', orderId);
      console.log('customerName:', customerName);
      console.log('totalPay:', totalPay);
      console.log('orderData:', orderData);

      // Generate PDF receipt instead of using window.print()
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId === '0000-A' ? `TEMP-${Date.now().toString().slice(-6)}` : orderId,
          customerName: customerName || 'N/A',
          customerAddress: customerAddress || 'N/A',
          customerPhone: customerPhone || 'N/A',
          orderDate: orderDate || new Date().toLocaleDateString('vi-VN'),
          rentDate: rentDate || new Date().toLocaleDateString('vi-VN'),
          returnDate: returnDate || new Date().toLocaleDateString('vi-VN'),
          items:
            orderData?.items.map((item) => ({
              id: item.inventoryItemId
                ? `ID-${item.inventoryItemId.toString().padStart(6, '0')}`
                : 'N/A',
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
            })) || [],
          totalAmount: totalPay,
          vatAmount: Math.round(totalPay * 0.08), // 8% VAT
          depositAmount: depositInfo
            ? depositInfo.type === 'vnd'
              ? depositInfo.value
              : Math.round(totalPay * (depositInfo.value / 100))
            : 0,
          paymentHistory: [
            {
              date: new Date().toLocaleString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
              method: selectedPaymentMethod || 'cash',
              amount: totalPay,
            },
          ],
          settlementInfo: {
            remainingBalance: 0,
            depositReturned: 0,
            documentType: documentInfo?.documentType,
            documentReturned: false,
          },
          lastUpdated: new Date().toISOString(),
        }),
      });

      console.log('PDF generation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation error response:', errorText);
        throw new Error(`Failed to generate PDF: ${response.status} ${errorText}`);
      }

      // Get the PDF blob and trigger download
      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bien_Nhan_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi khi tạo biên nhận. Vui lòng thử lại.');
    }

    setShowPrintModal(false);
  }

  function handleClosePrintModal() {
    setShowPrintModal(false);
  }

  async function handleConfirmQRPayment() {
    try {
      console.log('=== QR Payment Debug Info ===');
      console.log('documentInfo:', documentInfo);
      console.log('documentInfo.documentType:', documentInfo?.documentType);
      console.log('documentInfo.documentName:', documentInfo?.documentName);
      console.log('isPartialPayment:', isPartialPayment);
      console.log('partialAmount:', partialAmount);

      // Determine payment amount
      const paymentAmount = isPartialPayment && partialAmount ? parseInt(partialAmount) : totalPay;

      // Transform depositInfo to match backend expectation
      const transformedDepositInfo = depositInfo
        ? {
            depositType: depositInfo.type,
            depositValue: depositInfo.value,
          }
        : undefined;

      // Call API to complete payment
      const response = await fetch('/api/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId === '0000-A' ? null : parseInt(orderId), // Pass null if it's a placeholder ID
          orderData: orderId === '0000-A' ? orderData : null, // Pass order data if order doesn't exist yet
          paymentMethod: 'qr',
          paidAmount: paymentAmount,
          documentInfo: documentInfo,
          depositInfo: transformedDepositInfo,
          discounts: orderId === '0000-A' ? discounts : null, // Pass discounts if order doesn't exist yet
          totalPay: totalPay, // Pass the frontend calculated total including discounts
          currentUser: currentUser, // Pass current user for payment history
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete payment');
      }

      // Mark payment as submitted
      setIsPaymentSubmitted?.(true);

      setQrConfirmed(true);
      setShowQRModal(false);
      setSelectedPaymentMethod('qr');

      // Check if there's document info to show retention modal
      if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
        console.log('✅ Document info found - showing retention modal (QR)');
        setShowDocumentRetentionModal(true);
      } else {
        console.log('❌ No document info - skipping retention modal (QR)');
        // No document, proceed directly to print modal and success
        setShowPrintModal(true);
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      // Handle error - could show a toast notification
    }
  }

  function handleCancelQRPayment() {
    setShowQRModal(false);
    setQrConfirmed(false);
    setQrSVG(null);
    setQrError(null);
    setQrLoading(false);
    // Reset to show payment method selection again
    setSelectedPaymentMethod(null);
    setShowPaymentMethodModal(true);
  }

  async function handleConfirmDocumentRetention() {
    try {
      // Don't try to update document status if order is temporary (0000-A)
      if (orderId === '0000-A') {
        console.log('Skipping document status update for temporary order');
        setShowDocumentRetentionModal(false);
        setShowPrintModal(true);
        onPaymentSuccess?.();
        return;
      }

      // Mark document as on file
      const response = await fetch('/api/orders/document-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: parseInt(orderId),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document status');
      }

      // Close document retention modal and show print modal
      setShowDocumentRetentionModal(false);
      setShowPrintModal(true);
      onPaymentSuccess?.();
    } catch (error) {
      console.error('Error updating document status:', error);
      // For now, proceed anyway - we don't want to block the user
      setShowDocumentRetentionModal(false);
      setShowPrintModal(true);
      onPaymentSuccess?.();
    }
  }

  async function handlePayLaterConfirm() {
    try {
      console.log('=== Pay Later Confirmed ===');
      console.log('documentInfo:', documentInfo);
      console.log('depositInfo:', depositInfo);

      // Transform depositInfo to match backend expectation
      const transformedDepositInfo = depositInfo
        ? {
            depositType: depositInfo.type,
            depositValue: depositInfo.value,
          }
        : undefined;

      // Call API to mark order as pay later
      const response = await fetch('/api/orders/pay-later', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId === '0000-A' ? null : parseInt(orderId), // Pass null if it's a placeholder ID
          orderData: orderId === '0000-A' ? orderData : null, // Pass order data if order doesn't exist yet
          documentInfo: documentInfo,
          depositInfo: transformedDepositInfo,
          discounts: orderId === '0000-A' ? discounts : null, // Pass discounts if order doesn't exist yet
          totalPay: totalPay, // Pass the frontend calculated total including discounts
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark order as pay later');
      }

      setShowPayLaterModal(false);

      // Mark as payment submitted (though it's pay later)
      setIsPaymentSubmitted?.(true);

      // Check if there's document info to show retention modal
      if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
        console.log('✅ Document info found - showing retention modal for pay later');
        setShowDocumentRetentionModal(true);
      } else {
        console.log('❌ No document info - proceeding to success for pay later');
        // No document, proceed directly to success
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Error confirming pay later:', error);
      // For now, proceed anyway - we don't want to block the user
      setShowPayLaterModal(false);
      onPaymentSuccess?.();
    }
  }

  function handlePayLaterCancel() {
    setShowPayLaterModal(false);
    // Return to main payment options
    setShowPaymentModal(true);
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
    showDocumentRetentionModal,
    setShowDocumentRetentionModal,
    showPayLaterModal,
    setShowPayLaterModal,
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
    isPartialPayment,
    setIsPartialPayment,
    partialAmount,
    setPartialAmount,
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
    handleConfirmDocumentRetention,
    handlePayLaterConfirm,
    handlePayLaterCancel,
    totalPay,
    resetAllPaymentState,
  };
}
