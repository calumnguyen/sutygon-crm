import React from 'react';

interface PrintReceiptModalProps {
  show: boolean;
  onPrint: () => void;
  onClose: () => void;
}

const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ show, onPrint, onClose }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center">
        <div className="text-xl font-bold text-pink-400 mb-6">In Biên Lai Đơn Hàng</div>
        <div className="text-base text-gray-300 mb-6 text-center">
          Bạn có muốn in biên lai cho đơn hàng này không?
        </div>
        <div className="w-full flex flex-col gap-3">
          <button
            className="w-full py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-colors"
            onClick={onPrint}
          >
            In Biên Lai
          </button>
          <button
            className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReceiptModal;
