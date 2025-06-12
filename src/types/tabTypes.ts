import type { ReactNode } from 'react';

// Branded types for better type safety
export type TabId = string & { readonly brand: unique symbol };

// Helper function to create TabId values
export function createTabId(id: string): TabId {
  return id as TabId;
}

export type TabType = 'first' | 'second' | 'search';

// Tab relationship types
export interface TabRelationship {
  parentId: TabId;
  childIds: TabId[];
}

// Error types
export interface TabError extends Error {
  code: 'TAB_NOT_FOUND' | 'INVALID_RELATIONSHIP' | 'DUPLICATE_TAB';
  details?: Record<string, unknown>;
}

// Base tab interface
export interface BaseTab {
  id: TabId;
  label: string;
  type: TabType;
  isClosable?: boolean;
  isDefault?: boolean;
}

// Tab option interface
export interface TabOption {
  id: TabId;
  label: string;
  content?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

// First level tab interface
export interface FirstLevelTab extends BaseTab {
  type: 'first';
  options: TabOption[];
  selectedOption?: TabOption;
}

// Second level tab interface
export interface SecondLevelTab extends BaseTab {
  type: 'second';
  parentId: TabId;
}

// Search tab interface
export interface SearchTab extends BaseTab {
  type: 'search';
  query: string;
  results?: unknown[];
}

// Tab state interface
export interface TabState {
  firstLevelTabs: FirstLevelTab[];
  secondLevelTabs: SecondLevelTab[];
  searchTabs: SearchTab[];
  activeFirstLevelTab?: FirstLevelTab;
  activeSecondLevelTab?: SecondLevelTab;
  activeSearchTab?: SearchTab;
  isLoading: boolean;
  error: TabError | null;
  relationships: Record<TabId, TabRelationship>;
}

// Tab action types
export type TabAction =
  | { type: 'SET_FIRST_LEVEL_TABS'; payload: FirstLevelTab[] }
  | { type: 'SET_SECOND_LEVEL_TABS'; payload: SecondLevelTab[] }
  | { type: 'SET_SEARCH_TABS'; payload: SearchTab[] }
  | { type: 'SET_ACTIVE_FIRST_LEVEL_TAB'; payload: FirstLevelTab }
  | { type: 'SET_ACTIVE_SECOND_LEVEL_TAB'; payload: SecondLevelTab }
  | { type: 'SET_ACTIVE_SEARCH_TAB'; payload: SearchTab }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: TabError | null }
  | { type: 'ADD_FIRST_LEVEL_TAB'; payload: FirstLevelTab }
  | { type: 'ADD_SECOND_LEVEL_TAB'; payload: SecondLevelTab }
  | { type: 'ADD_SEARCH_TAB'; payload: SearchTab }
  | { type: 'REMOVE_FIRST_LEVEL_TAB'; payload: TabId }
  | { type: 'REMOVE_SECOND_LEVEL_TAB'; payload: TabId }
  | { type: 'REMOVE_SEARCH_TAB'; payload: TabId }
  | { type: 'UPDATE_FIRST_LEVEL_TAB'; payload: { id: TabId; label: string } }
  | { type: 'UPDATE_TAB_RELATIONSHIP'; payload: TabRelationship }
  | { type: 'UPDATE_FIRST_LEVEL_TAB_OPTION'; payload: { id: TabId; selectedOption: TabOption } };

// Tab context interface
export interface TabContextType {
  state: TabState;
  dispatch: React.Dispatch<TabAction>;
  addTab: (tab: FirstLevelTab | SecondLevelTab | SearchTab) => void;
  removeTab: (id: TabId) => void;
  activateTab: (id: TabId) => void;
  updateTabLabel: (id: TabId, label: string) => void;
  setError: (error: TabError | null) => void;
}

// Tab component props
export interface TabProps<T extends BaseTab> {
  tab: T;
  isActive: boolean;
  onSelect: (tab: T) => void;
  onClose?: (tab: T) => void;
}

// Dropdown props
export interface TabDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: TabOption) => void;
  options: TabOption[];
  parentRef?: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  loading?: boolean;
  error?: TabError | null;
}
