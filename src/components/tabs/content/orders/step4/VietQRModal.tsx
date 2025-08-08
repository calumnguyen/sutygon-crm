import React from 'react';

interface VietQRModalProps {
  show: boolean;
  qrLoading: boolean;
  qrError: string | null;
  qrSVG: string | null;
  totalPay: number;
  orderId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const VietQRModal: React.FC<VietQRModalProps> = ({
  show,
  qrLoading,
  qrError,
  qrSVG,
  totalPay,
  orderId,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Đóng"
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl leading-none"
          onClick={onCancel}
        >
          ×
        </button>
        <div className="w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8">
          <div className="text-lg sm:text-xl font-bold text-pink-400 mb-4 sm:mb-6 text-center">
            Quét mã VietQR để thanh toán
          </div>
          <div className="mb-4 flex flex-col items-center">
            {qrLoading && <div className="text-white">Đang tạo mã QR...</div>}
            {qrError && <div className="text-red-400 text-center break-words">{qrError}</div>}
            {!qrLoading && !qrError && qrSVG && (
              <div className="bg-white p-2 rounded w-full max-w-[360px] sm:max-w-[380px] [&_img]:max-w-full [&_img]:h-auto [&_svg]:w-full [&_svg]:h-auto">
                {qrSVG.startsWith('data:image') ? (
                  <img src={qrSVG} alt="VietQR" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: qrSVG }} />
                )}
              </div>
            )}
            <div className="mt-4 text-white text-center text-sm sm:text-base">
              <div>
                <span className="font-semibold">Ngân hàng:</span> Sacombank (STB)
              </div>
              <div>
                <span className="font-semibold">Chủ tài khoản:</span> Nguyen Huu Tan
              </div>
              <div>
                <span className="font-semibold">Số tài khoản:</span> 1129999
              </div>
              <div>
                <span className="font-semibold">Số tiền:</span> {totalPay.toLocaleString('vi-VN')} đ
              </div>
              <div>
                <span className="font-semibold">Nội dung:</span> CK #{orderId}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full sticky bottom-0 bg-gray-900 p-3 sm:p-4 flex gap-2 border-t border-gray-700">
          <button
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-lg transition-colors"
            onClick={onConfirm}
          >
            Đã Nhận Tiền
          </button>
          <button
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
            onClick={onCancel}
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

export default VietQRModal;
