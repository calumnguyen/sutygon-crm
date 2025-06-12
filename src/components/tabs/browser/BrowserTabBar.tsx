'use client';
import React from 'react';
import type { FirstLevelTab, SecondLevelTab, TabOption } from '@/types/tabTypes';
import { useTabContext } from '@/context/TabContext';
import FirstLevelTabComponent from './FirstLevelTab';
import SecondLevelTabComponent from './SecondLevelTab';

/**
 * BrowserTabBar Component
 *
 * A two-level tab navigation system that provides a hierarchical navigation structure.
 * The first level contains main navigation items with dropdown menus, while the second level
 * shows related sub-navigation items.
 *
 * @component
 * @param {BrowserTabBarProps} props - Component props
 * @param {FirstLevelTab[]} [props.firstLevelTabs=[]] - Array of first-level tabs
 * @param {SecondLevelTab[]} [props.secondLevelTabs=[]] - Array of second-level tabs
 * @param {FirstLevelTab} [props.activeFirstLevelTab] - Currently active first-level tab
 * @param {SecondLevelTab} [props.activeSecondLevelTab] - Currently active second-level tab
 * @param {Function} [props.onFirstLevelTabSelect] - Callback when a first-level tab is selected
 * @param {Function} [props.onSecondLevelTabSelect] - Callback when a second-level tab is selected
 * @param {TabOption} [props.selectedDropdownOption] - Selected dropdown option for the first tab
 * @param {Function} [props.onDropdownSelect] - Callback when a dropdown option is selected
 * @param {Function} [props.onCloseTab] - Callback when a tab is closed
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BrowserTabBar
 *   firstLevelTabs={[
 *     { id: 'home', label: 'Home', options: DEFAULT_TAB_OPTIONS },
 *     { id: 'products', label: 'Products', options: DEFAULT_TAB_OPTIONS }
 *   ]}
 *   secondLevelTabs={[
 *     { id: 'featured', label: 'Featured', parentId: 'products' },
 *     { id: 'new', label: 'New', parentId: 'products' }
 *   ]}
 *   activeFirstLevelTab={firstLevelTabs[0]}
 *   activeSecondLevelTab={secondLevelTabs[0]}
 *   onFirstLevelTabSelect={(tab) => console.log('First level tab selected:', tab)}
 *   onSecondLevelTabSelect={(tab) => console.log('Second level tab selected:', tab)}
 *   selectedDropdownOption={DEFAULT_TAB_OPTIONS[0]}
 *   onDropdownSelect={(option) => console.log('Dropdown option selected:', option)}
 *   onCloseTab={(tab) => console.log('Tab closed:', tab)}
 * />
 *
 * // With default home tab
 * <BrowserTabBar
 *   firstLevelTabs={[]}
 *   secondLevelTabs={[]}
 *   activeFirstLevelTab={{
 *     id: 'home',
 *     label: 'Home',
 *     options: DEFAULT_TAB_OPTIONS
 *   }}
 *   selectedDropdownOption={DEFAULT_TAB_OPTIONS[0]}
 *   onDropdownSelect={(option) => console.log('Dropdown option selected:', option)}
 *   onCloseTab={(tab) => console.log('Tab closed:', tab)}
 * />
 * ```
 *
 * @remarks
 * - The component provides a two-level navigation structure
 * - First-level tabs can have dropdown menus with additional options
 * - Second-level tabs are shown when a first-level tab is selected
 * - The component handles undefined tabs gracefully
 * - A default home tab is shown if no first-level tabs are provided
 * - The component uses Tailwind CSS for styling
 *
 * @see {@link FirstLevelTabComponent} for more information about first-level tabs
 * @see {@link SecondLevelTabComponent} for more information about second-level tabs
 * @see {@link DEFAULT_TAB_OPTIONS} for default dropdown options
 */
interface BrowserTabBarProps {
  selectedDropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
}

export default function BrowserTabBar({
  selectedDropdownOption,
  onDropdownSelect,
}: BrowserTabBarProps) {
  const {
    firstLevelTabs,
    secondLevelTabs,
    activeFirstLevelTab,
    activeSecondLevelTab,
    activateTab,
    removeTab,
    updateFirstLevelTabOption,
  } = useTabContext();

  const handleFirstLevelTabSelect = (tab: FirstLevelTab) => {
    activateTab(tab.id);
  };

  const handleDropdownSelect = (tabId: string, option: TabOption) => {
    updateFirstLevelTabOption(tabId, option);
    activateTab(tabId);
  };

  const handleSecondLevelTabSelect = (tab: SecondLevelTab) => {
    activateTab(tab.id);
  };

  const handleCloseTab = (tab: FirstLevelTab) => {
    if (!tab.isDefault) {
      removeTab(tab.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center space-x-2 p-2 border-b border-gray-800/100">
        {firstLevelTabs.map((tab) => (
          <FirstLevelTabComponent
            key={tab.id}
            tab={tab}
            isActive={activeFirstLevelTab?.id === tab.id}
            onSelect={handleFirstLevelTabSelect}
            onClose={handleCloseTab}
            onDropdownSelect={(option) => handleDropdownSelect(tab.id, option)}
            isDefaultTab={tab.isDefault}
          />
        ))}
      </div>
      {secondLevelTabs.length > 0 && (
        <div className="flex items-center space-x-2 p-2 border-b border-gray-800/20">
          {secondLevelTabs.map((tab) => (
            <SecondLevelTabComponent
              key={tab.id}
              tab={tab}
              isActive={activeSecondLevelTab?.id === tab.id}
              onSelect={handleSecondLevelTabSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
