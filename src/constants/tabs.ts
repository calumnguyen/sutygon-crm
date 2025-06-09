import { TabOption } from '@/types/tabs';

/**
 * Default options for the first-level tab dropdown.
 * These options are used when no custom options are provided.
 * 
 * @constant
 * @type {TabOption[]}
 */
export const DEFAULT_TAB_OPTIONS: TabOption[] = [
  { id: 'home', label: 'Trang Chủ' },
  { id: 'customers', label: 'Khách Hàng' },
  { id: 'inventory', label: 'Kho' },
  { id: 'users', label: 'Nhân Viên' },
];

/**
 * Default second level tab options
 */
export const DEFAULT_SECOND_LEVEL_OPTIONS: Record<string, TabOption[]> = {
  orders: [
    {
      id: 'all',
      label: 'Tất Cả',
    },
    {
      id: 'pending',
      label: 'Chờ Xử Lý',
    },
    {
      id: 'processing',
      label: 'Đang Xử Lý',
    },
    {
      id: 'completed',
      label: 'Hoàn Thành',
    },
  ],
  inventory: [
    {
      id: 'all',
      label: 'Tất Cả',
    },
    {
      id: 'low-stock',
      label: 'Sắp Hết Hàng',
    },
    {
      id: 'out-of-stock',
      label: 'Hết Hàng',
    },
  ],
  customers: [
    {
      id: 'all',
      label: 'Tất Cả',
    },
    {
      id: 'new',
      label: 'Khách Hàng Mới',
    },
    {
      id: 'vip',
      label: 'Khách Hàng VIP',
    },
  ],
  users: [
    {
      id: 'all',
      label: 'Tất Cả',
    },
    {
      id: 'active',
      label: 'Đang Hoạt Động',
    },
    {
      id: 'inactive',
      label: 'Không Hoạt Động',
    },
  ],
};

/**
 * Tab content mapping
 */
export const TAB_CONTENT_MAPPING: Record<string, string> = {
  home: 'HomeContent',
  orders: 'OrdersContent',
  inventory: 'InventoryContent',
  customers: 'CustomersContent',
  users: 'UsersContent',
  reports: 'ReportsContent',
}; 