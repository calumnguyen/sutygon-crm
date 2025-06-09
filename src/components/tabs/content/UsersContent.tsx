'use client';
import React, { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import UserModal from './UserModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { createUser, getUsers, deleteUser, updateUser } from '@/lib/actions/users';
import Button from '@/components/common/dropdowns/Button';
import { TABLE_CONFIG } from '@/config/table';
import { TRANSLATIONS } from '@/config/translations';
import { User, UserRole } from '@/types/user';

export default function UsersContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

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
      email: 'calum@sutygon.com',
      role: 'admin' as UserRole,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
      setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setIsModalOpen(false);
      setUserToEdit(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(parseInt(userToDelete));
      setUsers((prev) => prev.filter((user) => user.id.toString() !== userToDelete));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id.toString() === userId);
    if (user) {
      setUserToEdit(user);
      setModalMode('edit');
      setIsModalOpen(true);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{TRANSLATIONS.users.title}</h1>
        <Button
          variant="primary"
          onClick={() => {
            setModalMode('add');
            setIsModalOpen(true);
          }}
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
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {TRANSLATIONS.users.roles[user.role]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {TRANSLATIONS.users.status[user.status]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <div className="flex space-x-2">
                    {canEditUser() && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="w-4 h-4" />}
                        onClick={() => handleEditUser(user.id.toString())}
                      >
                        {TRANSLATIONS.users.table.edit}
                      </Button>
                    )}
                    {canDeleteUser() && (
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDeleteUser(user.id.toString())}
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
    </div>
  );
}
