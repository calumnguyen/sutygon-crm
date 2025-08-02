'use client';
import React, { useEffect } from 'react';
import { useTabContext } from '@/context/TabContext';
import { TAB_CONTENT_MAPPING } from '@/constants/tabs';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import { createTabId } from '@/types/tabTypes';
import HomeContent from '@/components/tabs/content/home/HomeContent';
import UsersContent from '@/components/tabs/content/users/UsersContent';
import CustomerContent from '@/components/tabs/content/customers/CustomerContent';
import OrdersContent from '@/components/tabs/content/orders/OrdersContent';
import OrdersNewContent from '@/components/tabs/content/orders/OrdersNewContent';
import InventoryContent from '@/components/tabs/content/inventory/InventoryContent';
import StorePasswordContent from '@/components/tabs/content/store-password/StorePasswordContent';

const contentComponents = {
  home: HomeContent,
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

  if (!activeFirstLevelTab) return null;

  return (
    <div className="flex-1 overflow-auto">
      {firstLevelTabs.map((tab) => {
        // Special case for new order tabs
        if (tab.id.startsWith('orders-new-')) {
          return (
            <div
              key={tab.id}
              style={{
                display: tab.id === activeFirstLevelTab.id ? 'block' : 'none',
                height: '100%',
              }}
            >
              <OrdersNewContent tabId={tab.id} />
            </div>
          );
        }
        const contentKey = TAB_CONTENT_MAPPING[tab.selectedOption?.id || 'home'];
        return (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeFirstLevelTab.id ? 'block' : 'none',
              height: '100%',
            }}
          >
            {Object.entries(contentComponents).map(([key, Component]) => (
              <div
                key={key}
                style={{ display: key === contentKey ? 'block' : 'none', height: '100%' }}
              >
                <Component />
              </div>
            ))}
            {!(contentComponents as Record<string, React.FC>)[contentKey] && (
              <div>No content available</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TabContent;
