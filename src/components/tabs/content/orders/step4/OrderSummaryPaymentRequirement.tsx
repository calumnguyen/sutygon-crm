import React, { useState, useEffect } from 'react';

/**
 * Payment summary card for step 4 summary.
 * @param total Order subtotal (excluding extension)
 * @param depositInfo Deposit info object (optional)
 * @param isPaymentSubmitted Payment submission status
 * @param setIsPaymentSubmitted Function to set payment submission status
 */
export const OrderSummaryPaymentRequirement: React.FC<{
  total: number;
  depositInfo?: { type: 'vnd' | 'percent'; value: number };
  isPaymentSubmitted: boolean;
  setIsPaymentSubmitted: (v: boolean) => void;
}> = ({ total, depositInfo, isPaymentSubmitted, setIsPaymentSubmitted }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'qr' | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number>(0);

  let depositValue = 0;
  let depositDisplay = '0 đ';
  if (depositInfo) {
    if (depositInfo.type === 'vnd') {
      depositValue = depositInfo.value;
      depositDisplay = `${depositValue.toLocaleString('vi-VN')} đ`;
    } else {
      depositValue = Math.round(total * (depositInfo.value / 100));
      depositDisplay = `${depositValue.toLocaleString('vi-VN')} đ (${depositInfo.value}% của đơn hàng)`;
    }
  }
  const totalPay = total + depositValue;

  useEffect(() => {
    if (paidAmount >= totalPay) {
      setPaymentComplete(true);
      setChangeAmount(paidAmount - totalPay);
    } else {
      setPaymentComplete(false);
      setChangeAmount(0);
    }
  }, [paidAmount, totalPay]);

  const handlePaymentOption = (option: 'full' | 'partial' | 'later') => {
    if (option === 'full') {
      setShowPaymentMethodModal(true);
    } else {
      // TODO: Implement payment logic for partial or later payment
      console.log('Payment option selected:', option);
      setShowPaymentModal(false);
    }
  };

  const handlePaymentMethod = (method: 'cash' | 'qr') => {
    setSelectedPaymentMethod(method);
    if (method === 'qr') {
      // TODO: Implement QR payment logic
      console.log('QR payment selected');
      setShowPaymentMethodModal(false);
      setShowPaymentModal(false);
    }
  };

  const handleAmountInput = (value: string) => {
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setInputAmount(value);
    }
  };

  const handleAddPayment = () => {
    const amount = parseInt(inputAmount) || 0;
    if (amount > 0 && !paymentComplete) {
      setPaidAmount((prev) => prev + amount);
      setInputAmount('');
    }
  };

  const handleQuickAmount = (amount: number) => {
    if (!paymentComplete) {
      setPaidAmount((prev) => prev + amount);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPayment();
    }
  };

  const handleConfirmPayment = () => {
    // TODO: Implement payment confirmation logic
    setShowPrintModal(true);
    setShowPaymentMethodModal(false);
    setShowPaymentModal(false);
    setIsPaymentSubmitted(true);
    // Reset states
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setSelectedPaymentMethod(null);
  };

  const handleCloseModal = () => {
    if (paymentComplete) {
      setShowPrintModal(true);
      setIsPaymentSubmitted(true);
    }
    setShowPaymentMethodModal(false);
    setShowPaymentModal(false);
    // Reset states
    setPaidAmount(0);
    setInputAmount('');
    setPaymentComplete(false);
    setChangeAmount(0);
    setSelectedPaymentMethod(null);
  };

  const handlePrint = () => {
    // Simulate print (you can replace with real print logic)
    window.print();
    setShowPrintModal(false);
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
  };

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
          <span className="text-white font-bold">{depositDisplay}</span>
        </div>
        {isPaymentSubmitted && (
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
        )}
        <div className="flex items-center justify-between text-base mt-2 border-t border-gray-700 pt-2">
          <span className="text-white font-semibold">Số Tiền Cần Trả</span>
          <span className="text-green-400 font-bold text-lg">
            {isPaymentSubmitted ? '0 đ' : totalPay.toLocaleString('vi-VN') + ' đ'}
          </span>
        </div>
        {!isPaymentSubmitted && (
          <button
            className="mt-3 w-full py-2 rounded bg-pink-600 hover:bg-pink-700 text-white font-bold text-base shadow transition-colors"
            type="button"
            onClick={() => setShowPaymentModal(true)}
          >
            Thanh toán & Gửi đơn
          </button>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={handleCloseModal}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-pink-400 mb-6">Xác Nhận Thanh Toán</div>
            <div className="text-base text-gray-300 mb-6 text-center">
              Vui lòng chọn phương thức thanh toán cho đơn hàng này
            </div>
            <div className="w-full flex flex-col gap-3">
              <button
                className="w-full py-3 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-lg shadow-lg transition-colors"
                onClick={() => handlePaymentOption('full')}
              >
                Thanh Toán Toàn Bộ Ngay
              </button>
              <button
                className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
                onClick={() => handlePaymentOption('partial')}
              >
                Thanh Toán Một Phần
              </button>
              <button
                className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
                onClick={() => handlePaymentOption('later')}
              >
                Thanh Toán Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentMethodModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          onClick={handleCloseModal}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-4xl shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={handleCloseModal}
              aria-label="Đóng"
            >
              ×
            </button>

            {!selectedPaymentMethod ? (
              <>
                <div className="text-xl font-bold text-pink-400 mb-6">
                  Chọn Phương Thức Thanh Toán
                </div>
                <div className="text-base text-gray-300 mb-6 text-center">
                  Số tiền cần thanh toán:{' '}
                  <span className="text-green-400 font-bold">
                    {totalPay.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full flex flex-col gap-3">
                  <button
                    className="w-full py-3 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-lg shadow-lg transition-colors"
                    onClick={() => handlePaymentMethod('cash')}
                  >
                    Thanh Toán Bằng Tiền Mặt
                  </button>
                  <button
                    className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
                    onClick={() => handlePaymentMethod('qr')}
                  >
                    Chuyển Khoản QR
                  </button>
                </div>
              </>
            ) : selectedPaymentMethod === 'cash' ? (
              <div className="w-full flex gap-8">
                {/* Left side - Payment Summary */}
                <div className="flex-1 bg-gray-800 rounded-lg p-6">
                  <div className="text-lg font-bold text-pink-400 mb-4">Thông Tin Thanh Toán</div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Số tiền cần thanh toán:</span>
                      <span className="text-green-400 font-bold">
                        {totalPay.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Đã thanh toán:</span>
                      <span className="text-blue-400 font-bold">
                        {paidAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Số tiền còn lại:</span>
                        <span
                          className={`font-bold ${totalPay - paidAmount > 0 ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {Math.max(0, totalPay - paidAmount).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                    {paymentComplete && (
                      <div className="mt-4 p-3 rounded bg-gray-700">
                        <div className="text-center text-gray-300">
                          {changeAmount === 0 ? (
                            <span>Thanh toán hoàn tất. Không cần trả lại tiền thừa.</span>
                          ) : (
                            <span>
                              Thanh toán hoàn tất. Vui lòng trả lại khách hàng{' '}
                              <span className="text-yellow-400 font-bold">
                                {changeAmount.toLocaleString('vi-VN')} đ
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Payment Input */}
                <div className="flex-1 bg-gray-800 rounded-lg p-6">
                  <div className="text-lg font-bold text-pink-400 mb-4">Nhập Số Tiền Khách Trả</div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputAmount}
                        onChange={(e) => handleAmountInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập số tiền"
                        disabled={paymentComplete}
                        className={`flex-1 px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 ${
                          paymentComplete ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      <button
                        onClick={handleAddPayment}
                        disabled={paymentComplete}
                        className={`px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors ${
                          paymentComplete ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Thêm
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuickAmount(100000)}
                        disabled={paymentComplete}
                        className={`flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${
                          paymentComplete ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        100.000đ
                      </button>
                      <button
                        onClick={() => handleQuickAmount(200000)}
                        disabled={paymentComplete}
                        className={`flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${
                          paymentComplete ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        200.000đ
                      </button>
                      <button
                        onClick={() => handleQuickAmount(500000)}
                        disabled={paymentComplete}
                        className={`flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${
                          paymentComplete ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        500.000đ
                      </button>
                    </div>
                    <button
                      onClick={handleConfirmPayment}
                      disabled={!paymentComplete}
                      className={`w-full py-3 rounded-lg text-white font-bold text-lg transition-colors ${
                        paymentComplete
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Xác Nhận Thanh Toán
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center">
            <div className="text-xl font-bold text-pink-400 mb-6">In Biên Lai Đơn Hàng</div>
            <div className="text-base text-gray-300 mb-6 text-center">
              Bạn có muốn in biên lai cho đơn hàng này không?
            </div>
            <div className="w-full flex flex-col gap-3">
              <button
                className="w-full py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-colors"
                onClick={handlePrint}
              >
                In Biên Lai
              </button>
              <button
                className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
                onClick={handleClosePrintModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
