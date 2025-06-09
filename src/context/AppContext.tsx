"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

// Types
interface User {
  username: string;
  isAuthenticated: boolean;
}

interface SearchState {
  query: string;
  history: string[];
  filters: Record<string, any>;
}

interface UIState {
  theme: 'light' | 'dark';
  animations: boolean;
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
  updateSearchFilters: (filters: Record<string, any>) => void;

  // UI state
  uiState: UIState;
  toggleTheme: () => void;
  toggleAnimations: () => void;
  setLayout: (layout: 'default' | 'compact') => void;
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
    setSearchState(prev => ({
      ...prev,
      query,
      history: [query, ...prev.history.slice(0, 9)], // Keep last 10 searches
    }));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchState(prev => ({ ...prev, history: [] }));
  }, []);

  const updateSearchFilters = useCallback((filters: Record<string, any>) => {
    setSearchState(prev => ({ ...prev, filters }));
  }, []);

  // UI state
  const [uiState, setUIState] = useState<UIState>({
    theme: 'dark',
    animations: true,
    layout: 'default',
  });

  const toggleTheme = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, []);

  const toggleAnimations = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      animations: !prev.animations,
    }));
  }, []);

  const setLayout = useCallback((layout: 'default' | 'compact') => {
    setUIState(prev => ({ ...prev, layout }));
  }, []);

  const value = {
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
    toggleTheme,
    toggleAnimations,
    setLayout,
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