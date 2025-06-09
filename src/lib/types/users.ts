export type UserRole = 'Admin' | 'Non-Admin';
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTableProps {
  users: User[];
  loading: boolean;
  error: string | null;
}

export interface UserTableState {
  sortField: keyof User;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  searchTerm: string;
}
