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
  const [vatPercentage, setVatPercentage] = useState(8);
  const [vatModalOpen, setVatModalOpen] = useState(false);
  const [vatIdentityModalOpen, setVatIdentityModalOpen] = useState(false);
  const [newVatPercentage, setNewVatPercentage] = useState('');
  const [vatError, setVatError] = useState('');
  const [vatSuccess, setVatSuccess] = useState('');
  const [vatLoading, setVatLoading] = useState(false);
  const newCodeRef = React.useRef('');

  useEffect(() => {
    // Fetch store code and last update on mount
    fetch('/api/store-code')
      .then((res) => res.json())
      .then((data) => {
        setStoreCode(data.storeCode || '');
        setLastUpdate(data.updatedAt ? new Date(data.updatedAt) : null);
      });
    
    // Fetch VAT percentage
    fetch('/api/store-settings/vat-percentage')
      .then((res) => res.json())
      .then((data) => {
        setVatPercentage(data.vatPercentage || 8);
      })
      .catch(() => {
        setVatPercentage(8); // Default fallback
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

  const handleVatIdentitySuccess = () => {
    setVatIdentityModalOpen(false);
    setVatModalOpen(true);
  };

  const handleOpenVatModal = () => {
    setVatIdentityModalOpen(true);
    setVatError('');
    setVatSuccess('');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
    setError('');
    setSuccess('');
  };

  const handleVatUpdate = async () => {
    setVatError('');
    setVatSuccess('');
    
    const percentage = parseFloat(newVatPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setVatError('Phần trăm VAT phải từ 0 đến 100.');
      return;
    }
    
    setVatLoading(true);
    const res = await fetch('/api/store-settings/vat-percentage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vatPercentage: percentage }),
    });
    
    if (res.ok) {
      setVatSuccess('Cập nhật phần trăm VAT thành công!');
      setVatPercentage(percentage);
      setNewVatPercentage('');
      setTimeout(() => {
        setVatModalOpen(false);
        setVatError('');
        setVatSuccess('');
      }, 1200);
    } else {
      setVatError('Có lỗi khi cập nhật phần trăm VAT.');
    }
    setVatLoading(false);
  };

  // Handle input for each step
  const handleKeyPress = async (key: string) => {
    const currentStep = steps[step];
    let currentValue = '';
    if (step === 0) currentValue = oldCode;
    if (step === 1) currentValue = newCode;
    if (step === 2) currentValue = confirmCode;
    
    if (key === 'backspace') {
      const newValue = currentValue.slice(0, -1);
      if (step === 0) setOldCode(newValue);
      if (step === 1) setNewCode(newValue);
      if (step === 2) setConfirmCode(newValue);
      setError('');
    } else if (/\d/.test(key) && currentValue.length < currentStep.length) {
      const newValue = currentValue + key;
      if (step === 0) setOldCode(newValue);
      if (step === 1) {
        setNewCode(newValue);
        newCodeRef.current = newValue;
      }
      if (step === 2) setConfirmCode(newValue);
      setError('');
      
      // Auto-advance if required length
      if (newValue.length === currentStep.length) {
        setTimeout(() => {
          if (step === 0) {
            if (newValue !== storeCode) {
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
            if (newValue !== newCodeRef.current) {
              setError('Mã xác nhận không khớp.');
              return;
            }
            setError('');
            handleSubmit(undefined, newValue);
            return;
          }
          if (step < steps.length - 1) {
            setStep(step + 1);
          }
        }, 200);
      }
    }
  };

  const handleInput = async (val: string) => {
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
      setTimeout(async () => {
        if (step === 0) {
          // Hash the input for comparison with stored hash
          const { hashValue } = await import('@/lib/utils/hash');
          const hashedInput = hashValue(sanitized);
          if (hashedInput !== storeCode) {
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
    // Hash the old code for comparison with stored hash
    const { hashValue } = await import('@/lib/utils/hash');
    const hashedOldCode = hashValue(oldCode);
    if (hashedOldCode !== storeCode) {
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
      
      {/* VAT Percentage Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Phần Trăm VAT</h2>
          <Button variant="secondary" size="sm" onClick={handleOpenVatModal}>
            Cập Nhật VAT
          </Button>
        </div>
        <div className="text-gray-400 text-sm">
          Phần trăm VAT hiện tại: <span className="font-semibold text-white">{vatPercentage}%</span>
        </div>
        <div className="text-gray-500 text-xs mt-2">
          Phần trăm này sẽ được áp dụng cho tất cả các đơn hàng mới
        </div>
      </div>
      <IdentityConfirmModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
      />
      <IdentityConfirmModal
        open={vatIdentityModalOpen}
        onClose={() => setVatIdentityModalOpen(false)}
        onSuccess={handleVatIdentitySuccess}
        requiredRole="admin"
      />
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">{steps[step].header}</h2>
            
            {/* Hidden input for keyboard support */}
            <div className="relative flex flex-col items-center w-full mb-4">
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
            </div>

            {/* Mobile-friendly numeric keypad */}
            <div className="w-full mb-4">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={async () => await handleKeyPress(num.toString())}
                    disabled={getValue().length >= steps[step].length || isLoading}
                    className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={async () => await handleKeyPress('backspace')}
                  disabled={getValue().length === 0 || isLoading}
                  className="w-full h-12 bg-red-800 hover:bg-red-700 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-red-600"
                >
                  ←
                </button>
                <button
                  onClick={async () => await handleKeyPress('0')}
                  disabled={getValue().length >= steps[step].length || isLoading}
                  className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
                >
                  0
                </button>
                <button
                  onClick={async () => getValue().length === steps[step].length && await handleSubmit(undefined, getValue())}
                  disabled={getValue().length !== steps[step].length || isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-blue-500"
                >
                  ✓
                </button>
              </div>
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
          </div>
        </div>
      )}
      
      {/* VAT Percentage Update Modal */}
      {vatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setVatModalOpen(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Cập Nhật Phần Trăm VAT</h2>
            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">
                Phần trăm VAT mới: <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newVatPercentage}
                onChange={(e) => setNewVatPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder={`Hiện tại: ${vatPercentage}%`}
                autoFocus
              />
            </div>
            {vatError && <div className="text-red-400 text-sm text-center mb-4">{vatError}</div>}
            {vatSuccess && <div className="text-green-400 text-sm text-center mb-4">{vatSuccess}</div>}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setVatModalOpen(false)}
                disabled={vatLoading}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleVatUpdate}
                disabled={vatLoading}
              >
                {vatLoading ? 'Đang cập nhật...' : 'Cập Nhật'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePasswordContent;
