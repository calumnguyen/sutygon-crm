import React from 'react';

interface PaymentMethodModalProps {
  show: boolean;
  onClose: () => void;
  selectedPaymentMethod: 'cash' | 'qr' | null;
  onSelectMethod: (method: 'cash' | 'qr') => void;
  totalPay: number;
  paidAmount: number;
  paymentComplete: boolean;
  inputAmount: string;
  onInputAmount: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddPayment: () => void;
  onQuickAmount: (amount: number) => void;
  onConfirmPayment: () => void;
  isPartialPayment?: boolean;
  partialAmount?: string;
  onPartialAmountChange?: (value: string) => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  show,
  onClose,
  selectedPaymentMethod,
  onSelectMethod,
  totalPay,
  paidAmount,
  paymentComplete,
  inputAmount,
  onInputAmount,
  onKeyPress,
  onAddPayment,
  onQuickAmount,
  onConfirmPayment,
  isPartialPayment = false,
  partialAmount = '',
  onPartialAmountChange,
}) => {
  // Local state to track payment completion
  const [localPaymentComplete, setLocalPaymentComplete] = React.useState(false);

  // Update local state when props change
  React.useEffect(() => {
    setLocalPaymentComplete(paymentComplete);
  }, [paymentComplete]);

  // Also calculate payment completion locally as backup
  React.useEffect(() => {
    const requiredAmount =
      isPartialPayment && partialAmount ? parseInt(partialAmount) || 0 : totalPay;

    const isComplete = paidAmount >= requiredAmount && paidAmount > 0;
    setLocalPaymentComplete(isComplete);
  }, [paidAmount, totalPay, isPartialPayment, partialAmount]);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      key={`payment-modal-${paymentComplete}-${paidAmount}`}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-4 sm:p-8 w-full max-w-4xl shadow-2xl border border-gray-700 relative flex flex-col items-center max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        {!selectedPaymentMethod ? (
          <>
            <div className="text-xl font-bold text-pink-400 mb-6">
              {isPartialPayment ? 'Thanh Toán Một Phần' : 'Chọn Phương Thức Thanh Toán'}
            </div>

            {isPartialPayment && (
              <div className="w-full max-w-md mb-6">
                <label className="block text-gray-300 text-sm mb-2">
                  Số tiền tạm ứng: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={partialAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && onPartialAmountChange) {
                      onPartialAmountChange(value);
                    }
                  }}
                  placeholder="Nhập số tiền tạm ứng..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
                <div className="text-xs text-gray-400 mt-1">
                  Tối đa: {totalPay.toLocaleString('vi-VN')} đ
                </div>
                {parseInt(partialAmount) >= totalPay && partialAmount && (
                  <div className="bg-blue-600 text-white text-sm rounded-lg p-2 mt-2">
                    💡 Số tiền bằng tổng đơn hàng - sẽ thanh toán toàn bộ
                  </div>
                )}
                {isPartialPayment &&
                  (!partialAmount ? (
                    <div className="bg-red-600 text-white text-sm rounded-lg p-2 mt-2">
                      ❌ Vui lòng nhập số tiền tạm ứng
                    </div>
                  ) : parseInt(partialAmount) <= 0 || parseInt(partialAmount) > totalPay ? (
                    <div className="bg-red-600 text-white text-sm rounded-lg p-2 mt-2">
                      ❌ Số tiền phải lớn hơn 0 và không vượt quá {totalPay.toLocaleString('vi-VN')}{' '}
                      đ
                    </div>
                  ) : null)}
              </div>
            )}

            <div className="text-base text-gray-300 mb-6 text-center">
              Số tiền cần thanh toán:{' '}
              <span className="text-green-400 font-bold">
                {isPartialPayment && partialAmount
                  ? (parseInt(partialAmount) || 0).toLocaleString('vi-VN')
                  : totalPay.toLocaleString('vi-VN')}{' '}
                đ
              </span>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button
                className="w-full py-3 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg transition-colors"
                onClick={() => onSelectMethod('cash')}
                disabled={
                  isPartialPayment &&
                  (!partialAmount ||
                    parseInt(partialAmount) <= 0 ||
                    parseInt(partialAmount) > totalPay)
                }
              >
                Thanh Toán Bằng Tiền Mặt
              </button>
              <button
                className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium text-base transition-colors"
                onClick={() => onSelectMethod('qr')}
                disabled={
                  isPartialPayment &&
                  (!partialAmount ||
                    parseInt(partialAmount) <= 0 ||
                    parseInt(partialAmount) > totalPay)
                }
              >
                Chuyển Khoản QR
              </button>
            </div>
          </>
        ) : selectedPaymentMethod === 'cash' ? (
          <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Left side - Payment Summary */}
            <div className="flex-1 bg-gray-800 rounded-lg p-4 sm:p-6">
              <div className="text-lg font-bold text-pink-400 mb-4">
                {isPartialPayment ? 'Thông Tin Tạm Ứng' : 'Thông Tin Thanh Toán'}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">
                    {isPartialPayment ? 'Số tiền tạm ứng:' : 'Số tiền cần thanh toán:'}
                  </span>
                  <span className="text-green-400 font-bold">
                    {isPartialPayment && partialAmount
                      ? (parseInt(partialAmount) || 0).toLocaleString('vi-VN')
                      : totalPay.toLocaleString('vi-VN')}{' '}
                    đ
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
                      className={`font-bold ${
                        (isPartialPayment && partialAmount
                          ? parseInt(partialAmount) || 0
                          : totalPay) -
                          paidAmount >
                        0
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}
                    >
                      {Math.max(
                        0,
                        (isPartialPayment && partialAmount
                          ? parseInt(partialAmount) || 0
                          : totalPay) - paidAmount
                      ).toLocaleString('vi-VN')}{' '}
                      đ
                    </span>
                  </div>
                </div>
                {localPaymentComplete && (
                  <div className="mt-4 p-3 rounded bg-gray-700">
                    <div className="text-center text-gray-300">
                      {(() => {
                        const requiredAmount =
                          isPartialPayment && partialAmount
                            ? parseInt(partialAmount) || 0
                            : totalPay;
                        const changeAmount = paidAmount - requiredAmount;
                        return changeAmount === 0 ? (
                          <span>Thanh toán hoàn tất. Không cần trả lại tiền thừa.</span>
                        ) : (
                          <span>
                            Thanh toán hoàn tất. Vui lòng trả lại khách hàng{' '}
                            <span className="text-yellow-400 font-bold">
                              {changeAmount.toLocaleString('vi-VN')} đ
                            </span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Right side - Payment Input */}
            <div className="flex-1 bg-gray-800 rounded-lg p-4 sm:p-6">
              <div className="text-lg font-bold text-pink-400 mb-4">Nhập Số Tiền Khách Trả</div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inputAmount}
                    onChange={(e) => onInputAmount(e.target.value)}
                    onKeyPress={onKeyPress}
                    placeholder="Nhập số tiền"
                    disabled={paymentComplete}
                    className={`flex-1 px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    onClick={onAddPayment}
                    disabled={paymentComplete}
                    className={`px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Thêm
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => onQuickAmount(100000)}
                    disabled={paymentComplete}
                    className={`px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    100.000đ
                  </button>
                  <button
                    onClick={() => onQuickAmount(200000)}
                    disabled={paymentComplete}
                    className={`px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    200.000đ
                  </button>
                  <button
                    onClick={() => onQuickAmount(500000)}
                    disabled={paymentComplete}
                    className={`px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    500.000đ
                  </button>
                </div>
                <button
                  type="button"
                  className={`w-full py-3 rounded-lg text-white font-bold transition-colors ${
                    localPaymentComplete
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                  onClick={onConfirmPayment}
                  disabled={!localPaymentComplete}
                  key={`confirm-button-${localPaymentComplete}-${paidAmount}`}
                >
                  Xác Nhận Thanh Toán
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaymentMethodModal;
