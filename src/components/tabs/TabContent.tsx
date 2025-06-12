'use client';
import React, { useEffect } from 'react';
import { useTabContext } from '@/context/TabContext';
import { TAB_CONTENT_MAPPING } from '@/constants/tabs';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import { createTabId } from '@/types/tabTypes';
import UsersContent from '@/components/tabs/content/UsersContent';
import CustomerContent from '@/components/tabs/content/CustomerContent';
import OrdersContent from '@/components/tabs/content/OrdersContent';
import OrdersNewContent from '@/components/tabs/content/OrdersNewContent';
import InventoryContent from '@/components/tabs/content/InventoryContent';
import StorePasswordContent from '@/components/tabs/content/StorePasswordContent';

const contentComponents = {
  users: UsersContent,
  customers: CustomerContent,
  orders: OrdersContent,
  inventory: InventoryContent,
  'store-password': StorePasswordContent,
};

const defaultFirstLevelTab = {
  id: createTabId('home'),
  type: 'first' as const,
  label: 'Trang Chủ',
  options: DEFAULT_TAB_OPTIONS,
  isDefault: true,
  isClosable: false,
};

const TabContent: React.FC = () => {
  const { firstLevelTabs, activeFirstLevelTab, addFirstLevelTab } = useTabContext();

  useEffect(() => {
    if (firstLevelTabs.length === 0) {
      addFirstLevelTab(defaultFirstLevelTab);
    }
  }, [firstLevelTabs.length, addFirstLevelTab]);

  const activeTab = firstLevelTabs.find((tab) => tab.id === activeFirstLevelTab?.id);
  if (!activeTab) return null;

  // Check if the active tab is a new order tab
  if (activeTab.id.startsWith('orders-new-')) {
    return (
      <div className="flex-1 overflow-auto">
        <OrdersNewContent tabId={activeTab.id} />
      </div>
    );
  }

  const contentKey = TAB_CONTENT_MAPPING[activeTab.selectedOption?.id || 'home'];

  return (
    <div className="flex-1 overflow-auto">
      {Object.entries(contentComponents).map(([key, Component]) => (
        <div key={key} style={{ display: key === contentKey ? 'block' : 'none', height: '100%' }}>
          <Component />
        </div>
      ))}
      {!(contentComponents as Record<string, React.FC>)[contentKey] && (
        <div>No content available</div>
      )}
    </div>
  );
};

export default TabContent;
