"use client";
import React from 'react';
import { SecondLevelTabProps } from '@/types/tabs';

/**
 * SecondLevelTab Component
 * 
 * A component that renders a second-level tab in the browser tab bar.
 * These tabs are shown when a first-level tab is selected and provide sub-navigation options.
 * 
 * @component
 * @param {SecondLevelTabProps} props - Component props
 * @param {SecondLevelTab} props.tab - The tab data containing id, label, and parentId
 * @param {boolean} [props.isActive=false] - Whether the tab is currently active
 * @param {Function} [props.onSelect] - Callback function when the tab is selected
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <SecondLevelTab
 *   tab={{
 *     id: 'featured',
 *     label: 'Featured',
 *     parentId: 'products'
 *   }}
 *   isActive={true}
 *   onSelect={(tab) => console.log('Tab selected:', tab)}
 * />
 * 
 * // With custom styling
 * <SecondLevelTab
 *   tab={tab}
 *   isActive={isActive}
 *   onSelect={handleSelect}
 *   className="custom-tab"
 * />
 * ```
 * 
 * @remarks
 * - The component is used for sub-navigation under a first-level tab
 * - Each tab has a unique ID and a reference to its parent tab
 * - Active state is visually indicated through styling
 * - The component uses Tailwind CSS for styling
 * - The component is memoized for performance optimization
 * 
 * @see {@link SecondLevelTabProps} for more information about component props
 */
const SecondLevelTab: React.FC<SecondLevelTabProps> = ({
  tab,
  isActive = false,
  onSelect,
}) => {
  /**
   * Computed styles for the tab based on active state.
   */
  const tabStyles = {
    base: 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200',
    active: 'bg-gray-600 text-white',
    inactive: 'text-gray-300 hover:text-white hover:bg-gray-600/50',
  };

  return (
    <button
      className={`${tabStyles.base} ${isActive ? tabStyles.active : tabStyles.inactive}`}
      onClick={() => onSelect?.(tab)}
    >
      {tab.label}
    </button>
  );
};

export default React.memo(SecondLevelTab); 