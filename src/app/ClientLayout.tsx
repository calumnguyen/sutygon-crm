'use client';
import React from 'react';
import Header from '@/components/layout/Header';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import type { FirstLevelTab } from '@/types/tabTypes';
import { usePathname } from 'next/navigation';

const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firstLevelTabs, addFirstLevelTab, activateTab } = useTabContext();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

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
        options: [], // Search tabs don't need dropdown options
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
      {!isLoginPage && <Header onSearch={addSearchTab} />}
      <main>{children}</main>
    </>
  );
};

export default ClientLayout;
