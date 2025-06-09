"use client";
import React from 'react';
import Header from '@/components/layout/Header';
import { useTabContext } from '@/context/TabContext';

const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useTabContext();

  const addSearchTab = (query: string) => {
    const searchTabId = `search-${query}`;
    // Prevent duplicate search tabs
    if (!state.firstLevelTabs.some(tab => tab.id === searchTabId)) {
      const newTab = {
        id: searchTabId,
        label: `Search: ${query}`,
        options: [],
      };
      dispatch({ type: 'SET_FIRST_LEVEL_TABS', payload: [...state.firstLevelTabs, newTab] });
      dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: newTab });
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