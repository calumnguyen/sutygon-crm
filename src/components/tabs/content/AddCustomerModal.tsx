import React, { useState } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { validatePhoneNumber, formatPhoneNumber } from '@/lib/utils/phone';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: {
    name: string;
    phone: string;
    company?: string;
    notes?: string;
  }) => Promise<boolean>;
  existingPhones: string[];
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingPhones,
}) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Format as user types
      setForm({ ...form, phone: formatPhoneNumber(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!validatePhoneNumber(form.phone)) {
      setError('Số điện thoại phải có 10 hoặc 11 chữ số hợp lệ.');
      return;
    }
    if (existingPhones.includes(form.phone.replace(/\D/g, ''))) {
      setError('Số điện thoại đã tồn tại.');
      return;
    }
    setLoading(true);
    const success = await onSubmit({
      name: form.name.trim(),
      phone: form.phone.replace(/\D/g, ''),
      company: form.company.trim(),
      notes: form.notes.trim(),
    });
    setLoading(false);
    if (success) {
      setForm({ name: '', phone: '', company: '', notes: '' });
      onClose();
    }
  };

  const canSubmit =
    form.name.trim() &&
    form.phone.trim() &&
    validatePhoneNumber(form.phone) &&
    !existingPhones.includes(form.phone.replace(/\D/g, ''));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Thêm Khách Hàng Mới</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Tên khách hàng <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Nhập tên khách hàng"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
              Số điện thoại <span className="text-red-400">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={form.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
              required
              maxLength={18}
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
              Công ty <span className="text-xs text-gray-400">(Không bắt buộc)</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={form.company}
              onChange={handleChange}
              placeholder="Nhập tên công ty (nếu có)"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
              Ghi chú <span className="text-xs text-gray-400">(Không bắt buộc)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Nhập ghi chú (nếu có)"
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition px-4 py-2"
              rows={2}
            />
          </div>
          {error && <div className="text-red-400 text-sm text-center mt-2">{error}</div>}
          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={!canSubmit}>
              Thêm khách hàng
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
