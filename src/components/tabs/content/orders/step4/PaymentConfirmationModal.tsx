import React from 'react';

// Define props interface for the modal
interface PaymentConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onPaymentOption: (option: 'full' | 'partial' | 'later') => void;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  show,
  onClose,
  onPaymentOption,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
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
            onClick={() => onPaymentOption('full')}
          >
            Thanh Toán Toàn Bộ Ngay
          </button>
          <button
            className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
            onClick={() => onPaymentOption('partial')}
          >
            Thanh Toán Một Phần
          </button>
          <button
            className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
            onClick={() => onPaymentOption('later')}
          >
            Thanh Toán Sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;
