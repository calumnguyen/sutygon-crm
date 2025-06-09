'use client';
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useLogger } from '@/hooks/useLogger';
import type { TabState, TabId, FirstLevelTab, SecondLevelTab, TabAction } from '@/types/tabTypes';
import {
  setActiveFirstLevelTab,
  setActiveSecondLevelTab,
  addFirstLevelTab,
  removeFirstLevelTab,
  addSecondLevelTab,
  removeSecondLevelTab,
} from './tabActions';

const initialState: TabState = {
  firstLevelTabs: [],
  secondLevelTabs: [],
  searchTabs: [],
  activeFirstLevelTab: undefined,
  activeSecondLevelTab: undefined,
  activeSearchTab: undefined,
  isLoading: false,
  error: null,
  relationships: {},
};

function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'SET_FIRST_LEVEL_TABS':
      return { ...state, firstLevelTabs: action.payload };
    case 'SET_SECOND_LEVEL_TABS':
      return { ...state, secondLevelTabs: action.payload };
    case 'SET_ACTIVE_FIRST_LEVEL_TAB':
      return { ...state, activeFirstLevelTab: action.payload };
    case 'SET_ACTIVE_SECOND_LEVEL_TAB':
      return { ...state, activeSecondLevelTab: action.payload };
    case 'ADD_FIRST_LEVEL_TAB': {
      // Check if tab already exists
      const existingTabIndex = state.firstLevelTabs.findIndex(
        (tab) => tab.id === action.payload.id
      );
      if (existingTabIndex !== -1) {
        // Update existing tab
        const updatedTabs = [...state.firstLevelTabs];
        updatedTabs[existingTabIndex] = action.payload;
        return {
          ...state,
          firstLevelTabs: updatedTabs,
          activeFirstLevelTab: action.payload,
        };
      }
      // Add new tab
      return {
        ...state,
        firstLevelTabs: [...state.firstLevelTabs, action.payload],
        activeFirstLevelTab: action.payload,
      };
    }
    case 'ADD_SECOND_LEVEL_TAB': {
      // Check if tab already exists
      const existingTabIndex = state.secondLevelTabs.findIndex(
        (tab) => tab.id === action.payload.id
      );
      if (existingTabIndex !== -1) {
        // Update existing tab
        const updatedTabs = [...state.secondLevelTabs];
        updatedTabs[existingTabIndex] = action.payload;
        return {
          ...state,
          secondLevelTabs: updatedTabs,
          activeSecondLevelTab: action.payload,
        };
      }
      // Add new tab
      return {
        ...state,
        secondLevelTabs: [...state.secondLevelTabs, action.payload],
        activeSecondLevelTab: action.payload,
      };
    }
    case 'REMOVE_FIRST_LEVEL_TAB':
      return {
        ...state,
        firstLevelTabs: state.firstLevelTabs.filter((tab) => tab.id !== action.payload),
        activeFirstLevelTab:
          state.activeFirstLevelTab?.id === action.payload ? undefined : state.activeFirstLevelTab,
      };
    case 'REMOVE_SECOND_LEVEL_TAB':
      return {
        ...state,
        secondLevelTabs: state.secondLevelTabs.filter((tab) => tab.id !== action.payload),
        activeSecondLevelTab:
          state.activeSecondLevelTab?.id === action.payload
            ? undefined
            : state.activeSecondLevelTab,
      };
    default:
      return state;
  }
}

interface TabContextType extends TabState {
  addFirstLevelTab: (tab: FirstLevelTab) => void;
  addSecondLevelTab: (tab: SecondLevelTab) => void;
  removeTab: (id: TabId) => void;
  activateTab: (id: TabId) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tabReducer, initialState);
  const logger = useLogger({ component: 'TabContext' });

  const handleAddFirstLevelTab = useCallback(
    (tab: FirstLevelTab) => {
      try {
        logger.info('Adding first level tab', { tabId: tab.id });
        dispatch(addFirstLevelTab(tab));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to add first level tab', { error: errorMessage, tabId: tab.id });
        throw error;
      }
    },
    [logger]
  );

  const handleAddSecondLevelTab = useCallback(
    (tab: SecondLevelTab) => {
      try {
        logger.info('Adding second level tab', { tabId: tab.id });
        dispatch(addSecondLevelTab(tab));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to add second level tab', { error: errorMessage, tabId: tab.id });
        throw error;
      }
    },
    [logger]
  );

  const handleRemoveTab = useCallback(
    (id: TabId) => {
      try {
        logger.info('Removing tab', { tabId: id });
        const firstLevelTab = state.firstLevelTabs.find((t) => t.id === id);
        const secondLevelTab = state.secondLevelTabs.find((t) => t.id === id);

        if (firstLevelTab) {
          dispatch(removeFirstLevelTab(id));
        } else if (secondLevelTab) {
          dispatch(removeSecondLevelTab(id));
        } else {
          logger.warn('Tab not found for removal', { tabId: id });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to remove tab', { error: errorMessage, tabId: id });
        throw error;
      }
    },
    [logger, state.firstLevelTabs, state.secondLevelTabs]
  );

  const handleActivateTab = useCallback(
    (id: TabId) => {
      try {
        logger.info('Activating tab', { tabId: id });
        const firstLevelTab = state.firstLevelTabs.find((t) => t.id === id);
        const secondLevelTab = state.secondLevelTabs.find((t) => t.id === id);

        if (firstLevelTab) {
          dispatch(setActiveFirstLevelTab(firstLevelTab));
        } else if (secondLevelTab) {
          dispatch(setActiveSecondLevelTab(secondLevelTab));
        } else {
          logger.warn('Tab not found for activation', { tabId: id });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to activate tab', { error: errorMessage, tabId: id });
        throw error;
      }
    },
    [logger, state.firstLevelTabs, state.secondLevelTabs]
  );

  const value = {
    ...state,
    addFirstLevelTab: handleAddFirstLevelTab,
    addSecondLevelTab: handleAddSecondLevelTab,
    removeTab: handleRemoveTab,
    activateTab: handleActivateTab,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
};
