import React from 'react';
import { formatPhoneNumber } from '@/lib/utils/phone';

/**
 * Customer info card for step 4 summary.
 * @param customer Customer object (nullable)
 * @param date Rent date string
 */
export const OrderSummaryCustomerInfo: React.FC<{
  customer: { name: string; company?: string | null; phone: string } | null;
  date: string;
}> = ({ customer, date }) => (
  <div className="bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2">
    <div className="text-lg font-bold text-blue-400 mb-1">Khách hàng</div>
    <div className="text-base text-white font-semibold">{customer?.name || '-'}</div>
    {customer?.company && <div className="text-sm text-gray-300">Công ty: {customer.company}</div>}
    <div className="text-sm text-gray-300">
      SĐT:{' '}
      <span className="font-mono">{customer?.phone ? formatPhoneNumber(customer.phone) : '-'}</span>
    </div>
    <div className="flex gap-4 mt-2">
      <div>
        <div className="text-xs text-blue-400 font-bold">Ngày thuê</div>
        <div className="text-sm text-white font-semibold">{date}</div>
      </div>
      <div>
        <div className="text-xs text-green-400 font-bold">Ngày trả dự kiến</div>
        <div className="text-sm text-white font-semibold">
          {(() => {
            const parsed = date && date.length === 10 ? date : null;
            if (!parsed) return '-';
            const d = parsed.split('/');
            if (d.length !== 3) return '-';
            const dt = new Date(+d[2], +d[1] - 1, +d[0]);
            dt.setDate(dt.getDate() + 3);
            return dt.toLocaleDateString('vi-VN');
          })()}
        </div>
      </div>
    </div>
  </div>
);
