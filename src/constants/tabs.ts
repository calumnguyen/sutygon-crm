import type { TabOption } from '@/types/tabTypes';
import { createTabId } from '@/types/tabTypes';

// Define role-based tab option
interface RoleBasedTabOption extends TabOption {
  requiredRole?: 'admin' | 'user';
}

/**
 * All available tab options with role requirements
 */
export const ALL_TAB_OPTIONS: RoleBasedTabOption[] = [
  { id: createTabId('home'), label: 'Trang Chủ' },
  { id: createTabId('orders'), label: 'Đơn Hàng' },
  { id: createTabId('customers'), label: 'Khách Hàng' },
  { id: createTabId('inventory'), label: 'Kho' },
  { id: createTabId('users'), label: 'Nhân Viên', requiredRole: 'admin' },
  { id: createTabId('store-settings'), label: 'Cài Đặt Cửa Hàng', requiredRole: 'admin' },
  { id: createTabId('reports'), label: 'Báo Cáo', requiredRole: 'admin' },
];

/**
 * Get tab options filtered by user role
 */
export function getTabOptionsForRole(userRole: string | null): TabOption[] {
  if (!userRole) return [];

  return ALL_TAB_OPTIONS.filter((option) => {
    if (!option.requiredRole) return true; // No role requirement = accessible to all
    return option.requiredRole === userRole.toLowerCase();
  });
}

/**
 * Default options for the first-level tab dropdown.
 * These options are used when no custom options are provided.
 *
 * @constant
 * @type {TabOption[]}
 */
export const DEFAULT_TAB_OPTIONS: TabOption[] = [
  { id: createTabId('home'), label: 'Trang Chủ' },
  { id: createTabId('orders'), label: 'Đơn Hàng' },
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
  home: 'home',
  users: 'users',
  customers: 'customers',
  orders: 'orders',
  inventory: 'inventory',
  'store-password': 'store-password',
  reports: 'reports',
};
