"use client";
import React from 'react';

/**
 * OrdersContent Component
 * 
 * Displays the orders management content.
 * 
 * @component
 */
const OrdersContent: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-200 mb-4">Đơn Hàng</h2>
      
      {/* Orders Table */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Mã Đơn</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Khách Hàng</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Ngày Tạo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Trạng Thái</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tổng Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {[1, 2, 3, 4, 5].map((order) => (
                <tr key={order} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-gray-300">#ORD{order}00</td>
                  <td className="px-4 py-3 text-sm text-gray-300">Khách hàng {order}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">2024-03-{order}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      Hoàn Thành
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{order * 1000000}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end space-x-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Tạo Đơn Hàng Mới
        </button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
          Xuất Báo Cáo
        </button>
      </div>
    </div>
  );
};

export default OrdersContent; 