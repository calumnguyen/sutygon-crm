import React from 'react';
import Button from '@/components/common/dropdowns/Button';

const CustomerContent: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quản lý khách hàng</h1>
        {/* Example action button, can be replaced or removed as needed */}
        <Button variant="primary" size="md" onClick={() => {}}>
          Thêm khách hàng
        </Button>
      </div>
      {/* Content goes here */}
      <div className="text-gray-400 text-center py-10">
        Chức năng quản lý khách hàng sẽ sớm ra mắt.
      </div>
    </div>
  );
};

export default CustomerContent;
