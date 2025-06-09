/**
 * Represents a tab in the browser-style tab system.
 * @interface Tab
 * @property {string} id - Unique identifier for the tab
 * @property {string} title - Display title of the tab
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {1 | 2} level - The hierarchy level of the tab (1 for top-level, 2 for sub-level)
 */
export interface Tab {
  id: string;
  title: string;
  isActive: boolean;
  level: 1 | 2;
}

/**
 * Represents an option in a dropdown menu.
 * @interface TabOption
 * @property {string} id - Unique identifier for the option
 * @property {string} label - Display text for the option
 */
export interface TabOption {
  id: string;
  label: string;
}

/**
 * Props for the TabDropdown component.
 * @interface TabDropdownProps
 * @property {boolean} isOpen - Whether the dropdown is currently open
 * @property {() => void} onClose - Callback function when dropdown should close
 * @property {(option: string) => void} onSelect - Callback function when an option is selected
 * @property {TabOption[]} options - Array of options to display in the dropdown
 * @property {React.RefObject<HTMLDivElement | null>} [parentRef] - Reference to the parent element for click-outside detection
 */
export interface TabDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: string) => void;
  options: TabOption[];
  parentRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Props for the FirstLevelTab component.
 * @interface FirstLevelTabProps
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {(tabId: string) => void} onSelect - Callback function when a tab option is selected
 */
export interface FirstLevelTabProps {
  isActive: boolean;
  onSelect: (tabId: string) => void;
}

/**
 * Props for the Level1Tab component.
 * @interface Level1TabProps
 * @property {string} id - Unique identifier for the tab
 * @property {string} title - Display title of the tab
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {(tabId: string) => void} onClick - Callback function when the tab is clicked
 */
export interface Level1TabProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: (tabId: string) => void;
}

/**
 * Props for the ClosableTab component.
 * @interface ClosableTabProps
 * @property {string} id - Unique identifier for the tab
 * @property {string} title - Display title of the tab
 * @property {boolean} isActive - Whether the tab is currently active
 * @property {(tabId: string) => void} onClick - Callback function when the tab is clicked
 * @property {(tabId: string) => void} onClose - Callback function when the close button is clicked
 */
export interface ClosableTabProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: (tabId: string) => void;
  onClose: (tabId: string) => void;
} 