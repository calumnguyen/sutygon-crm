import React, { useRef, useEffect, useState } from 'react';
import Button from '@/components/common/dropdowns/Button';

const DOT_STYLE =
  'w-4 h-4 mx-1 rounded-full border border-gray-500 bg-gray-800 flex items-center justify-center transition-all duration-200';
const DOT_FILLED = 'bg-green-500 border-green-500 shadow-lg scale-110';

function AnimatedDots({ value, length = 6 }: { value: string; length?: number }) {
  return (
    <div className="flex justify-center mb-6">
      {Array.from({ length }).map((_, i) => (
        <span key={i} className={DOT_STYLE + ' ' + (i < value.length ? DOT_FILLED : '')}>
          {''}
        </span>
      ))}
    </div>
  );
}

interface IdentityConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: {
    id: number;
    name: string;
    employeeKey: string;
    role: string;
    status: string;
  }) => void;
  requiredRole?: 'admin' | 'any';
}

const IdentityConfirmModal: React.FC<IdentityConfirmModalProps> = ({
  open,
  onClose,
  onSuccess,
  requiredRole = 'any',
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleConfirm = async (value?: string) => {
    const keyToCheck = value ?? input;
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/by-key?employeeKey=${keyToCheck}`);
      const data = await res.json();
      if (!data.user) {
        setError('Không tìm thấy người dùng này.');
        setIsLoading(false);
        return;
      }
      if (data.user.status !== 'active') {
        setError('Tài khoản này không hoạt động.');
        setIsLoading(false);
        return;
      }
      if (requiredRole === 'admin' && data.user.role !== 'admin') {
        setError('Không đủ thẩm quyền');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      onSuccess(data.user);
      onClose();
    } catch {
      setError('Có lỗi xảy ra.');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setInput((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(e.key) && input.length < 6) {
      const newValue = input + e.key;
      setInput(newValue);
      setError('');
      if (newValue.length === 6) {
        setTimeout(() => handleConfirm(newValue), 200);
      }
    }
    e.preventDefault();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-sm shadow-2xl border border-gray-700 relative">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Xác Nhận Danh Tính</h2>
        <p className="text-gray-300 mb-4 text-center">Nhập Mã Nhân Viên để xác nhận</p>
        <form
          onSubmit={() => {
            handleConfirm();
          }}
        >
          <AnimatedDots value={input} length={6} />
          {/* Hidden input for accessibility and focus */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            minLength={6}
            className="absolute opacity-0 pointer-events-none"
            value={input}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="one-time-code"
            tabIndex={0}
            aria-label="Mã Nhân Viên (6 số)"
          />
          {error && <div className="text-red-400 text-sm text-center mb-2">{error}</div>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdentityConfirmModal;
