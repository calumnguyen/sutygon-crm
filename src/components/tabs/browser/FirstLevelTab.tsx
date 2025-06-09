"use client";
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { FirstLevelTabProps, TabOption } from '@/types/tabs';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import TabDropdown from '@/components/common/dropdowns/TabDropdown';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/solid';

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
const FirstLevelTab: React.FC<FirstLevelTabProps> = ({
  tab,
  isActive = false,
  onSelect,
  onClose,
  dropdownOption,
  onDropdownSelect,
  isDefaultTab = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  /**
   * Handles the selection of an option from the dropdown menu.
   * 
   * @param {TabOption} option - The selected option
   */
  const handleDropdownSelect = useCallback((option: TabOption) => {
    onDropdownSelect?.(option);
    setIsDropdownOpen(false);
  }, [onDropdownSelect]);

  /**
   * Toggles the dropdown menu visibility.
   */
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);

  /**
   * Closes the dropdown menu when clicking outside.
   * 
   * @param {MouseEvent} event - The click event
   */
  const closeDropdown = useCallback((event: MouseEvent) => {
    if (parentRef.current && !parentRef.current.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  }, []);

  /**
   * Handles the close action for the tab.
   * 
   * @param {React.MouseEvent} e - The click event
   */
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.(tab);
  }, [onClose, tab]);

  // Add click outside listener
  React.useEffect(() => {
    document.addEventListener('mousedown', closeDropdown);
    return () => {
      document.removeEventListener('mousedown', closeDropdown);
    };
  }, [closeDropdown]);

  /**
   * Computed styles for the tab based on active state.
   */
  const tabStyles = useMemo(() => ({
    base: 'relative px-6 py-2.5 text-sm font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-2 h-10',
    active: 'bg-gray-900 text-white shadow-md z-20',
    inactive: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white z-10',
  }), []);

  /**
   * Computed styles for the dropdown menu.
   */
  const dropdownStyles = useMemo(() => ({
    base: 'absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5',
    hidden: 'hidden',
    visible: 'block',
  }), []);

  return (
    <div ref={parentRef} className="relative">
      <button
        className={`${tabStyles.base} ${isActive ? tabStyles.active : tabStyles.inactive}`}
        onClick={() => onSelect?.(tab)}
      >
        {tab.label}
        {tab.options && tab.options.length > 0 && (
          <span
            className="ml-2"
            onClick={e => {
              e.stopPropagation();
              toggleDropdown();
            }}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </span>
        )}
        {!isDefaultTab && onClose && (
          <div
            onClick={handleClose}
            className="ml-2 p-1 rounded-full hover:bg-gray-600 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </div>
        )}
      </button>
      {tab.options && tab.options.length > 0 && (
        <div className={`${dropdownStyles.base} ${isDropdownOpen ? dropdownStyles.visible : dropdownStyles.hidden}`}>
          <TabDropdown
            options={tab.options}
            onSelect={handleDropdownSelect}
            parentRef={parentRef as React.RefObject<HTMLDivElement>}
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(FirstLevelTab); 