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

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setInput((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(key) && input.length < 6) {
      const newValue = input + key;
      setInput(newValue);
      setError('');
      if (newValue.length === 6) {
        setTimeout(() => handleConfirm(newValue), 200);
      }
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
        
        {/* Hidden input for keyboard support */}
        <div className="relative flex flex-col items-center w-full mb-4">
          <AnimatedDots value={input} length={6} />
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
        </div>

        {/* Mobile-friendly numeric keypad */}
        <div className="w-full mb-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={input.length >= 6 || isLoading}
                className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('backspace')}
              disabled={input.length === 0 || isLoading}
              className="w-full h-12 bg-red-800 hover:bg-red-700 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-red-600"
            >
              ←
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              disabled={input.length >= 6 || isLoading}
              className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
            >
              0
            </button>
            <button
              onClick={() => input.length === 6 && handleConfirm(input)}
              disabled={input.length !== 6 || isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-blue-500"
            >
              ✓
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}
        
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IdentityConfirmModal;
