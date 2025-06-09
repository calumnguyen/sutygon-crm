'use client';
import React, { useEffect, useRef } from 'react';
import type { TabDropdownProps, TabOption } from '@/types/tabTypes';

/**
 * TabDropdown Component
 *
 * A reusable dropdown menu component for tab navigation.
 * It displays a list of options and handles option selection.
 *
 * @component
 * @param {TabDropdownProps} props - Component props
 * @param {TabOption[]} props.options - List of options to display in the dropdown
 * @param {Function} props.onSelect - Callback function when an option is selected
 * @param {React.RefObject<HTMLDivElement | null>} props.parentRef - Reference to the parent element for click-outside detection
 * @param {boolean} props.isOpen - Whether the dropdown is currently open
 * @param {Function} props.onClose - Callback function to close the dropdown
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TabDropdown
 *   options={[
 *     { id: 'option1', label: 'Option 1' },
 *     { id: 'option2', label: 'Option 2' }
 *   ]}
 *   onSelect={(option) => console.log('Selected:', option)}
 *   parentRef={parentRef}
 *   isOpen={isDropdownOpen}
 *   onClose={() => setIsDropdownOpen(false)}
 * />
 *
 * // With custom styling
 * <TabDropdown
 *   options={options}
 *   onSelect={handleSelect}
 *   parentRef={parentRef}
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   className="custom-dropdown"
 * />
 * ```
 *
 * @remarks
 * - The dropdown is positioned absolutely relative to its parent
 * - Click-outside detection is implemented using the parentRef
 * - Options are rendered as a list of clickable items
 * - Each option has a unique ID and display label
 * - The dropdown can be styled using Tailwind CSS classes
 *
 * @see {@link TabOption} for more information about option structure
 * @see {@link TabDropdownProps} for more information about component props
 */
const TabDropdown: React.FC<TabDropdownProps> = ({
  options,
  onSelect,
  parentRef,
  isOpen,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        parentRef?.current &&
        !parentRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, parentRef]);

  /**
   * Handles the selection of an option.
   *
   * @param {TabOption} option - The selected option
   */
  const handleSelect = (option: TabOption) => {
    onSelect(option);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700 z-50"
    >
      <div className="py-1">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700/50 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabDropdown;
