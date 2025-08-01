import React, { useState } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { Plus, RefreshCw } from 'lucide-react';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import { useOrdersTable } from './hooks';
import { OrdersTable } from './OrdersTable';

const OrdersContent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addFirstLevelTab, activateTab } = useTabContext();
  const { orders, loading, error, loadingMore, hasMore, loadMore, refetch } = useOrdersTable();

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

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quản Lý Đơn Hàng</h1>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={handleRefresh} 
            leftIcon={<RefreshCw className="w-5 h-5" />}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddOrder} 
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Thêm đơn hàng mới
          </Button>
        </div>
      </div>
      
      <OrdersTable 
        orders={orders}
        loading={loading}
        error={error}
        loadingMore={loadingMore}
        hasMore={hasMore}
        loadMore={loadMore}
      />
    </div>
  );
};

export default OrdersContent;
