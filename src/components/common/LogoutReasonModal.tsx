import React from 'react';
import { AlertTriangle, Clock, X, LogOut, AlertCircle } from 'lucide-react';

export type LogoutReason =
  | 'timeout'
  | 'session_expired'
  | 'store_closed'
  | 'manual_logout'
  | 'authentication_error'
  | 'network_error'
  | 'server_error'
  | 'unknown';

interface LogoutReasonModalProps {
  isOpen: boolean;
  reason: LogoutReason;
  details?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const getReasonInfo = (reason: LogoutReason) => {
  switch (reason) {
    case 'timeout':
      return {
        title: 'Phiên đăng nhập đã hết hạn',
        titleEn: 'Session Timeout',
        description:
          'Bạn đã không hoạt động trong một thời gian dài. Vui lòng đăng nhập lại để tiếp tục.',
        descriptionEn: 'You have been inactive for a long time. Please log in again to continue.',
        reasonText: 'Hết hạn do không hoạt động',
        reasonTextEn: 'Timeout due to inactivity',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      };
    case 'session_expired':
      return {
        title: 'Phiên đăng nhập đã hết hạn',
        titleEn: 'Session Expired',
        description: 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
        descriptionEn: 'Your login session has expired. Please log in again.',
        reasonText: 'Phiên đăng nhập hết hạn',
        reasonTextEn: 'Session expired',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      };
    case 'store_closed':
      return {
        title: 'Cửa hàng đã đóng cửa',
        titleEn: 'Store Closed',
        description:
          'Cửa hàng hiện đã đóng cửa. Chỉ quản lý mới có thể truy cập khi cửa hàng đóng.',
        descriptionEn:
          'The store is currently closed. Only managers can access when the store is closed.',
        reasonText: 'Cửa hàng đóng cửa',
        reasonTextEn: 'Store closed',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    case 'manual_logout':
      return {
        title: 'Đã đăng xuất',
        titleEn: 'Logged Out',
        description: 'Bạn đã đăng xuất thành công.',
        descriptionEn: 'You have been logged out successfully.',
        reasonText: 'Đăng xuất thủ công',
        reasonTextEn: 'Manual logout',
        icon: LogOut,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };
    case 'authentication_error':
      return {
        title: 'Lỗi xác thực',
        titleEn: 'Authentication Error',
        description: 'Có lỗi xảy ra trong quá trình xác thực. Vui lòng đăng nhập lại.',
        descriptionEn: 'An error occurred during authentication. Please log in again.',
        reasonText: 'Lỗi xác thực',
        reasonTextEn: 'Authentication error',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    case 'network_error':
      return {
        title: 'Lỗi kết nối mạng',
        titleEn: 'Network Error',
        description: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
        descriptionEn:
          'Unable to connect to server. Please check your network connection and try again.',
        reasonText: 'Lỗi kết nối mạng',
        reasonTextEn: 'Network connection error',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    case 'server_error':
      return {
        title: 'Lỗi máy chủ',
        titleEn: 'Server Error',
        description: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
        descriptionEn: 'The server encountered an issue. Please try again later.',
        reasonText: 'Lỗi máy chủ',
        reasonTextEn: 'Server error',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    default:
      return {
        title: 'Đã đăng xuất',
        titleEn: 'Logged Out',
        description: 'Phiên đăng nhập của bạn đã kết thúc. Vui lòng đăng nhập lại.',
        descriptionEn: 'Your login session has ended. Please log in again.',
        reasonText: 'Không xác định',
        reasonTextEn: 'Unknown',
        icon: AlertTriangle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      };
  }
};

const LogoutReasonModal: React.FC<LogoutReasonModalProps> = ({
  isOpen,
  reason,
  details,
  onClose,
  onRetry,
}) => {
  if (!isOpen) return null;

  const reasonInfo = getReasonInfo(reason);
  const IconComponent = reasonInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full border ${reasonInfo.borderColor}`}
      >
        {/* Header */}
        <div className={`p-6 ${reasonInfo.bgColor} rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IconComponent className={`w-6 h-6 ${reasonInfo.color}`} />
              <div>
                <h2 className={`text-lg font-semibold ${reasonInfo.color}`}>{reasonInfo.title}</h2>
                <p className={`text-xs ${reasonInfo.color} opacity-75`}>{reasonInfo.titleEn}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Reason Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md border-l-4 border-gray-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">LÝ DO / REASON:</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 font-medium">{reasonInfo.reasonText}</p>
              <p className="text-xs text-gray-500 italic">{reasonInfo.reasonTextEn}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className="text-gray-700 mb-2">{reasonInfo.description}</p>
            <p className="text-sm text-gray-500 italic">{reasonInfo.descriptionEn}</p>
          </div>

          {details && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 font-medium mb-1">
                Chi tiết lỗi / Error Details:
              </p>
              <p className="text-sm text-gray-500 font-mono break-words">{details}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {onRetry &&
              (reason === 'network_error' ||
                reason === 'server_error' ||
                reason === 'authentication_error') && (
                <button
                  onClick={onRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Thử lại
                </button>
              )}
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                onRetry &&
                (reason === 'network_error' ||
                  reason === 'server_error' ||
                  reason === 'authentication_error')
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutReasonModal;
