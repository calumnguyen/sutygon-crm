import React from 'react';
import { useTabContext } from '@/context/TabContext';
import { TAB_CONTENT_MAPPING } from '@/constants/tabs';
import HomeContent from './content/HomeContent';
import OrdersContent from './content/OrdersContent';
import InventoryContent from './content/InventoryContent';
import CustomersContent from './content/CustomersContent';
import UsersContent from './content/UsersContent';
import ReportsContent from './content/ReportsContent';

const contentComponents = {
  HomeContent,
  OrdersContent,
  InventoryContent,
  CustomersContent,
  UsersContent,
  ReportsContent,
};

const TabContent: React.FC = () => {
  const { state } = useTabContext();
  const { firstLevelTabs, activeFirstLevelTab } = state;

  const activeTab = firstLevelTabs.find(tab => tab.id === activeFirstLevelTab?.id);
  if (!activeTab) return null;

  const contentKey = TAB_CONTENT_MAPPING[activeTab.selectedOption?.id || 'home'];
  const ContentComponent = contentComponents[contentKey as keyof typeof contentComponents];

  return (
    <div className="flex-1 overflow-auto">
      {ContentComponent ? <ContentComponent /> : <div>No content available</div>}
    </div>
  );
};

export default TabContent; 