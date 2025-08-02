import React from 'react';
import InventoryOverview from '@/components/common/InventoryOverview';

const HomeContent: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Trang Chủ</h1>
        <p className="text-gray-400">Tổng quan hệ thống quản lý cửa hàng</p>
      </div>

      {/* Inventory Overview Section */}
      <div className="mb-8">
        <InventoryOverview autoRefresh={true} />
      </div>

      {/* Future sections can be added here */}
      {/* Example: Recent Orders, Low Stock Alerts, etc. */}
    </div>
  );
};

export default HomeContent;
