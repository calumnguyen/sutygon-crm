'use client';
import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  User as UserIcon,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import UserModal from './UserModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import { createUser, getUsers, deleteUser, updateUser } from '@/lib/actions/users';
import Button from '@/components/common/dropdowns/Button';
import { TABLE_CONFIG } from '@/config/table';
import { TRANSLATIONS } from '@/config/translations';
import { User, UserRole } from '@/types/user';
import { useUser } from '@/context/UserContext';

// Helper component for role display with icon
const RoleDisplay = ({ role }: { role: string }) => {
  if (role === 'admin') {
    return (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-400" />
        <span className="text-blue-300">{TRANSLATIONS.users.roles.admin}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <UserIcon className="w-4 h-4 text-gray-400" />
      <span className="text-gray-300">{TRANSLATIONS.users.roles.user}</span>
    </div>
  );
};

// Helper component for status display with icon
const StatusDisplay = ({ status }: { status: string }) => {
  if (status === 'active') {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-green-300">{TRANSLATIONS.users.status.active}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <XCircle className="w-4 h-4 text-red-400" />
      <span className="text-red-300">{TRANSLATIONS.users.status.inactive}</span>
    </div>
  );
};

export default function UsersContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [identityModal, setIdentityModal] = useState<{ open: boolean; userId: number | null }>({
    open: false,
    userId: null,
  });
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete' | null;
    userId: number | null;
  }>({ type: null, userId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const { currentUser } = useUser();

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      const users = await getUsers();
      setUsers(users);
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    // setRevealedKeys({}); // Removed
    // setPendingRevealId(null); // Removed
  }, []);

  const handleAddUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newUser = await createUser(userData);
      setUsers((prev) => [...prev, newUser]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to add user:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  const handleUpdateUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userToEdit) return;
    try {
      const updatedUser = await updateUser(userToEdit.id, userData);
      setUsers((prev) => prev.map((_user) => (_user.id === updatedUser.id ? updatedUser : _user)));
      setIsModalOpen(false);
      setUserToEdit(null);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  const handleEditUser = (userId: string) => {
    setPendingAction({ type: 'edit', userId: parseInt(userId) });
    setIdentityModal({ open: true, userId: parseInt(userId) });
  };

  const handleDeleteUser = (userId: string) => {
    setPendingAction({ type: 'delete', userId: parseInt(userId) });
    setIdentityModal({ open: true, userId: parseInt(userId) });
  };

  const handleAddUserClick = () => {
    setPendingAction({ type: 'add', userId: null });
    setIdentityModal({ open: true, userId: null });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleIdentitySuccess = async (user: { id: number }) => {
    if (pendingAction.type === 'add') {
      setModalMode('add');
      setIsModalOpen(true);
    } else if (pendingAction.type === 'edit' && pendingAction.userId !== null) {
      const userToEdit = users.find((_user) => _user.id === pendingAction.userId);
      if (userToEdit) {
        setUserToEdit(userToEdit);
        setModalMode('edit');
        setIsModalOpen(true);
      }
    } else if (pendingAction.type === 'delete' && pendingAction.userId !== null) {
      handleDeleteUserConfirmed(pendingAction.userId);
    }
    setIdentityModal({ open: false, userId: null });
    setPendingAction({ type: null, userId: null });
    // setPendingRevealId(null); // Removed
  };

  const handleDeleteUserConfirmed = (userId: number) => {
    setUserToDelete(userId.toString());
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      // Add setTimeout to prevent double tap on mobile
      await new Promise((resolve) => setTimeout(resolve, 500));

      await deleteUser(parseInt(userToDelete));
      setUsers((prev) => prev.filter((_user) => _user.id.toString() !== userToDelete));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteUser = (userId: number) => {
    if (!currentUser) return false;
    if (currentUser.role !== 'admin') return false;

    // Prevent admin from deleting themselves
    if (currentUser.id === userId) {
      return false; // Cannot delete yourself
    }

    return true;
  };

  const canEditUser = (userId: number) => {
    if (!currentUser) return false;
    if (currentUser.role !== 'admin') return false;

    // Allow editing others, but prevent editing yourself
    // (since you can't change your own status anyway)
    return true; // Allow all edits - the modal will handle restrictions
  };

  const canDeactivateUser = (userId: number) => {
    if (!currentUser) return false;

    // Prevent admin from deactivating themselves
    if (currentUser.id === userId) {
      return false; // Cannot deactivate yourself
    }

    return true;
  };

  // handleRequestReveal = (userId: number) => { // Removed
  //   setPendingRevealId(userId);
  //   setIdentityModal({ open: true, userId });
  // };

  // handleCloseIdentityModal = () => { // Removed
  //   setIdentityModal({ open: false, userId: null });
  //   setPendingRevealId(null);
  // };

  // handleHideKey = (userId: number) => { // Removed
  //   setRevealedKeys((prev) => ({ ...prev, [userId]: false }));
  // };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">{TRANSLATIONS.users.title}</h1>
        <Button
          variant="primary"
          onClick={handleAddUserClick}
          leftIcon={<UserPlus className="w-5 h-5" />}
          className="w-full sm:w-auto"
        >
          {TRANSLATIONS.users.addUser}
        </Button>
      </div>

      {/* Security Disclaimer Banner */}
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-200">Thông Báo Bảo Mật</h3>
            <div className="mt-2 text-sm text-blue-300">
              <p>
                Vì lý do bảo mật, mã nhân viên không thể hiển thị. Nếu quên mã, vui lòng liên hệ
                quản lý để reset.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                {TABLE_CONFIG.users.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {users.map((_user) => (
                <tr key={_user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {_user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <RoleDisplay role={_user.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <StatusDisplay status={_user.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex space-x-2">
                      {canEditUser(_user.id) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Pencil className="w-4 h-4" />}
                          onClick={() => handleEditUser(_user.id.toString())}
                        >
                          {TRANSLATIONS.users.table.edit}
                        </Button>
                      )}
                      {canDeleteUser(_user.id) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleDeleteUser(_user.id.toString())}
                        >
                          {TRANSLATIONS.users.table.delete}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {users.map((_user) => (
          <div
            key={_user.id}
            className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{_user.name}</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">
                      {TRANSLATIONS.users.table.role}
                    </div>
                    <RoleDisplay role={_user.role} />
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">
                      {TRANSLATIONS.users.table.status}
                    </div>
                    <StatusDisplay status={_user.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-3 border-t border-gray-700">
              {canEditUser(_user.id) && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil className="w-4 h-4" />}
                  onClick={() => handleEditUser(_user.id.toString())}
                  className="flex-1"
                >
                  {TRANSLATIONS.users.table.edit}
                </Button>
              )}
              {canDeleteUser(_user.id) && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => handleDeleteUser(_user.id.toString())}
                  className="flex-1"
                >
                  {TRANSLATIONS.users.table.delete}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setUserToEdit(null);
        }}
        onSubmit={modalMode === 'add' ? handleAddUser : handleUpdateUser}
        mode={modalMode}
        currentUser={currentUser}
        userToEdit={userToEdit}
        allUsers={users}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={TRANSLATIONS.confirmation.deleteUser.title}
        message={TRANSLATIONS.confirmation.deleteUser.message}
        confirmText={TRANSLATIONS.confirmation.deleteUser.confirmText}
        cancelText={TRANSLATIONS.confirmation.deleteUser.cancelText}
        isLoading={isDeleting}
        loadingText="Đang xóa..."
      />

      <IdentityConfirmModal
        open={identityModal.open}
        onClose={() => setIdentityModal({ open: false, userId: null })}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
        requireSameUser={true}
      />
    </div>
  );
}
