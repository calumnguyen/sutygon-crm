export const TRANSLATIONS = {
  users: {
    title: 'Quản Lý Người Dùng',
    addUser: 'Thêm Tài Khoản',
    loading: 'Đang tải danh sách người dùng...',
    error: 'Không thể tải danh sách người dùng',
    table: {
      name: 'Tên',
      email: 'Email',
      role: 'Vai Trò',
      status: 'Trạng Thái',
      actions: 'Thao Tác',
      edit: 'Sửa',
      delete: 'Xóa',
      createdAt: 'Ngày Tạo',
    },
    roles: {
      admin: 'Quản Trị Viên',
      user: 'Người Dùng',
    },
    status: {
      active: 'Hoạt Động',
      inactive: 'Không Hoạt Động',
    },
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS;
