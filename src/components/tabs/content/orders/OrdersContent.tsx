import React, { useState, useEffect } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { Plus, RefreshCw } from 'lucide-react';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import { useOrdersTable } from './hooks';
import { OrdersGrid } from './OrdersGrid';
import DeleteAllOrdersModal from '@/components/common/DeleteAllOrdersModal';

const OrdersContent: React.FC = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  // Keyboard shortcut handler for secret delete modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+X (or Cmd+Shift+X on Mac) - "X" for delete
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key === 'X' || event.key === 'x')
      ) {
        event.preventDefault();

        setShowDeleteModal(true);
      }

      // Alternative: Check for Ctrl+Alt+X (or Cmd+Alt+X on Mac)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.altKey &&
        (event.key === 'X' || event.key === 'x')
      ) {
        event.preventDefault();

        setShowDeleteModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDeleteSuccess = () => {
    // Refresh the orders list after deletion
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

      <OrdersGrid
        orders={orders}
        loading={loading}
        error={error}
        loadingMore={loadingMore}
        hasMore={hasMore}
        loadMore={loadMore}
      />

      {/* Secret Delete All Orders Modal */}
      <DeleteAllOrdersModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default OrdersContent;
