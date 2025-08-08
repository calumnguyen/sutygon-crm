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
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Quản Lý Đơn Hàng</h1>
        <div className="w-full sm:w-auto flex items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            disabled={loading}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleAddOrder}
            leftIcon={<Plus className="w-5 h-5" />}
            className="w-full sm:w-auto"
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
