'use client';
import React, { useEffect, useState } from 'react';
import { User, UserRole, UserStatus } from '@/types/user';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  mode: 'add' | 'edit';
  currentUser?: User | null;
  userToEdit?: User | null;
  allUsers?: User[];
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  currentUser,
  userToEdit,
  allUsers = [],
}: UserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'user' as UserRole,
    status: 'active' as UserStatus,
    employeeKey: '',
  });
  const [error, setError] = useState('');
  const [showEmployeeKeyInput, setShowEmployeeKeyInput] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && userToEdit) {
      setFormData({
        name: userToEdit.name,
        role: userToEdit.role,
        status: userToEdit.status,
        employeeKey: '', // Always empty for edit mode - admin sets new key
      });
      setShowEmployeeKeyInput(false); // Hide employee key input by default in edit mode
    } else {
      setFormData({
        name: '',
        role: 'user',
        status: 'active',
        employeeKey: '',
      });
      setShowEmployeeKeyInput(true); // Show employee key input by default in add mode
    }
  }, [mode, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Only validate employee key if it's being updated (showEmployeeKeyInput is true)
    if (showEmployeeKeyInput && !/^\d{6}$/.test(formData.employeeKey)) {
      setError('Mã nhân viên phải gồm 6 chữ số.');
      return;
    }

    // Only check uniqueness if employee key is being updated
    if (showEmployeeKeyInput && formData.employeeKey) {
      const res = await fetch(`/api/users/by-key?employeeKey=${formData.employeeKey}`);
      const data = await res.json();
      if (data.user && (mode === 'add' || (mode === 'edit' && data.user.id !== userToEdit?.id))) {
        setError('Mã nhân viên này đã được sử dụng.');
        return;
      }
    }

    // If not updating employee key in edit mode, use the original key
    const submitData = {
      ...formData,
      employeeKey: showEmployeeKeyInput ? formData.employeeKey : userToEdit?.employeeKey || '',
    };

    await onSubmit(submitData);
    setFormData({
      name: '',
      role: 'user',
      status: 'active',
      employeeKey: '',
    });
    setShowEmployeeKeyInput(false);
  };

  if (!isOpen) return null;

  const isEditingSelf =
    mode === 'edit' && currentUser && userToEdit && currentUser.id === userToEdit.id;
  const isAdmin = currentUser?.role === 'admin';
  const isRoleEditable = mode === 'add' || (isAdmin && !isEditingSelf);

  // Check if this is the last admin being deactivated
  const isLastAdmin =
    mode === 'edit' &&
    userToEdit &&
    userToEdit.role === 'admin' &&
    allUsers.filter((user) => user.role === 'admin' && user.status === 'active').length === 1;

  const inputBaseClasses =
    'mt-1 block w-full rounded-lg border text-gray-200 placeholder-gray-500 focus:outline-none transition px-4 py-2';
  const inputEnabledClasses =
    'bg-gray-800 border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500';
  const inputDisabledClasses = 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-75';

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
              className={`${inputBaseClasses} ${inputEnabledClasses}`}
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.role}
              {!isRoleEditable && (
                <span className="ml-2 text-xs text-gray-400">(Không thể thay đổi)</span>
              )}
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))
              }
              className={`${inputBaseClasses} ${isRoleEditable ? inputEnabledClasses : inputDisabledClasses}`}
              required
              disabled={!isRoleEditable}
            >
              <option value="user">{TRANSLATIONS.users.roles.user}</option>
              <option value="admin">{TRANSLATIONS.users.roles.admin}</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
              {TRANSLATIONS.users.table.status}
              {isLastAdmin && (
                <span className="ml-2 text-xs text-orange-400">
                  (Không thể deactivate admin cuối cùng)
                </span>
              )}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value as UserStatus }))
              }
              className={`${inputBaseClasses} ${isLastAdmin ? inputDisabledClasses : inputEnabledClasses}`}
              required
              disabled={isLastAdmin || false}
            >
              <option value="active">{TRANSLATIONS.users.status.active}</option>
              <option value="inactive">{TRANSLATIONS.users.status.inactive}</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="employeeKey" className="block text-sm font-medium text-gray-300">
                Mã Nhân Viên (6 số)
              </label>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => setShowEmployeeKeyInput(!showEmployeeKeyInput)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {showEmployeeKeyInput ? 'Hủy' : 'Sửa Mã'}
                </button>
              )}
            </div>
            {showEmployeeKeyInput ? (
              <input
                type="text"
                id="employeeKey"
                value={formData.employeeKey}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData((prev) => ({ ...prev, employeeKey: val }));
                }}
                placeholder={mode === 'edit' ? 'Nhập mã nhân viên mới' : 'Nhập mã nhân viên'}
                className={`${inputBaseClasses} ${inputEnabledClasses}`}
                required={mode === 'add'}
                maxLength={6}
                minLength={6}
                pattern="\d{6}"
                autoComplete="new-password"
              />
            ) : mode === 'edit' ? (
              <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                •••••• (Nhấn &quot;Sửa Mã&quot; để thay đổi)
              </div>
            ) : null}
          </div>
          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} type="button">
              {TRANSLATIONS.users.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'add' ? TRANSLATIONS.users.save : TRANSLATIONS.users.update}
            </Button>
          </div>
          {error && <div className="text-red-400 text-sm text-center mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
}
