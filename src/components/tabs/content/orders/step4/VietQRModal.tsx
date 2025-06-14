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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center">
        <div className="text-xl font-bold text-pink-400 mb-6">Quét mã VietQR để thanh toán</div>
        <div className="mb-4 flex flex-col items-center">
          {qrLoading && <div className="text-white">Đang tạo mã QR...</div>}
          {qrError && <div className="text-red-400">{qrError}</div>}
          {!qrLoading &&
            !qrError &&
            qrSVG &&
            (qrSVG.startsWith('data:image') ? (
              <img src={qrSVG} alt="VietQR" className="bg-white p-2 rounded" />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: qrSVG }} className="bg-white p-2 rounded" />
            ))}
          <div className="mt-4 text-white text-center text-base">
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
        <div className="w-full flex gap-2 mt-2">
          <button
            className="flex-1 py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-lg transition-colors"
            onClick={onConfirm}
          >
            Đã Nhận Tiền
          </button>
          <button
            className="flex-1 py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-base transition-colors"
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
