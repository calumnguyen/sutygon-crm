'use client';
import React, { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import UserModal from './UserModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { createUser, getUsers, deleteUser, updateUser } from '@/lib/actions/users';
import Button from '@/components/common/dropdowns/Button';
import { TABLE_CONFIG } from '@/config/table';
import { TRANSLATIONS } from '@/config/translations';
import { User, UserRole } from '@/types/user';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';

export default function UsersContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [identityModal, setIdentityModal] = useState<{ open: boolean; userId: number | null }>({
    open: false,
    userId: null,
  });
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [pendingRevealId, setPendingRevealId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete' | null;
    userId: number | null;
  }>({ type: null, userId: null });

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      const users = await getUsers();
      setUsers(users);
    }
    fetchUsers();
  }, []);

  // Mock current user for demo - replace with actual auth logic
  useEffect(() => {
    setCurrentUser({
      id: 1,
      name: 'Calum',
      role: 'admin' as UserRole,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      employeeKey: '123456',
    });
  }, []);

  useEffect(() => {
    setRevealedKeys({});
    setPendingRevealId(null);
  }, []);

  const handleAddUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newUser = await createUser(userData);
      setUsers((prev) => [...prev, newUser]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to add user:', error);
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
  const handleIdentitySuccess = (user: { id: number }) => {
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
    } else if (pendingRevealId !== null) {
      setRevealedKeys((prev) => ({ ...prev, [pendingRevealId]: true }));
    }
    setIdentityModal({ open: false, userId: null });
    setPendingAction({ type: null, userId: null });
    setPendingRevealId(null);
  };

  const handleDeleteUserConfirmed = (userId: number) => {
    setUserToDelete(userId.toString());
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(parseInt(userToDelete));
      setUsers((prev) => prev.filter((_user) => _user.id.toString() !== userToDelete));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const canDeleteUser = () => {
    if (!currentUser) return false;
    if (currentUser.role !== 'admin') return false;
    return true;
  };

  const canEditUser = () => {
    if (!currentUser) return false;
    return true; // Allow all users to edit
  };

  const handleRequestReveal = (userId: number) => {
    setPendingRevealId(userId);
    setIdentityModal({ open: true, userId });
  };

  const handleCloseIdentityModal = () => {
    setIdentityModal({ open: false, userId: null });
    setPendingRevealId(null);
  };

  const handleHideKey = (userId: number) => {
    setRevealedKeys((prev) => ({ ...prev, [userId]: false }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{TRANSLATIONS.users.title}</h1>
        <Button
          variant="primary"
          onClick={handleAddUserClick}
          leftIcon={<UserPlus className="w-5 h-5" />}
        >
          {TRANSLATIONS.users.addUser}
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{_user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <span>
                    {revealedKeys[_user.id] ? (
                      <>
                        {_user.employeeKey}
                        <button
                          className="ml-2 text-gray-400 hover:text-blue-400 focus:outline-none"
                          onClick={() => handleHideKey(_user.id)}
                          type="button"
                          aria-label="Ẩn mã"
                        >
                          <EyeOff className="inline w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {'•'.repeat(_user.employeeKey.length)}
                        <button
                          className="ml-2 text-gray-400 hover:text-blue-400 focus:outline-none"
                          onClick={() => handleRequestReveal(_user.id)}
                          type="button"
                          aria-label="Hiện mã"
                        >
                          <Eye className="inline w-4 h-4" />
                        </button>
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {TRANSLATIONS.users.roles[_user.role]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {TRANSLATIONS.users.status[_user.status]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <div className="flex space-x-2">
                    {canEditUser() && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="w-4 h-4" />}
                        onClick={() => handleEditUser(_user.id.toString())}
                      >
                        {TRANSLATIONS.users.table.edit}
                      </Button>
                    )}
                    {canDeleteUser() && (
                      <Button
                        variant="danger"
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
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={TRANSLATIONS.confirmation.deleteUser.title}
        message={TRANSLATIONS.confirmation.deleteUser.message}
        confirmText={TRANSLATIONS.confirmation.deleteUser.confirmText}
        cancelText={TRANSLATIONS.confirmation.deleteUser.cancelText}
      />

      <IdentityConfirmModal
        open={identityModal.open}
        onClose={handleCloseIdentityModal}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
      />
    </div>
  );
}
