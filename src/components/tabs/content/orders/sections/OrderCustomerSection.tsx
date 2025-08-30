import React from 'react';
import { User, Phone, MapPin, Building, FileText } from 'lucide-react';
import { CustomerDetails } from './types';

interface OrderCustomerSectionProps {
  orderId: number;
  customerDetails: CustomerDetails | null;
}

const OrderCustomerSection: React.FC<OrderCustomerSectionProps> = ({
  orderId,
  customerDetails,
}) => {
  const formatOrderId = (id: number) => {
    return `#${id.toString().padStart(6, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format Vietnamese phone numbers
    if (cleaned.length === 10) {
      // Format: 0765 116 999
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('84')) {
      // Format: +84 765 116 999
      return `+84 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // Format: 0765 116 999 (remove leading 0)
      return `${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }

    // Return original if no pattern matches
    return phone;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {customerDetails ? (
        <div className="space-y-4">
          {/* Order Number Header */}
          <div className="relative">
            <div className="absolute -top-3 left-4 bg-gray-800 px-2">
              <span className="text-gray-400 text-sm font-medium">Số đơn hàng</span>
            </div>
            <div className="p-[2px] rounded-lg bg-gradient-to-r from-blue-500 via-cyan-400 to-green-500">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <p className="text-white font-bold text-lg">{formatOrderId(orderId)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Name Header */}
          <div className="relative">
            <div className="absolute -top-3 left-4 bg-gray-800 px-2">
              <span className="text-gray-400 text-sm font-medium">Tên khách hàng</span>
            </div>
            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-400" />
                <p className="text-white font-bold text-lg">{customerDetails.name}</p>
              </div>
            </div>
          </div>

          {/* Other Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-400 text-xs">Số điện thoại</p>
                <p className="text-white font-medium text-sm truncate">
                  {formatPhoneNumber(customerDetails.phone)}
                </p>
              </div>
            </div>

            {customerDetails.company && (
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Công ty</p>
                  <p className="text-white font-medium text-sm truncate">
                    {customerDetails.company}
                  </p>
                </div>
              </div>
            )}

            {customerDetails.address && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg sm:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Địa chỉ</p>
                  <p className="text-white font-medium text-sm">{customerDetails.address}</p>
                </div>
              </div>
            )}

            {customerDetails.notes && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg sm:col-span-2">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Ghi chú</p>
                  <p className="text-white font-medium text-sm">{customerDetails.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Không có thông tin khách hàng</p>
        </div>
      )}
    </div>
  );
};

export default OrderCustomerSection;
