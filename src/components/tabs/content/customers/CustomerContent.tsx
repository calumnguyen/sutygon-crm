'use client';
import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import AddCustomerModal from './AddCustomerModal';
import { formatPhoneNumber } from '@/lib/utils/phone';

// Mock customer type - replace with actual type definition
interface Customer {
  id: number;
  name: string;
  company?: string | null;
  phone: string;
  activeOrdersCount: number;
  lateOrdersCount: number;
  address?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function CustomerContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [identityModal, setIdentityModal] = useState<{ open: boolean; customerId: number | null }>({
    open: false,
    customerId: null,
  });
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete' | null;
    customerId: number | null;
  }>({ type: null, customerId: null });

  // Fetch customers on mount
  useEffect(() => {
    async function fetchCustomers() {
      const res = await fetch('/api/customers');
      const dbCustomers = await res.json();
      setCustomers(dbCustomers);
    }
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (customerData: {
    name: string;
    phone: string;
    company?: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerData.name,
          phone: customerData.phone,
          company: customerData.company ?? null,
          address: customerData.address ?? null,
          notes: customerData.notes ?? null,
          activeOrdersCount: 0,
          lateOrdersCount: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      const inserted = await res.json();
      setCustomers((prev) => [...prev, inserted]);
      setIsModalOpen(false);
      return true;
    } catch (error) {
      console.error('Failed to add customer:', error);
      return false;
    }
  };

  const handleAddCustomerClick = () => {
    setPendingAction({ type: 'add', customerId: null });
    setIdentityModal({ open: true, customerId: null });
  };

  const handleIdentitySuccess = (customer: { id: number }) => {
    if (pendingAction.type === 'add') {
      setIsModalOpen(true);
    } else if (pendingAction.type === 'edit' && pendingAction.customerId !== null) {
      const customerToEdit = customers.find(
        (_customer) => _customer.id === pendingAction.customerId
      );
      if (customerToEdit) {
        setCustomerToEdit(customerToEdit);
        setIsModalOpen(true);
      }
    } else if (pendingAction.type === 'delete' && pendingAction.customerId !== null) {
      handleDeleteCustomerConfirmed(pendingAction.customerId);
    }
    setIdentityModal({ open: false, customerId: null });
    setPendingAction({ type: null, customerId: null });
  };

  const handleDeleteCustomerConfirmed = (customerId: number) => {
    setCustomerToDelete(customerId.toString());
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      // Replace with actual API call
      setCustomers((prev) =>
        prev.filter((_customer) => _customer.id.toString() !== customerToDelete)
      );
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quản Lý Khách Hàng</h1>
        <Button
          variant="primary"
          onClick={handleAddCustomerClick}
          leftIcon={<UserPlus className="w-5 h-5" />}
        >
          Thêm khách hàng mới
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tên khách hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Công ty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Số điện thoại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Đơn đang mượn / Đơn trễ hạn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Địa chỉ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ghi chú
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {customers.map((_customer) => (
              <tr key={_customer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {_customer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {_customer.company || <span className="italic text-gray-500">(Không có)</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatPhoneNumber(_customer.phone)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Đang mượn:</span>
                      <span className="text-base font-mono text-white">
                        {(_customer.activeOrdersCount ?? 0) + ' đơn'}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-sm text-gray-400">Trễ hạn:</span>
                      <span className="text-base font-mono" style={{ color: '#f87171' }}>
                        {(_customer.lateOrdersCount ?? 0) + ' đơn'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {_customer.address || <span className="italic text-gray-500">(Không có)</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {_customer.notes || <span className="italic text-gray-500">(Không có)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IdentityConfirmModal
        open={identityModal.open}
        onClose={() => setIdentityModal({ open: false, customerId: null })}
        onSuccess={handleIdentitySuccess}
        requiredRole="any"
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa khách hàng này?"
      />

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCustomer}
        existingPhones={customers.map((c) => c.phone)}
      />
    </div>
  );
}
