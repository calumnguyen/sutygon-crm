'use client';
import React, { useState, useRef, useEffect } from 'react';
import type { FirstLevelTab, TabOption } from '@/types/tabTypes';
import TabDropdown from '@/components/common/dropdowns/TabDropdown';

interface FirstLevelTabProps {
  tab: FirstLevelTab;
  isActive: boolean;
  onSelect: (tab: FirstLevelTab) => void;
  onClose: (tab: FirstLevelTab) => void;
  dropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
  isDefaultTab?: boolean;
}

/**
 * FirstLevelTab Component
 *
 * A component that renders a first-level tab in the browser tab bar.
 * It includes a dropdown menu for selecting options and handles active state styling.
 *
 * @component
 * @param {FirstLevelTabProps} props - Component props
 * @param {FirstLevelTab} props.tab - The tab data containing id, label, and options
 * @param {boolean} [props.isActive=false] - Whether the tab is currently active
 * @param {Function} [props.onSelect] - Callback function when the tab is selected
 * @param {Function} [props.onClose] - Callback function when the tab is closed
 * @param {TabOption} [props.dropdownOption] - The default option for the dropdown
 * @param {Function} [props.onDropdownSelect] - Callback function when an option is selected from the dropdown
 * @param {boolean} [props.isDefaultTab=false] - Whether the tab is a default tab
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FirstLevelTab
 *   tab={{
 *     id: 'home',
 *     label: 'Home',
 *     options: DEFAULT_TAB_OPTIONS
 *   }}
 *   isActive={true}
 *   onSelect={(tab) => console.log('Tab selected:', tab)}
 * />
 *
 * // With custom options
 * <FirstLevelTab
 *   tab={{
 *     id: 'custom',
 *     label: 'Custom',
 *     options: [
 *       { id: 'option1', label: 'Option 1' },
 *       { id: 'option2', label: 'Option 2' }
 *     ]
 *   }}
 * />
 * ```
 *
 * @remarks
 * - The component uses a dropdown menu for additional options
 * - Active state is visually indicated through styling
 * - Click-outside detection is implemented for the dropdown
 * - Smooth transitions are applied for state changes
 * - The component is memoized for performance optimization
 *
 * @see {@link TabDropdown} for more information about the dropdown component
 * @see {@link DEFAULT_TAB_OPTIONS} for default dropdown options
 */
export default function FirstLevelTabComponent({
  tab,
  isActive,
  onSelect,
  onClose,
  dropdownOption,
  onDropdownSelect,
  isDefaultTab = false,
}: FirstLevelTabProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTabClick = () => {
    onSelect(tab);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab);
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOptionSelect = (option: TabOption) => {
    if (onDropdownSelect) {
      onDropdownSelect(option);
    }
    setIsDropdownOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative flex items-center px-4 py-2 rounded-t-lg cursor-pointer ${
        isActive ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      onClick={handleTabClick}
    >
      <div className="flex items-center space-x-2">
        <span>{dropdownOption?.label || tab.label}</span>
        {tab.options && tab.options.length > 0 && (
          <button onClick={handleDropdownToggle} className="p-1 hover:bg-gray-600 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>
      {!isDefaultTab && (
        <button onClick={handleCloseClick} className="ml-2 p-1 hover:bg-gray-600 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      {isDropdownOpen && tab.options && dropdownRef.current && (
        <TabDropdown
          isOpen={isDropdownOpen}
          onClose={() => setIsDropdownOpen(false)}
          onSelect={handleOptionSelect}
          options={tab.options}
          parentRef={dropdownRef}
        />
      )}
    </div>
  );
}
