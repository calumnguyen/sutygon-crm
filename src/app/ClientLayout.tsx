'use client';
import React from 'react';
import Header from '@/components/layout/Header';
import { useTabContext } from '@/context/TabContext';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import { createTabId } from '@/types/tabTypes';
import type { FirstLevelTab } from '@/types/tabTypes';

const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firstLevelTabs, addFirstLevelTab, activateTab } = useTabContext();

  const addSearchTab = (query: string) => {
    console.log('addSearchTab called with query:', query);

    if (!query.trim()) {
      console.log('Empty query, returning');
      return;
    }

    const searchTabId = createTabId(`search-${query}`);
    console.log('Search tab ID:', searchTabId);

    // Prevent duplicate search tabs
    if (!firstLevelTabs.some((tab) => tab.id === searchTabId)) {
      console.log('Creating new search tab');
      const newTab: FirstLevelTab = {
        id: searchTabId,
        type: 'first',
        label: `Search: ${query}`,
        options: DEFAULT_TAB_OPTIONS,
        isDefault: false,
        isClosable: true,
      };
      console.log('New tab:', newTab);
      addFirstLevelTab(newTab);
    } else {
      console.log('Tab already exists, activating it');
      // If tab exists, just activate it
      activateTab(searchTabId);
    }
  };

  return (
    <>
      <Header onSearch={addSearchTab} />
      <main>{children}</main>
    </>
  );
};

export default ClientLayout;
