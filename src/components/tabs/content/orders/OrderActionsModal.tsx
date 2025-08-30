import React from 'react';
import { Printer, FileText, X, Eye } from 'lucide-react';

interface OrderActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt: () => void;
  onToggleTaxInvoice: () => void;
  onViewOrderDetails: () => void;
  hasTaxInvoiceExported: boolean;
}

const OrderActionsModal: React.FC<OrderActionsModalProps> = ({
  isOpen,
  onClose,
  onPrintReceipt,
  onToggleTaxInvoice,
  onViewOrderDetails,
  hasTaxInvoiceExported,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Bạn muốn làm gì với đơn hàng?</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          {/* View Order Details Button */}
          <button
            onClick={() => {
              onViewOrderDetails();
              onClose();
            }}
            className="w-full p-[2px] rounded-xl bg-gradient-to-tr from-blue-500 via-green-400 to-blue-500 shadow-neon hover:shadow-neon-glow hover:scale-105 hover:from-blue-400 hover:via-green-300 hover:to-blue-400 transition-all duration-300 transform"
          >
            <div className="bg-gray-900 rounded-xl px-4 py-3 text-center hover:bg-gray-800 transition-colors duration-300">
              <span className="text-white font-bold text-sm hover:text-blue-200 transition-colors duration-300 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> Xem Chi Tiết Đơn Hàng
              </span>
            </div>
          </button>

          {/* Print Receipt Button */}
          <button
            onClick={() => {
              onPrintReceipt();
              onClose();
            }}
            className="w-full p-[2px] rounded-xl bg-gradient-to-tr from-blue-500 via-green-400 to-blue-500 shadow-neon hover:shadow-neon-glow hover:scale-105 hover:from-blue-400 hover:via-green-300 hover:to-blue-400 transition-all duration-300 transform"
          >
            <div className="bg-gray-900 rounded-xl px-4 py-3 text-center hover:bg-gray-800 transition-colors duration-300">
              <span className="text-white font-bold text-sm hover:text-blue-200 transition-colors duration-300 flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> In Biên Nhận
              </span>
            </div>
          </button>

          {/* Tax Invoice Button - only show if not exported yet */}
          {!hasTaxInvoiceExported && (
            <button
              onClick={() => {
                onToggleTaxInvoice();
                onClose();
              }}
              className="w-full p-[2px] rounded-xl bg-gradient-to-tr from-blue-500 via-green-400 to-blue-500 shadow-neon hover:shadow-neon-glow hover:scale-105 hover:from-blue-400 hover:via-green-300 hover:to-blue-400 transition-all duration-300 transform"
            >
              <div className="bg-gray-900 rounded-xl px-4 py-3 text-center hover:bg-gray-800 transition-colors duration-300">
                <span className="text-white font-bold text-sm hover:text-blue-200 transition-colors duration-300 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Xuất Hóa Đơn
                </span>
              </div>
            </button>
          )}

          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 border border-slate-600/40 hover:border-slate-600/60 hover:text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderActionsModal;
