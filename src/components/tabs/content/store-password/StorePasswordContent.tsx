import React, { useState, useEffect } from 'react';
import Button from '@/components/common/dropdowns/Button';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import { formatDate } from '@/lib/utils/date';

const DOT_STYLE =
  'w-4 h-4 mx-1 rounded-full border border-gray-500 bg-gray-800 flex items-center justify-center transition-all duration-200';
const DOT_FILLED = 'bg-green-500 border-green-500 shadow-lg scale-110';

function AnimatedDots({ value, length = 8 }: { value: string; length?: number }) {
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

const steps = [
  {
    label: 'Nhập mã cũ',
    key: 'oldCode',
    header: 'Xác Nhận Mã Cũ',
    length: 8,
  },
  {
    label: 'Nhập mã mới',
    key: 'newCode',
    header: 'Tạo Mã Mới',
    length: 8,
  },
  {
    label: 'Xác nhận mã mới',
    key: 'confirmCode',
    header: 'Xác Nhận Mã Mới',
    length: 8,
  },
];

const StorePasswordContent: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [storeCode, setStoreCode] = useState('');
  const newCodeRef = React.useRef('');

  useEffect(() => {
    // Fetch store code and last update on mount
    fetch('/api/store-code')
      .then((res) => res.json())
      .then((data) => {
        setStoreCode(data.storeCode || '');
        setLastUpdate(data.updatedAt ? new Date(data.updatedAt) : null);
      });
  }, []);

  const resetForm = () => {
    setOldCode('');
    setNewCode('');
    setConfirmCode('');
    setStep(0);
    setError('');
    setSuccess('');
  };

  const handleOpenModal = () => {
    setIdentityModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleIdentitySuccess = () => {
    setIdentityModalOpen(false);
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
    setError('');
    setSuccess('');
  };

  // Handle input for each step
  const handleInput = (val: string) => {
    const currentStep = steps[step];
    const sanitized = val.replace(/\D/g, '').slice(0, currentStep.length);
    if (step === 0) setOldCode(sanitized);
    if (step === 1) {
      setNewCode(sanitized);
      newCodeRef.current = sanitized;
    }
    if (step === 2) setConfirmCode(sanitized);
    setError('');
    // Auto-advance if required length
    if (sanitized.length === currentStep.length) {
      setTimeout(() => {
        if (step === 0) {
          if (sanitized !== storeCode) {
            setError('Mã cũ không đúng.');
            setOldCode('');
            return;
          }
        }
        if (step === 1) {
          setStep(step + 1);
          return;
        }
        if (step === 2) {
          if (sanitized !== newCodeRef.current) {
            setError('Mã xác nhận không khớp.');
            return;
          }
          setError('');
          handleSubmit(undefined, sanitized);
          return;
        }
        if (step < steps.length - 1) {
          setStep(step + 1);
        }
      }, 200);
    }
  };

  // When step changes, focus input
  const inputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (modalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalOpen, step]);

  // Modified handleSubmit to allow calling without event and with confirmValue
  const handleSubmit = async (e?: React.FormEvent, confirmValue?: string) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    if (!/^\d{8}$/.test(oldCode)) {
      setStep(0);
      setError('Mã cũ phải gồm 8 chữ số.');
      return;
    }
    if (oldCode !== storeCode) {
      setStep(0);
      setError('Mã cũ không đúng.');
      setOldCode('');
      return;
    }
    if (!/^\d{8}$/.test(newCode)) {
      setStep(1);
      setError('Mã mới phải gồm 8 chữ số.');
      return;
    }
    if (newCode !== (confirmValue ?? confirmCode)) {
      setStep(2);
      setError('Mã xác nhận không khớp.');
      return;
    }
    setIsLoading(true);
    // PATCH to update store code
    const res = await fetch('/api/store-code', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newCode: newCode }),
    });
    if (res.ok) {
      setSuccess('Cập nhật Key Cửa Hàng thành công!');
      setStoreCode(newCode);
      setLastUpdate(new Date());
      setTimeout(() => {
        setModalOpen(false);
        resetForm();
        setError('');
        setSuccess('');
      }, 1200);
    } else {
      setError('Có lỗi khi cập nhật mã.');
    }
    setIsLoading(false);
  };

  // Get value for current step
  const getValue = () => {
    if (step === 0) return oldCode;
    if (step === 1) return newCode;
    if (step === 2) return confirmCode;
    return '';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Key Cửa Hàng</h1>
        <Button variant="primary" size="md" onClick={handleOpenModal}>
          Cập Nhật Key Cửa Hàng
        </Button>
      </div>
      <div className="mb-4 text-gray-400 text-sm">
        Lần cuối mã được thay đổi:{' '}
        <span className="font-semibold text-white">{lastUpdate ? formatDate(lastUpdate) : ''}</span>
      </div>
      <IdentityConfirmModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
      />
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">{steps[step].header}</h2>
            <form onSubmit={handleSubmit}>
              <AnimatedDots value={getValue()} length={steps[step].length} />
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern={`\\d{${steps[step].length}}`}
                maxLength={steps[step].length}
                minLength={steps[step].length}
                className="w-0 h-0 opacity-0 absolute pointer-events-none"
                value={getValue()}
                onChange={(e) => handleInput(e.target.value)}
                autoFocus
                tabIndex={-1}
                // Hide the input, only use for capturing input
              />
              <div className="flex justify-center">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern={`\\d{${steps[step].length}}`}
                  maxLength={steps[step].length}
                  minLength={steps[step].length}
                  className="w-64 h-12 opacity-0 absolute pointer-events-auto z-10"
                  value={getValue()}
                  onChange={(e) => handleInput(e.target.value)}
                  autoFocus
                  style={{ letterSpacing: '2em' }}
                  aria-label={steps[step].label}
                />
              </div>
              {error && <div className="text-red-400 text-sm text-center mt-4">{error}</div>}
              {success && <div className="text-green-400 text-sm text-center mt-4">{success}</div>}
              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                >
                  Hủy
                </Button>
                {/* No confirm button on last step */}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePasswordContent;
