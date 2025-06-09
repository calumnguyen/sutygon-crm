import type { TabOption } from '@/types/tabs';

/**
 * Constants representing the different levels in the tab hierarchy.
 * Used to distinguish between top-level and sub-level tabs.
 * @constant
 */
export const TAB_LEVELS = {
  /** Top-level tabs (main navigation) */
  LEVEL_1: 1,
  /** Sub-level tabs (secondary navigation) */
  LEVEL_2: 2,
} as const;

/**
 * CSS class names for different tab states and components.
 * These classes are used for styling the tab system components.
 * @constant
 */
export const TAB_STYLES = {
  /** Styles for an active tab */
  ACTIVE: 'bg-gray-700/50 border-t border-x border-gray-600',
  /** Styles for an inactive tab */
  INACTIVE: 'bg-gray-800/30 hover:bg-gray-700/30',
  /** Styles for the dropdown menu */
  DROPDOWN: 'absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700 z-50',
} as const; 