import type { TabOption } from '@/types/tabTypes';
import { createTabId } from '@/types/tabTypes';

/**
 * Default options for the first-level tab dropdown.
 * These options are used when no custom options are provided.
 *
 * @constant
 * @type {TabOption[]}
 */
export const DEFAULT_TAB_OPTIONS: TabOption[] = [
  { id: createTabId('home'), label: 'Trang Chủ' },
  { id: createTabId('customers'), label: 'Khách Hàng' },
  { id: createTabId('inventory'), label: 'Kho' },
  { id: createTabId('users'), label: 'Nhân Viên' },
  { id: createTabId('store-password'), label: 'Key Cửa Hàng' },
];

/**
 * Default second level tab options
 */
export const DEFAULT_SECOND_LEVEL_OPTIONS: Record<string, TabOption[]> = {
  users: [
    {
      id: createTabId('all'),
      label: 'Tất Cả',
    },
    {
      id: createTabId('active'),
      label: 'Đang Hoạt Động',
    },
    {
      id: createTabId('inactive'),
      label: 'Không Hoạt Động',
    },
  ],
};

/**
 * Tab content mapping
 */
export const TAB_CONTENT_MAPPING: Record<string, string> = {
  users: 'users',
};
