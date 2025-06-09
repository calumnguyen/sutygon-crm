import type { ReactNode } from 'react';

/**
 * Represents a tab option in the dropdown menu.
 * 
 * @interface TabOption
 * @property {string} id - Unique identifier for the option
 * @property {string} label - Display label for the option
 * @property {ReactNode} [content] - Optional content to display when option is selected
 * 
 * @example
 * ```tsx
 * const option: TabOption = {
 *   id: 'dashboard',
 *   label: 'Dashboard',
 *   content: <DashboardComponent />
 * };
 * ```
 */
export interface TabOption {
  id: string;
  label: string;
  content?: ReactNode;
}

/**
 * Represents a first-level tab in the browser tab bar.
 * 
 * @interface FirstLevelTab
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label for the tab
 * @property {TabOption[]} options - Array of options for the dropdown menu
 * @property {boolean} [isClosable=true] - Whether the tab can be closed
 * @property {boolean} [isDefault=false] - Whether this is the default tab
 * 
 * @example
 * ```tsx
 * const tab: FirstLevelTab = {
 *   id: 'home',
 *   label: 'Home',
 *   options: [
 *     { id: 'dashboard', label: 'Dashboard' },
 *     { id: 'settings', label: 'Settings' }
 *   ],
 *   isClosable: false,
 *   isDefault: true
 * };
 * ```
 */
export interface FirstLevelTab {
  id: string;
  label: string;
  options: TabOption[];
  isClosable?: boolean;
  isDefault?: boolean;
}

/**
 * Represents a second-level tab in the browser tab bar.
 * 
 * @interface SecondLevelTab
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label for the tab
 * @property {string} parentId - ID of the parent first-level tab
 * @property {boolean} [isClosable=true] - Whether the tab can be closed
 * 
 * @example
 * ```tsx
 * const tab: SecondLevelTab = {
 *   id: 'orders-list',
 *   label: 'Orders List',
 *   parentId: 'orders',
 *   isClosable: true
 * };
 * ```
 */
export interface SecondLevelTab {
  id: string;
  label: string;
  parentId: string;
  isClosable?: boolean;
}

/**
 * Represents the state of the tab system.
 * 
 * @interface TabState
 * @property {FirstLevelTab[]} firstLevelTabs - Array of first-level tabs
 * @property {SecondLevelTab[]} secondLevelTabs - Array of second-level tabs
 * @property {FirstLevelTab} [activeFirstLevelTab] - Currently active first-level tab
 * @property {SecondLevelTab} [activeSecondLevelTab] - Currently active second-level tab
 * @property {boolean} isLoading - Loading state indicator
 * @property {Error | null} error - Error state if any
 * 
 * @example
 * ```tsx
 * const state: TabState = {
 *   firstLevelTabs: [homeTab, ordersTab],
 *   secondLevelTabs: [ordersListTab, ordersCreateTab],
 *   activeFirstLevelTab: homeTab,
 *   activeSecondLevelTab: ordersListTab,
 *   isLoading: false,
 *   error: null
 * };
 * ```
 */
export interface TabState {
  firstLevelTabs: FirstLevelTab[];
  secondLevelTabs: SecondLevelTab[];
  activeFirstLevelTab?: FirstLevelTab;
  activeSecondLevelTab?: SecondLevelTab;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Represents an action that can be dispatched to update the tab state.
 * 
 * @type {TabAction}
 * @property {string} type - The type of action
 * @property {any} payload - The data associated with the action
 * 
 * @example
 * ```tsx
 * const action: TabAction = {
 *   type: 'SET_FIRST_LEVEL_TABS',
 *   payload: [homeTab, ordersTab]
 * };
 * ```
 */
export type TabAction =
  | { type: 'SET_FIRST_LEVEL_TABS'; payload: FirstLevelTab[] }
  | { type: 'SET_SECOND_LEVEL_TABS'; payload: SecondLevelTab[] }
  | { type: 'SET_ACTIVE_FIRST_LEVEL_TAB'; payload: FirstLevelTab }
  | { type: 'SET_ACTIVE_SECOND_LEVEL_TAB'; payload: SecondLevelTab }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'ADD_FIRST_LEVEL_TAB'; payload: FirstLevelTab }
  | { type: 'REMOVE_FIRST_LEVEL_TAB'; payload: string }
  | { type: 'ADD_SECOND_LEVEL_TAB'; payload: SecondLevelTab }
  | { type: 'REMOVE_SECOND_LEVEL_TAB'; payload: string };

/**
 * Props for the TabDropdown component.
 * 
 * @interface TabDropdownProps
 * @property {boolean} isOpen - Whether the dropdown is currently open
 * @property {() => void} onClose - Callback function when dropdown should close
 * @property {(option: TabOption) => void} onSelect - Callback function when an option is selected
 * @property {TabOption[]} options - Array of options to display in the dropdown
 * @property {React.RefObject<HTMLDivElement>} [parentRef] - Reference to the parent element for click-outside detection
 * 
 * @example
 * ```tsx
 * const props: TabDropdownProps = {
 *   isOpen: true,
 *   onClose: () => setIsOpen(false),
 *   onSelect: (option) => handleSelect(option),
 *   options: [
 *     { id: 'home', label: 'Home' },
 *     { id: 'orders', label: 'Orders' }
 *   ],
 *   parentRef: dropdownRef
 * };
 * ```
 */
