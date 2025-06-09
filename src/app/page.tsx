'use client';
import React, { useState, useEffect } from 'react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { AppProvider } from '@/context/AppContext';
import { useTabContext } from '@/context/TabContext';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import type { FirstLevelTab, TabOption } from '@/types/tabTypes';
import { createTabId } from '@/types/tabTypes';
import UsersContent from '@/components/tabs/content/UsersContent';

const defaultFirstLevelTab: FirstLevelTab = {
  id: createTabId('home'),
  type: 'first',
  label: 'Trang Chủ',
  options: DEFAULT_TAB_OPTIONS,
  isDefault: true,
  isClosable: false,
};

// Placeholder content for each dropdown option
const DROPDOWN_CONTENT: Record<string, React.ReactNode> = {
  home: <div className="text-white text-xl">Trang Chủ Content Placeholder</div>,
  customers: <div className="text-white text-xl">Khách Hàng Content Placeholder</div>,
  inventory: <div className="text-white text-xl">Kho Content Placeholder</div>,
  users: <UsersContent />,
};

const TabContent: React.FC = () => {
  const { firstLevelTabs, activeFirstLevelTab, addFirstLevelTab, activateTab } = useTabContext();
  const [selectedDropdownOption, setSelectedDropdownOption] = useState<TabOption>(
    DEFAULT_TAB_OPTIONS[0]
  );

  useEffect(() => {
    const initializeTabs = () => {
      if (firstLevelTabs.length === 0) {
        addFirstLevelTab(defaultFirstLevelTab);
      }
    };
    initializeTabs();
  }, [firstLevelTabs.length, addFirstLevelTab]);

  // Handler for dropdown option selection
  const handleDropdownSelect = (option: TabOption) => {
    setSelectedDropdownOption(option);
    // Only update the label if the active tab is the default tab
    if (activeFirstLevelTab && activeFirstLevelTab.isDefault) {
      const updatedTab: FirstLevelTab = {
        ...activeFirstLevelTab,
        label: option.label,
        selectedOption: option,
      };
      addFirstLevelTab(updatedTab);
      activateTab(updatedTab.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <BrowserTabBar
        selectedDropdownOption={selectedDropdownOption}
        onDropdownSelect={handleDropdownSelect}
      />
      <div className="flex-1 p-4">{DROPDOWN_CONTENT[selectedDropdownOption.id]}</div>
    </div>
  );
};

export default function Home() {
  return (
    <AppProvider>
      <TabContent />
    </AppProvider>
  );
}
