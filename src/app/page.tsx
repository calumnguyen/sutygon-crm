"use client";
import React, { useState } from 'react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { AppProvider } from '@/context/AppContext';
import { useTabContext } from '@/context/TabContext';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import ContentManager from '@/components/tabs/browser/content/ContentManager';
import type { FirstLevelTab, SecondLevelTab, TabOption } from '@/types/tabs';

const defaultFirstLevelTab = {
  id: 'home',
  label: 'Trang Chủ',
  options: DEFAULT_TAB_OPTIONS,
  isDefault: true,
  isClosable: false
};

// Placeholder content for each dropdown option
const DROPDOWN_CONTENT: Record<string, React.ReactNode> = {
  home: <div className="text-white text-xl">Trang Chủ Content Placeholder</div>,
  customers: <div className="text-white text-xl">Khách Hàng Content Placeholder</div>,
  inventory: <div className="text-white text-xl">Kho Content Placeholder</div>,
  users: <div className="text-white text-xl">Nhân Viên Content Placeholder</div>,
};

const TabContent: React.FC = () => {
  const { state, dispatch, addFirstLevelTab, removeFirstLevelTab, setActiveFirstLevelTab, setActiveSecondLevelTab } = useTabContext();
  const [selectedDropdownOption, setSelectedDropdownOption] = useState<TabOption>(DEFAULT_TAB_OPTIONS[0]);

  React.useEffect(() => {
    const initializeTabs = () => {
      dispatch({ type: 'SET_FIRST_LEVEL_TABS', payload: [defaultFirstLevelTab] });
      setActiveFirstLevelTab(defaultFirstLevelTab);
    };
    initializeTabs();
  }, []);

  // Handler for dropdown option selection
  const handleDropdownSelect = (option: TabOption) => {
    setSelectedDropdownOption(option);
  };

  // Function to add a new Level 1 tab for search (scalable, robust)
  const addSearchTab = (query: string) => {
    const searchTabId = `search-${query}`;
    // Prevent duplicate search tabs
    if (!state.firstLevelTabs.some(tab => tab.id === searchTabId)) {
      const newTab: FirstLevelTab = {
        id: searchTabId,
        label: `Search: ${query}`,
        options: [],
        isClosable: true
      };
      addFirstLevelTab(newTab);
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      addSearchTab(query);
    }
  };

  // Handler for closing tabs
  const handleCloseTab = (tabToClose: FirstLevelTab) => {
    // Don't allow closing the default tab
    if (tabToClose.id === defaultFirstLevelTab.id) return;

    // Remove the tab
    removeFirstLevelTab(tabToClose.id);
  };

  return (
    <div className="flex flex-col h-full">
      <BrowserTabBar
        firstLevelTabs={state.firstLevelTabs}
        secondLevelTabs={state.secondLevelTabs}
        activeFirstLevelTab={state.activeFirstLevelTab}
        activeSecondLevelTab={state.activeSecondLevelTab}
        onFirstLevelTabSelect={setActiveFirstLevelTab}
        onSecondLevelTabSelect={setActiveSecondLevelTab}
        selectedDropdownOption={selectedDropdownOption}
        onDropdownSelect={handleDropdownSelect}
        onCloseTab={handleCloseTab}
      />
      <div className="flex-1 p-4">
        {DROPDOWN_CONTENT[selectedDropdownOption.id]}
      </div>
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