export interface TabDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: TabOption) => void;
  options: TabOption[];
  parentRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Props for the FirstLevelTab component.
 * 
 * @interface FirstLevelTabProps
 * @property {FirstLevelTab} tab - The tab data
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {(tab: FirstLevelTab) => void} onSelect - Callback function when a tab option is selected
 * @property {TabOption} [dropdownOption] - Optional dropdown option
 * @property {(option: TabOption) => void} [onDropdownSelect] - Callback function when a dropdown option is selected
 * @property {(tab: FirstLevelTab) => void} onClose - Callback function when the tab is closed
 * @property {boolean} isDefaultTab - Whether the tab is the default tab
 * 
 * @example
 * ```tsx
 * const props: FirstLevelTabProps = {
 *   tab: {
 *     id: 'home',
 *     label: 'Home',
 *     options: [
 *       { id: 'dashboard', label: 'Dashboard' }
 *     ]
 *   },
 *   isActive: true,
 *   onSelect: (tab) => handleTabSelect(tab),
 *   dropdownOption: homeTab.options[0],
 *   onDropdownSelect: (option) => handleDropdownSelect(option),
 *   onClose: (tab) => handleTabClose(tab),
 *   isDefaultTab: true
 * };
 * ```
 */
export interface FirstLevelTabProps {
  tab: FirstLevelTab;
  isActive?: boolean;
  onSelect?: (tab: FirstLevelTab) => void;
  onClose?: (tab: FirstLevelTab) => void;
  dropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
  isDefaultTab?: boolean;
}

/**
 * Props for the SecondLevelTab component.
 * 
 * @interface SecondLevelTabProps
 * @property {SecondLevelTab} tab - The tab data
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {(tab: SecondLevelTab) => void} onSelect - Callback function when the tab is selected
 * 
 * @example
 * ```tsx
 * const props: SecondLevelTabProps = {
 *   tab: {
 *     id: 'orders-list',
 *     label: 'Orders List',
 *     parentId: 'orders'
 *   },
 *   isActive: true,
 *   onSelect: (tab) => handleTabSelect(tab)
 * };
 * ```
 */
export interface SecondLevelTabProps {
  tab: SecondLevelTab;
  isActive?: boolean;
  onSelect?: (tab: SecondLevelTab) => void;
}

/**
 * Props for the BrowserTabBar component.
 * 
 * @interface BrowserTabBarProps
 * @property {FirstLevelTab[]} firstLevelTabs - Array of first-level tabs
 * @property {SecondLevelTab[]} secondLevelTabs - Array of second-level tabs
 * @property {FirstLevelTab} [activeFirstLevelTab] - Currently active first-level tab
 * @property {SecondLevelTab} [activeSecondLevelTab] - Currently active second-level tab
 * @property {(tab: FirstLevelTab) => void} onFirstLevelTabSelect - Callback function when a first-level tab is selected
 * @property {(tab: SecondLevelTab) => void} onSecondLevelTabSelect - Callback function when a second-level tab is selected
 * @property {TabOption} [selectedDropdownOption] - Currently selected dropdown option
 * @property {(option: TabOption) => void} [onDropdownSelect] - Callback function when a dropdown option is selected
 * @property {(tab: FirstLevelTab) => void} onCloseTab - Callback function when a first-level tab is closed
 * 
 * @example
 * ```tsx
 * const props: BrowserTabBarProps = {
 *   firstLevelTabs: [homeTab, ordersTab],
 *   secondLevelTabs: [ordersListTab, ordersCreateTab],
 *   activeFirstLevelTab: homeTab,
 *   activeSecondLevelTab: ordersListTab,
 *   onFirstLevelTabSelect: (tab) => handleFirstLevelSelect(tab),
 *   onSecondLevelTabSelect: (tab) => handleSecondLevelSelect(tab),
 *   selectedDropdownOption: homeTab.options[0],
 *   onDropdownSelect: (option) => handleDropdownSelect(option),
 *   onCloseTab: (tab) => handleTabClose(tab)
 * };
 * ```
 */
export interface BrowserTabBarProps {
  firstLevelTabs?: FirstLevelTab[];
  secondLevelTabs?: SecondLevelTab[];
  activeFirstLevelTab?: FirstLevelTab;
  activeSecondLevelTab?: SecondLevelTab;
  onFirstLevelTabSelect?: (tab: FirstLevelTab) => void;
  onSecondLevelTabSelect?: (tab: SecondLevelTab) => void;
  selectedDropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
  onCloseTab?: (tab: FirstLevelTab) => void;
} 