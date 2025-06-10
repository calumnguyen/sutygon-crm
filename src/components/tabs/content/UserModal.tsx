import React, { useState, useEffect } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import { User, UserRole, UserStatus } from '@/types/user';
import { Eye, EyeOff } from 'lucide-react';

interface UserModalProps {
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
}: UserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'user' as UserRole,
    status: 'active' as UserStatus,
    employeeKey: '',
  });
  const [showEmployeeKey, setShowEmployeeKey] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && userToEdit) {
      setFormData({
        name: userToEdit.name,
        role: userToEdit.role,
        status: userToEdit.status,
        employeeKey: userToEdit.employeeKey || '',
      });
    } else {
      setFormData({
        name: '',
        role: 'user',
        status: 'active',
        employeeKey: '',
      });
    }
  }, [mode, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(formData.employeeKey)) {
      setError('Mã nhân viên phải gồm 6 chữ số.');
      return;
    }
    // Check uniqueness of employeeKey
    const res = await fetch(`/api/users/by-key?employeeKey=${formData.employeeKey}`);
    const data = await res.json();
    if (data.user && (mode === 'add' || (mode === 'edit' && data.user.id !== userToEdit?.id))) {
      setError('Mã nhân viên này đã được sử dụng.');
      return;
    }
    await onSubmit(formData);
    setFormData({
      name: '',
      role: 'user',
      status: 'active',
      employeeKey: '',
    });
  };

  if (!isOpen) return null;

  const isEditingSelf =
    mode === 'edit' && currentUser && userToEdit && currentUser.id === userToEdit.id;
  const isAdmin = currentUser?.role === 'admin';
  const isRoleEditable = mode === 'add' || (isAdmin && !isEditingSelf);

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
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value as UserStatus }))
              }
              className={`${inputBaseClasses} ${inputEnabledClasses}`}
              required
            >
              <option value="active">{TRANSLATIONS.users.status.active}</option>
              <option value="inactive">{TRANSLATIONS.users.status.inactive}</option>
            </select>
          </div>
          <div>
            <label htmlFor="employeeKey" className="block text-sm font-medium text-gray-300 mb-1">
              Mã Nhân Viên (6 số)
            </label>
            <div className="relative">
              <input
                type={showEmployeeKey ? 'text' : 'password'}
                id="employeeKey"
                value={formData.employeeKey}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData((prev) => ({ ...prev, employeeKey: val }));
                }}
                placeholder="Nhập mã nhân viên"
                className={`${inputBaseClasses} ${inputEnabledClasses} pr-10`}
                required
                maxLength={6}
                minLength={6}
                pattern="\d{6}"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-400 focus:outline-none"
                onClick={() => setShowEmployeeKey((v) => !v)}
                tabIndex={-1}
                aria-label={showEmployeeKey ? 'Ẩn mã' : 'Hiện mã'}
              >
                {showEmployeeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
