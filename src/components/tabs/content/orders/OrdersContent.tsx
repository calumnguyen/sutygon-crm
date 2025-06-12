import React, { useState } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { Plus } from 'lucide-react';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import OrdersNewContent from './OrdersNewContent';

const OrdersContent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addFirstLevelTab, activateTab } = useTabContext();

  const handleAddOrder = () => {
    const newTabId = createTabId(`orders-new-${Date.now()}`);
    addFirstLevelTab({
      id: newTabId,
      label: 'Đơn Hàng Mới',
      type: 'first',
      options: [],
      isClosable: true,
      isDefault: false,
      selectedOption: undefined,
    });
    activateTab(newTabId);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quản Lý Đơn Hàng</h1>
        <Button variant="primary" onClick={handleAddOrder} leftIcon={<Plus className="w-5 h-5" />}>
          Thêm đơn hàng mới
        </Button>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="text-gray-400 text-center py-10">
          Chức năng quản lý đơn hàng sẽ sớm ra mắt.
        </div>
      </div>
    </div>
  );
};

export default OrdersContent;
