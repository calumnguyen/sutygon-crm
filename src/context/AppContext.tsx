'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

// Types
interface User {
  username: string;
  isAuthenticated: boolean;
}

interface SearchFilter {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

interface SearchState {
  query: string;
  history: string[];
  filters: SearchFilter;
}

interface Tab {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  options?: TabOption[];
}

interface TabOption {
  id: string;
  label: string;
  value: string;
}

interface UIState {
  isAnimationsEnabled: boolean;
  layout: 'default' | 'compact';
}

interface AppContextType {
  // User state
  user: User;
  setUser: (user: User) => void;
  logout: () => void;

  // Search state
  searchState: SearchState;
  updateSearch: (query: string) => void;
  clearSearchHistory: () => void;
  updateSearchFilters: (filters: SearchFilter) => void;

  // UI state
  uiState: UIState;
  toggleAnimations: () => void;
  setLayout: (layout: 'default' | 'compact') => void;

  tabs: Tab[];
  activeTab: Tab | null;
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tab: Tab) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User state
  const [user, setUser] = useState<User>({
    username: 'CN',
    isAuthenticated: false,
  });

  const logout = useCallback(() => {
    setUser({ username: '', isAuthenticated: false });
  }, []);

  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    history: [],
    filters: {},
  });

  const updateSearch = useCallback((query: string) => {
    setSearchState((prev) => ({
      ...prev,
      query,
      history: [query, ...prev.history.slice(0, 9)], // Keep last 10 searches
    }));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchState((prev) => ({ ...prev, history: [] }));
  }, []);

  const updateSearchFilters = useCallback((filters: SearchFilter) => {
    setSearchState((prev) => ({ ...prev, filters }));
  }, []);

  // UI state
  const [uiState, setUIState] = useState<UIState>({
    isAnimationsEnabled: true,
    layout: 'default',
  });

  const toggleAnimations = useCallback(() => {
    setUIState((prev) => ({ ...prev, isAnimationsEnabled: !prev.isAnimationsEnabled }));
  }, []);

  const setLayout = useCallback((layout: 'default' | 'compact') => {
    setUIState((prev) => ({ ...prev, layout }));
  }, []);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => [...prevTabs, tab]);
  }, []);

  const removeTab = useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
      if (activeTab?.id === tabId) {
        setActiveTab(null);
      }
    },
    [activeTab]
  );

  const handleSetActiveTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const value: AppContextType = {
    // User state
    user,
    setUser,
    logout,

    // Search state
    searchState,
    updateSearch,
    clearSearchHistory,
    updateSearchFilters,

    // UI state
    uiState,
    toggleAnimations,
    setLayout,

    tabs,
    activeTab,
    addTab,
    removeTab,
    setActiveTab: handleSetActiveTab,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
