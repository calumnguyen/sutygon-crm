'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import { User, UserRole, UserStatus } from '@/types/user';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  mode: 'add' | 'edit';
  currentUser?: User | null;
  userToEdit?: User | null;
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  currentUser,
  userToEdit,
}: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    employeeKey: '',
    role: 'user' as UserRole,
    status: 'active' as UserStatus,
  });

  useEffect(() => {
    if (mode === 'edit' && userToEdit) {
      setFormData({
        name: userToEdit.name,
        employeeKey: userToEdit.employeeKey,
        role: userToEdit.role,
        status: userToEdit.status,
      });
    } else {
      setFormData({
        name: '',
        employeeKey: '',
        role: 'user',
        status: 'active',
      });
    }
  }, [mode, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      name: '',
      employeeKey: '',
      role: 'user',
      status: 'active',
    });
  };

  if (!isOpen) return null;

  const isEditingSelf =
    mode === 'edit' && currentUser && userToEdit && currentUser.id === userToEdit.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {mode === 'add' ? TRANSLATIONS.users.addUser : TRANSLATIONS.users.editUser}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.name}
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên người dùng"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="employeeKey" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.employeeKey}
            </label>
            <input
              type="text"
              id="employeeKey"
              value={formData.employeeKey}
              onChange={(e) => setFormData((prev) => ({ ...prev, employeeKey: e.target.value }))}
              placeholder="Nhập mã nhân viên"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
              required
              pattern="\d{6}"
              maxLength={6}
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.role}
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))
              }
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2 appearance-none"
              required
              disabled={isEditingSelf ?? false}
            >
              <option value="user">{TRANSLATIONS.users.roles.user}</option>
              <option value="admin">{TRANSLATIONS.users.roles.admin}</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.status}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value as UserStatus }))
              }
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2 appearance-none"
              required
            >
              <option value="active">{TRANSLATIONS.users.status.active}</option>
              <option value="inactive">{TRANSLATIONS.users.status.inactive}</option>
            </select>
          </div>
          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} type="button">
              {TRANSLATIONS.users.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'add' ? TRANSLATIONS.users.save : TRANSLATIONS.users.update}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
