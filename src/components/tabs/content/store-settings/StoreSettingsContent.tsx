'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Key, Receipt, Store, Lock, Unlock, RefreshCw } from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import AnimatedDots from '@/components/common/AnimatedDots';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { useUser } from '@/context/UserContext';

// Store Open Login Modal Component
interface StoreOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function StoreOpenModal({ isOpen, onClose, onSuccess }: StoreOpenModalProps) {
  const [storeCode, setStoreCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useUser();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStoreCode('');
      setError('');
    }
  }, [isOpen]);

  const handleOpenStore = async (codeToCheck?: string) => {
    const code = codeToCheck || storeCode;
    if (!code || code.length !== 8) {
      setError('Vui lòng nhập đầy đủ mã cửa hàng');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First validate store code
      const codeRes = await fetch('/api/store-code/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: code }),
      });

      if (!codeRes.ok) {
        setError('Mã cửa hàng không đúng');
        setLoading(false);
        return;
      }

      // Open the store
      const openRes = await fetch('/api/store/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser }),
      });

      if (openRes.ok) {
        onSuccess();
        onClose();
        setStoreCode('');
      } else {
        setError('Không thể mở cửa hàng');
      }
    } catch {
      setError('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setStoreCode((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(key) && storeCode.length < 8) {
      const newValue = storeCode + key;
      setStoreCode(newValue);
      setError('');

      // Auto-submit when 8 digits are entered
      if (newValue.length === 8) {
        setTimeout(() => handleOpenStore(newValue), 200);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Mở Cửa Hàng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {/* Store Code Input using AnimatedDots like IdentityConfirmModal */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm mb-4 text-center">Mã Cửa Hàng</label>
          <AnimatedDots value={storeCode} length={8} />
        </div>

        {/* Numeric Keypad - same style as IdentityConfirmModal */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading || storeCode.length >= 8}
              className="h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleKeyPress('backspace')}
            disabled={loading || storeCode.length === 0}
            className="h-12 bg-red-800 hover:bg-red-700 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 border border-red-600"
          >
            ←
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={loading || storeCode.length >= 8}
            className="h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
          >
            0
          </button>
          <button
            onClick={() => handleOpenStore()}
            disabled={loading || storeCode.length !== 8}
            className="h-12 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 border border-blue-500"
          >
            {loading ? '...' : '✓'}
          </button>
        </div>

        {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}

        <div className="text-gray-400 text-xs text-center">Nhập mã cửa hàng để mở cửa hàng</div>
      </div>
    </div>
  );
}

// Main Store Settings Component
const StoreSettingsContent: React.FC = () => {
  const { currentUser } = useUser();

  // Store status state
  const [storeStatus, setStoreStatus] = useState<'open' | 'closed'>('closed');
  const [storeOpenedBy, setStoreOpenedBy] = useState<string>('');
  const [storeOpenedAt, setStoreOpenedAt] = useState<Date | null>(null);
  const [storeClosedBy, setStoreClosedBy] = useState<string>('');
  const [storeClosedAt, setStoreClosedAt] = useState<Date | null>(null);
  const [storeStatusLoaded, setStoreStatusLoaded] = useState(false);

  // Store code state
  const [lastCodeUpdate, setLastCodeUpdate] = useState<Date | null>(null);
  const [storeCodeModalOpen, setStoreCodeModalOpen] = useState(false);
  const [storeCodeIdentityModalOpen, setStoreCodeIdentityModalOpen] = useState(false);
  const [storeCodeLoaded, setStoreCodeLoaded] = useState(false);

  // Store close identity modal state
  const [storeCloseIdentityModalOpen, setStoreCloseIdentityModalOpen] = useState(false);

  // VAT state
  const [vatPercentage, setVatPercentage] = useState(8);
  const [vatModalOpen, setVatModalOpen] = useState(false);
  const [vatIdentityModalOpen, setVatIdentityModalOpen] = useState(false);
  const [newVatPercentage, setNewVatPercentage] = useState('');
  const [vatError, setVatError] = useState('');
  const [vatSuccess, setVatSuccess] = useState('');
  const [vatLoading, setVatLoading] = useState(false);
  const [vatLoaded, setVatLoaded] = useState(false);

  // Store open modal state
  const [storeOpenModalOpen, setStoreOpenModalOpen] = useState(false);

  // Typesense sync state
  const [typesenseStatus, setTypesenseStatus] = useState<'available' | 'unavailable' | 'loading'>('loading');
  const [typesenseStats, setTypesenseStats] = useState<{
    totalItems: number;
    typesenseCount: number;
    lastSync: string | null;
  }>({ totalItems: 0, typesenseCount: 0, lastSync: null });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; percentage: number; startTime: number; estimatedTimeRemaining: string } | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const syncStartTimeRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load all store settings data on component mount
  useEffect(() => {
    const loadAllStoreSettings = async () => {
      // Load all data in parallel for better performance
      await Promise.all([
        fetchStoreStatus(), 
        fetchStoreCodeInfo(), 
        fetchVATPercentage(),
        fetchTypesenseStatus()
      ]);
    };

    loadAllStoreSettings();
  }, []);

  // Cleanup countdown timer on component unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const fetchStoreStatus = async () => {
    try {
      const res = await fetch('/api/store/status');
      const data = await res.json();
      setStoreStatus(data.isOpen ? 'open' : 'closed');
      setStoreOpenedBy(data.openedBy || '');
      setStoreOpenedAt(data.openedAt ? new Date(data.openedAt) : null);
      setStoreClosedBy(data.closedBy || '');
      setStoreClosedAt(data.closedAt ? new Date(data.closedAt) : null);
      setStoreStatusLoaded(true);
    } catch (error) {
      console.error('Failed to fetch store status:', error);
    }
  };

  const fetchStoreCodeInfo = async () => {
    try {
      const res = await fetch('/api/store-code');
      const data = await res.json();
      setLastCodeUpdate(data.updatedAt ? new Date(data.updatedAt) : null);
      setStoreCodeLoaded(true);
    } catch (error) {
      console.error('Failed to fetch store code info:', error);
    }
  };

  const fetchVATPercentage = async () => {
    try {
      const res = await fetch('/api/store-settings/vat-percentage');
      const data = await res.json();
      setVatPercentage(data.vatPercentage || 8);
      setVatLoaded(true);
    } catch (error) {
      console.error('Failed to fetch VAT percentage:', error);
      setVatPercentage(8);
    }
  };

  const fetchTypesenseStatus = async () => {
    try {
      const res = await fetch('/api/store-settings/typesense-sync');
      const data = await res.json();
      
      if (res.ok) {
        setTypesenseStatus(data.status);
        setTypesenseStats({
          totalItems: data.totalItems || 0,
          typesenseCount: data.typesenseCount || 0,
          lastSync: data.lastSync || null
        });
      } else {
        setTypesenseStatus('unavailable');
      }
    } catch (error) {
      console.error('Failed to fetch Typesense status:', error);
      setTypesenseStatus('unavailable');
    }
  };

  const startCountdownTimer = (totalRemainingMs: number) => {
    // Clear any existing timer
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Ensure we don't start with negative time
    let remainingMs = Math.max(0, totalRemainingMs);
    

    
    const updateCountdown = () => {
      if (remainingMs <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setSyncProgress(prev => prev ? { ...prev, estimatedTimeRemaining: '0 giây' } : null);
        return;
      }

      const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
          return `${hours} giờ ${minutes % 60} phút`;
        } else if (minutes > 0) {
          return `${minutes} phút ${seconds % 60} giây`;
        } else if (seconds > 0) {
          return `${seconds} giây`;
        } else {
          return '0 giây';
        }
      };

      setSyncProgress(prev => prev ? { ...prev, estimatedTimeRemaining: formatTime(remainingMs) } : null);
      remainingMs -= 1000; // Decrease by 1 second
    };

    // Update immediately
    updateCountdown();
    
    // Set interval for countdown
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);
  };

  const handleTypesenseSync = async () => {
    // Prevent multiple simultaneous sync operations
    if (syncLoading) {
      return;
    }
    
    setSyncLoading(true);
    setSyncMessage('');
    setSyncError('');
    setSyncProgress(null);
    setSyncLogs([]);

    try {
      // Initialize progress with start time
      const startTime = Date.now();
      syncStartTimeRef.current = startTime;
      setSyncProgress({
        current: 0,
        total: 0,
        percentage: 0,
        startTime,
        estimatedTimeRemaining: 'Đang tính toán...'
      });
      
      // Add initial log
      setSyncLogs(prev => [...prev, '🔄 Bắt đầu đồng bộ Typesense...']);

      // Use fetch with streaming for real-time logs
      const res = await fetch('/api/store-settings/typesense-sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Có lỗi xảy ra khi đồng bộ');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Không thể đọc response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'log':
                  setSyncLogs(prev => [...prev, data.message]);
                  break;
                                 case 'progress':
                   const currentTime = Date.now();
                   // Use the startTime from the ref to ensure it's preserved across state updates
                   const startTime = syncStartTimeRef.current || currentTime;
                   const elapsedTime = currentTime - startTime;
                   
                   // Only calculate time if we have meaningful progress and elapsed time
                   if (data.percentage > 0 && elapsedTime > 1000 && !countdownIntervalRef.current) { // Wait at least 1 second and only start timer once
                     // Calculate based on chunks: 23 chunks total, each taking ~15-30 seconds
                     const totalChunks = 23;
                     const completedChunks = Math.floor((data.percentage / 100) * totalChunks);
                     const remainingChunks = totalChunks - completedChunks;
                     const secondsPerChunk = 25; // Average time per chunk (15-30 seconds)
                     const remainingTime = remainingChunks * secondsPerChunk * 1000;
                     
                     // Start countdown timer with the calculated remaining time (only once)
                     startCountdownTimer(remainingTime);
                   }
                   
                   setSyncProgress({
                     current: data.current,
                     total: data.total,
                     percentage: data.percentage,
                     startTime: startTime,
                     estimatedTimeRemaining: syncProgress?.estimatedTimeRemaining || 'Đang tính toán...'
                   });
                   setSyncLogs(prev => [...prev, `📊 Tiến độ: ${data.percentage}%`]);
                   break;
                case 'complete':
                  // Stop the countdown timer
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  
                  setSyncMessage(`Đồng bộ thành công: ${data.syncedCount} sản phẩm (${data.failedCount} lỗi)`);
                  setSyncLogs(prev => [...prev, `✅ Hoàn thành: ${data.syncedCount}/${data.totalItems} sản phẩm đã đồng bộ thành công`]);
                  
                  // Set final time to 0 giây
                  setSyncProgress(prev => prev ? { ...prev, estimatedTimeRemaining: '0 giây' } : null);
                  
                  // Stop loading state
                  setSyncLoading(false);
                  
                  // Refresh status after sync
                  setTimeout(() => {
                    fetchTypesenseStatus();
                  }, 1000);
                  break;
                case 'error':
                  setSyncError(data.error);
                  setSyncLogs(prev => [...prev, `❌ ${data.error}`]);
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      // Stop the countdown timer
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      setSyncError('Có lỗi xảy ra khi đồng bộ');
      setSyncLogs(prev => [...prev, '❌ Có lỗi xảy ra khi đồng bộ']);
      setSyncLoading(false);
      setSyncProgress(null);
    }
  };

  const handleCloseStore = async () => {
    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    try {
      const res = await fetch('/api/store/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser }),
      });

      if (res.ok) {
        // Refresh store status to get updated closed info
        fetchStoreStatus();
      } else {
        console.error('Failed to close store');
      }
    } catch (error) {
      console.error('Failed to close store:', error);
    }
  };

  const handleVatUpdate = async () => {
    const percentage = parseFloat(newVatPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setVatError('Phần trăm VAT phải từ 0 đến 100');
      return;
    }

    setVatLoading(true);
    try {
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
    } catch (error) {
      setVatError('Có lỗi khi cập nhật phần trăm VAT.');
    }
    setVatLoading(false);
  };

  // Store Code Update Modal Component
  function StoreCodeUpdateModal() {
    const [oldCode, setOldCode] = useState('');
    const [newCode, setNewCode] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [step, setStep] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const steps = [
      { label: 'Nhập mã cũ', header: 'Xác Nhận Mã Cũ', length: 8 },
      { label: 'Nhập mã mới', header: 'Tạo Mã Mới', length: 8 },
      { label: 'Xác nhận mã mới', header: 'Xác Nhận Mã Mới', length: 8 },
    ];

    const getCurrentValue = () => {
      if (step === 0) return oldCode;
      if (step === 1) return newCode;
      if (step === 2) return confirmCode;
      return '';
    };

    const handleKeyPress = (key: string) => {
      const currentValue = getCurrentValue();
      const currentStep = steps[step];

      if (key === 'backspace') {
        const newValue = currentValue.slice(0, -1);
        if (step === 0) setOldCode(newValue);
        if (step === 1) setNewCode(newValue);
        if (step === 2) setConfirmCode(newValue);
        setError('');
      } else if (/\d/.test(key) && currentValue.length < currentStep.length) {
        const newValue = currentValue + key;
        if (step === 0) setOldCode(newValue);
        if (step === 1) setNewCode(newValue);
        if (step === 2) setConfirmCode(newValue);
        setError('');

        // Auto-advance if complete
        if (newValue.length === currentStep.length) {
          setTimeout(() => {
            if (step === 0) {
              // Validate old code before proceeding
              validateOldCode(newValue);
            } else if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              // Final step - submit
              handleSubmit();
            }
          }, 200);
        }
      }
    };

    const validateOldCode = async (code: string) => {
      try {
        const res = await fetch('/api/store-code/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: code }),
        });

        if (res.ok) {
          setStep(1);
        } else {
          setError('Mã cũ không đúng');
          setOldCode('');
        }
      } catch (error) {
        setError('Có lỗi khi kiểm tra mã cũ');
        setOldCode('');
      }
    };

    const handleSubmit = async () => {
      if (newCode !== confirmCode) {
        setError('Mã xác nhận không khớp');
        setStep(2);
        setConfirmCode('');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/store-code', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newCode }),
        });

        if (res.ok) {
          setSuccess('Cập nhật mã cửa hàng thành công!');
          fetchStoreCodeInfo();
          setTimeout(() => {
            setStoreCodeModalOpen(false);
            resetForm();
          }, 1200);
        } else {
          setError('Có lỗi khi cập nhật mã.');
        }
      } catch (error) {
        setError('Có lỗi khi cập nhật mã.');
      }
      setLoading(false);
    };

    const resetForm = () => {
      setOldCode('');
      setNewCode('');
      setConfirmCode('');
      setStep(0);
      setError('');
      setSuccess('');
    };

    if (!storeCodeModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{steps[step].header}</h2>
            <button
              onClick={() => setStoreCodeModalOpen(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Animated Dots Display */}
          <div className="flex justify-center mb-6">
            {Array.from({ length: steps[step].length }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 mx-1 rounded-full border transition-all duration-200 ${
                  i < getCurrentValue().length
                    ? 'bg-green-500 border-green-500 scale-110'
                    : 'bg-gray-800 border-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={loading || getCurrentValue().length >= steps[step].length}
                className="h-12 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('backspace')}
              disabled={loading || getCurrentValue().length === 0}
              className="h-12 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              disabled={loading || getCurrentValue().length >= steps[step].length}
              className="h-12 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              0
            </button>
            <button
              onClick={step === steps.length - 1 ? handleSubmit : () => {}}
              disabled={loading || getCurrentValue().length !== steps[step].length}
              className="h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? '...' : '✓'}
            </button>
          </div>

          {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}
          {success && <div className="text-green-400 text-sm text-center mb-4">{success}</div>}

          <div className="text-gray-400 text-xs text-center">
            Bước {step + 1} của {steps.length}: {steps[step].label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Cài Đặt Cửa Hàng</h1>
      </div>

      {/* Store Status Card */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {storeStatusLoaded ? (
              storeStatus === 'open' ? (
                <Unlock className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-red-500" />
              )
            ) : (
              <div className="w-5 h-5 bg-gray-600 rounded animate-pulse" />
            )}
            <h2 className="text-lg font-semibold text-white">Trạng Thái Cửa Hàng</h2>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              !storeStatusLoaded
                ? 'bg-gray-700 text-gray-400 border border-gray-600'
                : storeStatus === 'open'
                  ? 'bg-green-900 text-green-300 border border-green-700'
                  : 'bg-red-900 text-red-300 border border-red-700'
            }`}
          >
            {!storeStatusLoaded ? 'Đang tải...' : storeStatus === 'open' ? 'Đang Mở' : 'Đã Đóng'}
          </div>
        </div>

        {storeStatusLoaded && storeStatus === 'open' && storeOpenedBy && (
          <div className="mb-4 text-sm text-gray-400">
            <div>
              Được mở bởi: <span className="text-white font-medium">{storeOpenedBy}</span>
            </div>
            {storeOpenedAt && (
              <div>
                Thời gian:{' '}
                <span className="text-white font-medium">{formatDateTime(storeOpenedAt)}</span>
              </div>
            )}
          </div>
        )}

        {storeStatusLoaded && storeStatus === 'closed' && storeClosedBy && (
          <div className="mb-4 text-sm text-gray-400">
            <div>
              Được đóng bởi: <span className="text-white font-medium">{storeClosedBy}</span>
            </div>
            {storeClosedAt && (
              <div>
                Thời gian:{' '}
                <span className="text-white font-medium">{formatDateTime(storeClosedAt)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {!storeStatusLoaded ? (
            <div className="h-10 bg-gray-700 rounded animate-pulse" />
          ) : storeStatus === 'closed' ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setStoreOpenModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              Mở Cửa Hàng
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStoreCloseIdentityModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Đóng Cửa Hàng
            </Button>
          )}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Code Card */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Mã Cửa Hàng</h2>
          </div>

          <div className="mb-4 text-sm text-gray-400">
            Lần cuối thay đổi:{' '}
            <span className="text-white font-medium">
              {!storeCodeLoaded ? (
                <span className="inline-block w-20 h-4 bg-gray-600 rounded animate-pulse" />
              ) : lastCodeUpdate ? (
                formatDate(lastCodeUpdate)
              ) : (
                'Chưa có thông tin'
              )}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setStoreCodeIdentityModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Cập Nhật Mã
          </Button>
        </div>

        {/* VAT Percentage Card */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Phần Trăm VAT</h2>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-bold text-white mb-1">
              {!vatLoaded ? (
                <div className="w-16 h-8 bg-gray-600 rounded animate-pulse" />
              ) : (
                `${vatPercentage}%`
              )}
            </div>
            <div className="text-sm text-gray-400">Áp dụng cho tất cả đơn hàng mới</div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVatIdentityModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Cập Nhật VAT
          </Button>
        </div>

        {/* Typesense Sync Card */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className={`w-5 h-5 ${
              typesenseStatus === 'available' ? 'text-green-500' : 
              typesenseStatus === 'unavailable' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <h2 className="text-lg font-semibold text-white">Đồng Bộ Typesense</h2>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Trạng thái:</span>
              <span className={`text-sm font-medium ${
                typesenseStatus === 'available' ? 'text-green-400' : 
                typesenseStatus === 'unavailable' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {typesenseStatus === 'available' ? 'Khả dụng' : 
                 typesenseStatus === 'unavailable' ? 'Không khả dụng' : 'Đang kiểm tra...'}
              </span>
            </div>
            
            {typesenseStatus === 'available' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Sản phẩm trong DB:</span>
                  <span className="text-sm text-white font-medium">{typesenseStats.totalItems}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Sản phẩm trong Typesense:</span>
                  <span className="text-sm text-white font-medium">{typesenseStats.typesenseCount}</span>
                </div>
                {typesenseStats.lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Lần đồng bộ cuối:</span>
                    <span className="text-sm text-white font-medium">
                      {formatDateTime(new Date(typesenseStats.lastSync))}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {syncMessage && (
            <div className="mb-3 p-2 bg-green-900 border border-green-700 rounded text-green-300 text-sm">
              {syncMessage}
            </div>
          )}

          {syncError && (
            <div className="mb-3 p-2 bg-red-900 border border-red-700 rounded text-red-300 text-sm">
              {syncError}
            </div>
          )}

          {syncProgress && (
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Tiến trình:</span>
                <span>{syncProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${syncProgress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Thời gian ước tính còn lại:</span>
                <span>{syncProgress.estimatedTimeRemaining}</span>
              </div>
            </div>
          )}

          {syncLogs.length > 0 && (
            <div className="mb-3">
              <div className="text-sm text-gray-400 mb-2">Nhật ký đồng bộ:</div>
              <div className="bg-gray-900 border border-gray-700 rounded p-3 max-h-32 overflow-y-auto">
                {syncLogs.map((log, index) => (
                  <div key={index} className="text-xs text-gray-300 mb-1 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTypesenseSync}
            disabled={syncLoading || typesenseStatus !== 'available'}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {syncLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang đồng bộ...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Đồng Bộ Ngay
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Store Open Modal */}
      <StoreOpenModal
        isOpen={storeOpenModalOpen}
        onClose={() => setStoreOpenModalOpen(false)}
        onSuccess={fetchStoreStatus}
      />

      {/* Store Code Update Modal */}
      <StoreCodeUpdateModal />

      {/* Identity Confirmation Modals */}
      <IdentityConfirmModal
        open={storeCodeIdentityModalOpen}
        onClose={() => setStoreCodeIdentityModalOpen(false)}
        onSuccess={() => {
          setStoreCodeIdentityModalOpen(false);
          // Always open store code modal for store code updates
          setStoreCodeModalOpen(true);
        }}
        requiredRole="admin"
        requireSameUser={true}
      />

      <IdentityConfirmModal
        open={vatIdentityModalOpen}
        onClose={() => setVatIdentityModalOpen(false)}
        onSuccess={() => {
          setVatIdentityModalOpen(false);
          setVatModalOpen(true);
        }}
        requiredRole="admin"
        requireSameUser={true}
      />

      {/* Store Close Identity Confirmation Modal */}
      <IdentityConfirmModal
        open={storeCloseIdentityModalOpen}
        onClose={() => setStoreCloseIdentityModalOpen(false)}
        onSuccess={() => {
          setStoreCloseIdentityModalOpen(false);
          handleCloseStore();
        }}
        requiredRole="admin"
        requireSameUser={true}
      />

      {/* VAT Update Modal */}
      {vatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Cập Nhật VAT</h2>
              <button
                onClick={() => setVatModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">
                Phần trăm VAT mới <span className="text-red-400">*</span>
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
            {vatSuccess && (
              <div className="text-green-400 text-sm text-center mb-4">{vatSuccess}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => setVatModalOpen(false)}
                disabled={vatLoading}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleVatUpdate}
                disabled={vatLoading}
                className="flex-1"
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

export default StoreSettingsContent;
