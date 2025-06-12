import type {
  TabAction,
  FirstLevelTab,
  SecondLevelTab,
  TabError,
  TabId,
  TabOption,
} from '@/types/tabTypes';
import { createTabId } from '@/types/tabTypes';

// Action Types
export const TAB_ACTIONS = {
  SET_FIRST_LEVEL_TABS: 'SET_FIRST_LEVEL_TABS',
  SET_SECOND_LEVEL_TABS: 'SET_SECOND_LEVEL_TABS',
  SET_ACTIVE_FIRST_LEVEL_TAB: 'SET_ACTIVE_FIRST_LEVEL_TAB',
  SET_ACTIVE_SECOND_LEVEL_TAB: 'SET_ACTIVE_SECOND_LEVEL_TAB',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  ADD_FIRST_LEVEL_TAB: 'ADD_FIRST_LEVEL_TAB',
  REMOVE_FIRST_LEVEL_TAB: 'REMOVE_FIRST_LEVEL_TAB',
  ADD_SECOND_LEVEL_TAB: 'ADD_SECOND_LEVEL_TAB',
  REMOVE_SECOND_LEVEL_TAB: 'REMOVE_SECOND_LEVEL_TAB',
  UPDATE_FIRST_LEVEL_TAB_OPTION: 'UPDATE_FIRST_LEVEL_TAB_OPTION',
} as const;

// Action Creators
export const setFirstLevelTabs = (tabs: FirstLevelTab[]): TabAction => ({
  type: TAB_ACTIONS.SET_FIRST_LEVEL_TABS,
  payload: tabs,
});

export const setSecondLevelTabs = (tabs: SecondLevelTab[]): TabAction => ({
  type: TAB_ACTIONS.SET_SECOND_LEVEL_TABS,
  payload: tabs,
});

export const setActiveFirstLevelTab = (tab: FirstLevelTab): TabAction => ({
  type: TAB_ACTIONS.SET_ACTIVE_FIRST_LEVEL_TAB,
  payload: tab,
});

export const setActiveSecondLevelTab = (tab: SecondLevelTab): TabAction => ({
  type: TAB_ACTIONS.SET_ACTIVE_SECOND_LEVEL_TAB,
  payload: tab,
});

export const setLoading = (isLoading: boolean): TabAction => ({
  type: TAB_ACTIONS.SET_LOADING,
  payload: isLoading,
});

export const setError = (error: TabError | null): TabAction => ({
  type: TAB_ACTIONS.SET_ERROR,
  payload: error,
});

export const addFirstLevelTab = (tab: FirstLevelTab): TabAction => ({
  type: TAB_ACTIONS.ADD_FIRST_LEVEL_TAB,
  payload: tab,
});

export const removeFirstLevelTab = (tabId: string): TabAction => ({
  type: TAB_ACTIONS.REMOVE_FIRST_LEVEL_TAB,
  payload: createTabId(tabId),
});

export const addSecondLevelTab = (tab: SecondLevelTab): TabAction => ({
  type: TAB_ACTIONS.ADD_SECOND_LEVEL_TAB,
  payload: tab,
});

export const removeSecondLevelTab = (tabId: string): TabAction => ({
  type: TAB_ACTIONS.REMOVE_SECOND_LEVEL_TAB,
  payload: createTabId(tabId),
});

export const updateFirstLevelTabOption = (id: TabId, selectedOption: TabOption): TabAction => ({
  type: TAB_ACTIONS.UPDATE_FIRST_LEVEL_TAB_OPTION,
  payload: { id, selectedOption },
});
