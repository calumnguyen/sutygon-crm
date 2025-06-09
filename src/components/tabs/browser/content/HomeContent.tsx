"use client";
import React from 'react';

/**
 * HomeContent Component
 * 
 * Displays the main dashboard content with quick stats, recent activity, and quick actions.
 * 
 * @component
 */
const HomeContent: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-200 mb-4">Trang Chủ</h2>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Đơn Hàng Mới</h3>
          <p className="text-2xl font-semibold text-blue-400">12</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Khách Hàng Mới</h3>
          <p className="text-2xl font-semibold text-green-400">5</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Sản Phẩm Sắp Hết</h3>
          <p className="text-2xl font-semibold text-yellow-400">8</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-200 mb-4">Hoạt Động Gần Đây</h3>
        <div className="space-y-3">
          {[
            { action: 'Tạo đơn hàng mới', time: '5 phút trước', user: 'Admin' },
            { action: 'Thêm khách hàng mới', time: '15 phút trước', user: 'Staff' },
            { action: 'Cập nhật kho hàng', time: '30 phút trước', user: 'Admin' },
            { action: 'Xuất báo cáo', time: '1 giờ trước', user: 'Manager' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">{activity.action}</span>
                <span className="text-gray-500">bởi {activity.user}</span>
              </div>
              <span className="text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-200 mb-4">Thao Tác Nhanh</h3>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Tạo Đơn Hàng Mới
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
            Thêm Khách Hàng
          </button>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors">
            Kiểm Tra Kho
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeContent; 