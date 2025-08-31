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
  const [showPickupConfirmationModal, setShowPickupConfirmationModal] = useState(false);
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
  const [actualOrderId, setActualOrderId] = useState<number | null>(null);
  const [actualOrderItems, setActualOrderItems] = useState<
    Array<{
      id: number;
      orderId: number;
      inventoryItemId: number | null;
      formattedId: string | null;
      name: string;
      size: string;
      quantity: number;
      price: number;
      imageUrl?: string;
    }>
  >([]);
  const [vatPercentage, setVatPercentage] = useState(8); // Default VAT rate

  // Show pickup confirmation modal when actualOrderId is set
  useEffect(() => {
    if (actualOrderId && shouldShowPickupConfirmation()) {
      console.log(
        '✅ Showing pickup confirmation modal - actualOrderId is now set:',
        actualOrderId
      );
      setShowPickupConfirmationModal(true);
    }
  }, [actualOrderId, orderDate]);

  // Function to fetch actual order items with database IDs
  const fetchActualOrderItems = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/items/pickup`);
      if (response.ok) {
        const data = await response.json();
        setActualOrderItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching actual order items:', error);
    }
  };

  // Effects
  useEffect(() => {
    // Fetch VAT percentage on mount
    fetch('/api/store-settings/vat-percentage')
      .then((res) => res.json())
      .then((data) => {
        setVatPercentage(data.vatPercentage || 8);
      })
      .catch(() => {
        setVatPercentage(8); // Default fallback
      });
  }, []);

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
      // For pay later, directly proceed to pickup confirmation if needed
      handlePayLaterDirect();
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

  // Helper function to check if pickup confirmation is needed
  function shouldShowPickupConfirmation(): boolean {
    console.log('=== shouldShowPickupConfirmation called ===');
    console.log('orderDate parameter:', orderDate);
    console.log('orderDate type:', typeof orderDate);

    if (!orderDate) {
      console.log('❌ No orderDate provided, returning false');
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    // Parse orderDate - it can be in format "dd/MM/yyyy" or "yyyy-MM-dd"
    let orderDateObj: Date;
    if (orderDate.includes('/')) {
      // Format: "dd/MM/yyyy"
      const [day, month, year] = orderDate.split('/').map(Number);
      orderDateObj = new Date(year, month - 1, day);
    } else {
      // Format: "yyyy-MM-dd"
      orderDateObj = new Date(orderDate);
    }
    orderDateObj.setHours(0, 0, 0, 0); // Set to start of day

    console.log('=== Pickup Confirmation Debug ===');
    console.log('orderDate input:', orderDate);
    console.log('parsed orderDateObj:', orderDateObj);
    console.log('today:', today);
    console.log('orderDateObj <= today:', orderDateObj <= today);

    // Show pickup confirmation if order date is today or in the past
    const shouldShow = orderDateObj <= today;
    console.log('shouldShow pickup confirmation:', shouldShow);
    return shouldShow;
  }

  // Handle pay later directly without the orange modal
  async function handlePayLaterDirect() {
    try {
      console.log('=== Pay Later Direct ===');
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
          currentUser: currentUser, // Pass current user for tracking
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark order as pay later');
      }

      // Get the response data to extract the order ID
      const responseData = await response.json();
      console.log('Pay later API response:', responseData);
      console.log('Response data keys:', Object.keys(responseData));
      console.log('Response data.id:', responseData.id);
      console.log('Response data.order:', responseData.order);
      console.log('Response data type:', typeof responseData);
      console.log('Response data structure:', JSON.stringify(responseData, null, 2));

      // Extract the actual order ID from the response
      const newOrderId = responseData.order?.id;
      console.log('Actual order ID from pay later API:', newOrderId);
      console.log('newOrderId type:', typeof newOrderId);
      console.log('newOrderId value:', newOrderId);

      // Mark as payment submitted (though it's pay later)
      setIsPaymentSubmitted?.(true);

      // Check if pickup confirmation is needed
      if (shouldShowPickupConfirmation()) {
        console.log('✅ Setting up pickup confirmation for pay later');
        // Store the actual order ID for pickup confirmation
        setActualOrderId(newOrderId);
        // Fetch actual order items with database IDs
        fetchActualOrderItems(newOrderId);
        // Note: Pickup confirmation modal will be shown via useEffect when actualOrderId is set
      } else {
        console.log('❌ No pickup confirmation needed for pay later');
        // Check if there's document info to show retention modal
        if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
          console.log('✅ Document info found - showing retention modal for pay later');
          setShowDocumentRetentionModal(true);
        } else {
          console.log('❌ No document info - proceeding to print modal for pay later');
          // No document, proceed directly to print modal
          setShowPrintModal(true);
          onPaymentSuccess?.();
        }
      }
    } catch (error) {
      console.error('Error confirming pay later:', error);
      // For now, proceed anyway - we don't want to block the user
      onPaymentSuccess?.();
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

      // Get the response data to extract the order ID
      const responseData = await response.json();
      console.log('Payment API response:', responseData);
      console.log('Response data keys:', Object.keys(responseData));
      console.log('Response data.id:', responseData.id);
      console.log('Response data.order:', responseData.order);
      console.log('Response data type:', typeof responseData);
      console.log('Response data structure:', JSON.stringify(responseData, null, 2));

      // Extract the actual order ID from the response
      const newOrderId = responseData.id;
      console.log('Actual order ID from payment API:', newOrderId);
      console.log('newOrderId type:', typeof newOrderId);
      console.log('newOrderId value:', newOrderId);

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

      // Check if pickup confirmation is needed first
      if (shouldShowPickupConfirmation()) {
        console.log('✅ Setting up pickup confirmation');
        // Store the actual order ID for pickup confirmation
        setActualOrderId(newOrderId);
        // Fetch actual order items with database IDs
        fetchActualOrderItems(newOrderId);
        // Note: Pickup confirmation modal will be shown via useEffect when actualOrderId is set
      } else {
        console.log('❌ No pickup confirmation needed');
        // Check if there's document info to show retention modal
        if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
          console.log('✅ Document info found - showing retention modal');
          setShowDocumentRetentionModal(true);
        } else {
          console.log('❌ No document info - skipping retention modal');
          // No document, proceed directly to print modal and success
          setShowPrintModal(true);
          onPaymentSuccess?.();
        }
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
    setShowPickupConfirmationModal(false);
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
    setActualOrderId(null);
  }

  async function handlePrint() {
    try {
      console.log('=== Print Debug Info ===');
      console.log('orderId:', orderId);
      console.log('customerName:', customerName);
      console.log('totalPay:', totalPay);
      console.log('orderData:', orderData);
      console.log('discounts:', discounts);

      // Calculate the base amount (before discounts and VAT)
      const baseAmount =
        orderData?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
      console.log('Base amount (before discounts/VAT):', baseAmount);

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
          totalAmount: baseAmount, // Use base amount (before discounts and VAT)
          vatAmount: Math.round(
            (baseAmount -
              (discounts?.reduce((sum, discount) => sum + discount.discountAmount, 0) || 0)) *
              (vatPercentage / 100)
          ), // Use current VAT rate on amount after discounts
          depositAmount: depositInfo
            ? depositInfo.type === 'vnd'
              ? depositInfo.value
              : Math.round(totalPay * (depositInfo.value / 100))
            : 0,
          discounts: discounts || [], // Add discounts to PDF generation
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

      const responseData = await response.json();
      console.log('QR Payment API response:', responseData);

      // Extract the actual order ID from the response
      const newOrderId = responseData.id;
      console.log('Actual order ID from QR payment API:', newOrderId);

      // Mark payment as submitted
      setIsPaymentSubmitted?.(true);

      setQrConfirmed(true);
      setShowQRModal(false);
      setSelectedPaymentMethod('qr');

      // Check if pickup confirmation is needed first
      console.log('=== Checking pickup confirmation after QR payment ===');
      const needsPickupConfirmation = shouldShowPickupConfirmation();
      console.log('needsPickupConfirmation result:', needsPickupConfirmation);

      if (needsPickupConfirmation) {
        console.log('✅ Setting up pickup confirmation (QR)');
        // Store the actual order ID for pickup confirmation
        setActualOrderId(newOrderId);
        // Fetch actual order items with database IDs
        fetchActualOrderItems(newOrderId);
        // Note: Pickup confirmation modal will be shown via useEffect when actualOrderId is set
      } else {
        console.log('❌ No pickup confirmation needed (QR)');
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
      // Use actualOrderId if available (for new orders), otherwise use orderId
      const orderIdToUpdate = actualOrderId || (orderId !== '0000-A' ? parseInt(orderId) : null);

      if (!orderIdToUpdate) {
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
          orderId: orderIdToUpdate,
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

  // Handle pickup confirmation
  async function handlePickupConfirmed() {
    try {
      console.log('=== Pickup Confirmation Debug ===');
      console.log('orderId:', orderId);
      console.log('orderId type:', typeof orderId);
      console.log('actualOrderId:', actualOrderId);

      // Note: Order status is now updated by the pickup API based on actual pickup progress
      // No need to manually update order status here
      console.log('✅ Pickup confirmed - order status will be updated by pickup API');

      setShowPickupConfirmationModal(false);

      // Check if there's document info to show retention modal
      if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
        setShowDocumentRetentionModal(true);
      } else {
        // No document, proceed directly to print modal
        setShowPrintModal(true);
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Proceed anyway
      setShowPickupConfirmationModal(false);
      if (documentInfo && documentInfo.documentType && documentInfo.documentName) {
        setShowDocumentRetentionModal(true);
      } else {
        setShowPrintModal(true);
        onPaymentSuccess?.();
      }
    }
  }

  function handlePickupCancelled() {
    setShowPickupConfirmationModal(false);

    // If customer didn't pick up, don't show document retention modal
    // Just proceed to print modal
    setShowPrintModal(true);
    onPaymentSuccess?.();
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
    showPickupConfirmationModal,
    setShowPickupConfirmationModal,
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
    handlePickupConfirmed,
    handlePickupCancelled,
    totalPay,
    resetAllPaymentState,
    actualOrderId,
    currentUser,
    actualOrderItems,
  };
}
