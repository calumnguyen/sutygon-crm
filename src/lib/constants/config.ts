export const TABLE_CONFIG = {
  pageSize: 10,
  defaultSort: {
    field: 'createdAt',
    direction: 'desc' as const,
  },
} as const;

export const UI_CONFIG = {
  dateFormat: 'vi-VN',
  statusColors: {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-800',
    },
    inactive: {
      bg: 'bg-red-100',
      text: 'text-red-800',
    },
  },
  roleColors: {
    admin: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
    },
    employee: {
      bg: 'bg-green-100',
      text: 'text-green-800',
    },
  },
} as const;
