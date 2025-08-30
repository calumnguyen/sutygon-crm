import React from 'react';
import { Shield, DollarSign, FileText, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderDepositSectionProps {
  depositAmount: number;
  depositType?: 'vnd' | 'percent';
  depositValue?: number;
  documentType?: string | null;
  documentOther?: string | null;
  documentName?: string | null;
  documentId?: string | null;
  documentStatus?: string | null;
  taxInvoiceExported?: boolean;
}

const OrderDepositSection: React.FC<OrderDepositSectionProps> = ({
  depositAmount,
  depositType,
  depositValue,
  documentType,
  documentOther,
  documentName,
  documentId,
  documentStatus,
  taxInvoiceExported,
}) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const getDocumentStatusColor = (status: string | null) => {
    // If status is undefined but we have a document type, assume it's "not kept"
    if (!status && documentType) {
      return 'text-yellow-400';
    }

    switch (status?.toLowerCase()) {
      case 'returned':
        return 'text-green-400';
      case 'on_file':
        return 'text-blue-400';
      case 'not kept':
        return 'text-yellow-400';
      case 'not_kept':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getDocumentStatusText = (status: string | null) => {
    if (!status) return 'Chưa xác định';

    const cleanStatus = status.toLowerCase().trim();

    if (cleanStatus === 'returned') return 'Đã trả';
    if (cleanStatus === 'on_file') return 'Đang giữ';
    if (cleanStatus === 'not kept') return 'Chưa giữ';
    if (cleanStatus === 'not_kept') return 'Chưa giữ';

    return 'Chưa xác định';
  };

  const getDocumentTypeDisplay = (documentType: string | null) => {
    if (!documentType) return 'Không có tài liệu';

    // Handle actual document types (exact values from order creation)
    switch (documentType) {
      case 'Căn Cước':
        return 'Căn Cước';
      case 'Giấy Phép Lái Xe':
        return 'Giấy Phép Lái Xe';
      case 'Thẻ Đảng Viên':
        return 'Thẻ Đảng Viên';
      case 'Giấy tờ có giá trị pháp lý khác':
        return 'Giấy tờ có giá trị pháp lý khác';
      default:
        return documentType;
    }
  };

  const getFileCategory = (documentName: string | null) => {
    if (!documentName) return 'Chưa xác định';

    // Split the name and get the last word (given name in Vietnamese)
    const nameParts = documentName.trim().split(' ');
    const givenName = nameParts[nameParts.length - 1]; // Last word is the given name
    const firstLetter = givenName.charAt(0).toUpperCase();

    if (firstLetter >= 'A' && firstLetter <= 'C') return 'A-C';
    if (firstLetter >= 'D' && firstLetter <= 'F') return 'D-F';
    if (firstLetter >= 'G' && firstLetter <= 'I') return 'G-I';
    if (firstLetter >= 'J' && firstLetter <= 'L') return 'J-L';
    if (firstLetter >= 'M' && firstLetter <= 'O') return 'M-O';
    if (firstLetter >= 'P' && firstLetter <= 'R') return 'P-R';
    if (firstLetter >= 'S' && firstLetter <= 'U') return 'S-U';
    if (firstLetter >= 'V' && firstLetter <= 'X') return 'V-X';
    if (firstLetter >= 'Y' && firstLetter <= 'Z') return 'Y-Z';

    return 'A-C'; // Default fallback
  };

  const getDocumentStatusIcon = (status: string | null) => {
    // If status is undefined but we have a document type, assume it's "not kept"
    if (!status && documentType) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }

    switch (status?.toLowerCase()) {
      case 'returned':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'on_file':
        return <FolderOpen className="w-4 h-4 text-blue-400" />;
      case 'not kept':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'not_kept':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Show section if there's a deposit OR a document
  if (depositAmount <= 0 && !documentType) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white">
          {depositAmount > 0 ? 'Tiền cọc' : 'Tài liệu cọc'}
        </h2>
        {depositAmount > 0 && (
          <span className="hidden sm:inline bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
            {depositType === 'percent' ? `${depositValue}%` : 'Tiền mặt'}
          </span>
        )}
      </div>

      <div
        className={`grid gap-6 ${depositAmount > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
      >
        {/* Deposit Amount - Only show if there's a deposit */}
        {depositAmount > 0 && (
          <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Số tiền cọc</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(depositAmount)}</div>
            {depositType && depositValue && (
              <div className="text-xs text-gray-400 mt-1">
                {depositType === 'percent'
                  ? `${depositValue}% của tổng đơn hàng`
                  : 'Tiền cọc cố định'}
              </div>
            )}
          </div>
        )}

        {/* Document Information */}
        {documentType && (
          <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400 text-sm font-medium">Tài liệu cọc</span>
              </div>
              <div className="flex items-center gap-2">
                {getDocumentStatusIcon(documentStatus || null)}
                <span
                  className={`text-xs font-medium ${getDocumentStatusColor(documentStatus || null)}`}
                >
                  {getDocumentStatusText(documentStatus || null)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Document Type */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Loại tài liệu:</span>
                <span className="text-white text-sm font-medium">
                  {getDocumentTypeDisplay(documentType)}
                </span>
              </div>

              {/* Document Other - Only show if document type is "other" and documentOther exists */}
              {documentType === 'Giấy tờ có giá trị pháp lý khác' && documentOther && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Tên tài liệu:</span>
                  <span className="text-white text-sm font-medium">{documentOther}</span>
                </div>
              )}

              {/* Document Name */}
              {documentName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Tên khách hàng:</span>
                  <span className="text-white text-sm font-medium">{documentName}</span>
                </div>
              )}

              {/* Document ID */}
              {documentId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Số tài liệu:</span>
                  <span className="text-white text-sm font-medium">{documentId}</span>
                </div>
              )}

              {/* File Location */}
              {documentName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Vị trí lưu trữ:</span>
                  <div className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 text-sm font-medium">
                      Thư mục {getFileCategory(documentName)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Summary - Only show if there's a deposit */}
      {depositAmount > 0 && (
        <div className="mt-6 p-[2px] rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Tổng tiền cọc</h3>
                <p className="text-gray-400 text-xs">
                  {depositType === 'percent' ? `${depositValue}% của đơn hàng` : 'Tiền cọc cố định'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    {formatCurrency(depositAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDepositSection;
