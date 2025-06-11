'use client';
import React from 'react';
import { useTabContext } from '@/context/TabContext';
import { TAB_CONTENT_MAPPING } from '@/constants/tabs';
import UsersContent from '@/components/tabs/content/UsersContent';
import CustomerContent from '@/components/tabs/content/CustomerContent';

const contentComponents = {
  users: UsersContent,
  customers: CustomerContent,
};

const TabContent: React.FC = () => {
  const { firstLevelTabs, activeFirstLevelTab } = useTabContext();

  const activeTab = firstLevelTabs.find((tab) => tab.id === activeFirstLevelTab?.id);
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
