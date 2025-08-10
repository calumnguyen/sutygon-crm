export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  name: string;
  role: UserRole;
  status: UserStatus;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeKey: string;
}
