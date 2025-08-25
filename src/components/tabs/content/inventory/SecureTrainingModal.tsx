import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  Shield,
  BookOpen,
  Search,
  Mail,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface TrainingSession {
  isActive: boolean;
  currentStep: string;
  totalItems: number;
  processedItems: number;
  logs: string[];
  error?: string | null;
  summary?: {
    totalItems?: number;
    categoriesProcessed?: string[];
    itemsWithImages?: number;
    itemsWithTags?: number;
    totalTags?: number;
    imageCoverage?: string;
    tagCoverage?: string;
    trainingDuration?: number;
    averageTagsPerItem?: number;
  };
}

export default function SecureTrainingModal({
  isOpen,
  onClose,
  function: functionType = 'training',
}: {
  isOpen: boolean;
  onClose: () => void;
  function: 'training' | 'search';
}) {
  const { sessionToken, currentUser } = useUser();
  const [step, setStep] = useState<'request' | 'verify' | 'training'>('request');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trainingSession, setTrainingSession] = useState<TrainingSession | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  const functionDisplayName = functionType === 'training' ? 'Huấn luyện AI' : 'Sutygon-Bot';
  const functionDescription =
    functionType === 'training' ? 'huấn luyện AI cho Sutygon-bot' : 'sử dụng tính năng Sutygon-Bot';

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setVerificationCode('');
      setError(null);
      setSuccess(null);
      setTrainingLogs([]);
      setTrainingProgress(0);
      setIsTraining(false);
      setShowStartButton(false);
      setTrainingSession(null);
      setShowCloseConfirmation(false);
      setShowDeleteConfirmation(false);
      setIsDeleting(false);

      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isOpen]);

  // Poll for training status updates
  const pollTrainingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/ai-bulk-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'status' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          setTrainingSession(data.session);

          // Update progress
          if (data.session.totalItems > 0) {
            const progress = Math.round(
              (data.session.processedItems / data.session.totalItems) * 100
            );
            setTrainingProgress(progress);
          }

          // Update logs
          if (data.session.logs) {
            setTrainingLogs(data.session.logs);
          }

          // Stop polling if training is complete or failed
          if (data.session.currentStep === 'completed' || data.session.currentStep === 'error') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsTraining(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll training status:', error);
    }
  }, [sessionToken]);

  // Start polling when training starts
  useEffect(() => {
    if (isTraining && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(pollTrainingStatus, 1000); // Poll every second
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isTraining, pollTrainingStatus]);

  const requestCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/send-training-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ function: functionType }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          `Mã xác thực ${functionDisplayName} đã được gửi đến Calum. Vui lòng kiểm tra email.`
        );
        setStep('verify');
      } else {
        setError(data.error || 'Không thể gửi mã xác thực');
      }
    } catch (error) {
      setError('Không thể gửi mã xác thực');
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, functionType, functionDisplayName]);

  const verifyCode = useCallback(async () => {
    if (!verificationCode.trim()) {
      setError('Vui lòng nhập mã xác thực');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/send-training-code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ code: verificationCode, function: functionType }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Xác thực thành công! Bắt đầu quá trình...');
        if (functionType === 'training') {
          setStep('training');
          setShowStartButton(true);
          setIsTraining(false); // Ensure training is not started automatically
          setTrainingSession(null); // Clear any existing session

          // Check if there's an existing training session
          try {
            const statusResponse = await fetch('/api/inventory/ai-bulk-training', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
              },
              body: JSON.stringify({ action: 'status' }),
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.success && statusData.session && statusData.session.isActive) {
                setTrainingSession(statusData.session);
                setIsTraining(true);
                setShowStartButton(false);
              }
            }
          } catch (error) {
            //
          }
        } else {
          // For search, verify with AI search API and then close
          try {
            const searchVerificationResponse = await fetch('/api/inventory/ai-visual-search', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
              },
            });

            if (searchVerificationResponse.ok) {
              setSuccess(
                'Xác thực Sutygon-Bot thành công! Bạn có thể sử dụng tính năng Sutygon-Bot.'
              );
              // Close the verification modal after a short delay
              setTimeout(() => {
                onClose();
              }, 1500);
            } else {
              setError('Không thể xác thực Sutygon-Bot');
            }
          } catch (error) {
            setError('Không thể xác thực Sutygon-Bot');
          }
        }
      } else {
        setError(data.error || 'Mã xác thực không đúng');
      }
    } catch (error) {
      setError('Không thể xác thực mã');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, sessionToken, functionType, onClose]);

  const startTraining = useCallback(async () => {
    setIsTraining(true);
    setShowStartButton(false);
    setTrainingLogs(['Bắt đầu huấn luyện AI...']);
    setTrainingProgress(0);
    setTrainingSession(null);

    try {
      const response = await fetch('/api/inventory/ai-bulk-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await response.json();

      if (response.ok) {
        setTrainingLogs((prev) => [
          ...prev,
          `✅ Huấn luyện bắt đầu với ${data.session.totalItems} sản phẩm`,
        ]);
        setTrainingSession(data.session);
      } else {
        setError(data.error || 'Không thể bắt đầu huấn luyện');
        setIsTraining(false);
        setShowStartButton(true);
      }
    } catch (error) {
      setError('Không thể bắt đầu huấn luyện');
      setIsTraining(false);
      setShowStartButton(true);
    }
  }, [sessionToken]);

  const deleteAllTrainingData = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/inventory/ai-training', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Đã xóa thành công ${data.deletedCount} dữ liệu huấn luyện`);
        setShowDeleteConfirmation(false);
      } else {
        setError(data.error || 'Không thể xóa dữ liệu huấn luyện');
      }
    } catch (error) {
      setError('Không thể xóa dữ liệu huấn luyện');
    } finally {
      setIsDeleting(false);
    }
  }, [sessionToken]);

  const resetModal = useCallback(() => {
    setStep('request');
    setVerificationCode('');
    setError(null);
    setSuccess(null);
    setTrainingLogs([]);
    setTrainingProgress(0);
    setIsTraining(false);
    setShowStartButton(false);
    setTrainingSession(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isTraining) {
      setShowCloseConfirmation(true);
    } else {
      resetModal();
      onClose();
    }
  }, [isTraining, resetModal, onClose]);

  const handleConfirmClose = useCallback(() => {
    setIsTraining(false);
    setShowCloseConfirmation(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const handleCancelClose = useCallback(() => {
    setShowCloseConfirmation(false);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="flex items-center">
              {functionType === 'training' ? (
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mr-2" />
              ) : (
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mr-2" />
              )}
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {functionDisplayName}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {!isAdmin && functionType === 'training' && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2" />
                <span className="text-red-800 font-medium text-sm sm:text-base">
                  Quyền truy cập bị từ chối
                </span>
              </div>
              <p className="text-red-700 text-xs sm:text-sm mt-1">
                Chỉ quản trị viên mới có thể {functionDescription}.
              </p>
            </div>
          )}

          {((isAdmin && functionType === 'training') || functionType === 'search') &&
            step === 'request' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  {functionType === 'training' ? (
                    <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-purple-500 mx-auto mb-3 sm:mb-4" />
                  ) : (
                    <Search className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-3 sm:mb-4" />
                  )}
                  <h3 className="text-base sm:text-lg font-medium text-center mb-2 text-gray-900">
                    {functionDisplayName} - Xác thực bảo mật
                  </h3>
                  <p className="text-gray-800 text-center mb-4 font-medium text-sm sm:text-base">
                    Để {functionDescription}, bạn cần xác thực với Calum.
                  </p>
                </div>

                <button
                  onClick={requestCode}
                  disabled={isLoading}
                  className="w-full bg-purple-600 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  )}
                  Gửi mã xác thực
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-xs sm:text-sm">{success}</p>
                  </div>
                )}
              </div>
            )}

          {((isAdmin && functionType === 'training') || functionType === 'search') &&
            step === 'verify' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-center mb-2 text-gray-900">
                    Nhập mã xác thực
                  </h3>
                  <p className="text-gray-800 text-center mb-4 font-medium text-sm sm:text-base">
                    Vui lòng nhập mã 6 chữ số đã được gửi đến email của Calum.
                  </p>
                </div>

                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Nhập mã xác thực"
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-center text-base sm:text-lg tracking-widest text-gray-900 placeholder-gray-500"
                  maxLength={6}
                />

                <button
                  onClick={verifyCode}
                  disabled={isLoading || !verificationCode.trim()}
                  className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  )}
                  Xác thực
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-xs sm:text-sm">{success}</p>
                  </div>
                )}
              </div>
            )}

          {isAdmin && functionType === 'training' && step === 'training' && (
            <div>
              <div className="mb-4 sm:mb-6">
                <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-purple-500 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-center mb-2 text-gray-900">
                  Đang huấn luyện AI
                </h3>
                <p className="text-gray-800 text-center mb-4 font-medium text-sm sm:text-base">
                  Sutygon-bot đang học từ dữ liệu kho hàng của bạn...
                </p>
              </div>

              {/* Start Training Button */}
              {showStartButton && !isTraining && (
                <div className="mb-4 sm:mb-6">
                  <button
                    onClick={startTraining}
                    className="w-full bg-purple-600 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm sm:text-base font-medium"
                  >
                    🚀 Bắt đầu huấn luyện AI
                  </button>
                </div>
              )}

              {/* Delete All Training Data Button */}
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="w-full bg-red-600 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm sm:text-base font-medium"
                >
                  🗑️ Xóa tất cả dữ liệu huấn luyện
                </button>
              </div>

              {/* Current Step Status */}
              {trainingSession && (
                <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-blue-900">
                      Bước hiện tại:
                    </span>
                    <span className="text-xs sm:text-sm text-blue-700 capitalize">
                      {trainingSession.currentStep === 'loading' && 'Đang tải dữ liệu...'}
                      {trainingSession.currentStep === 'processing' && 'Đang xử lý...'}
                      {trainingSession.currentStep === 'saving' && 'Đang lưu...'}
                      {trainingSession.currentStep === 'completed' && 'Hoàn thành'}
                      {trainingSession.currentStep === 'error' && 'Lỗi'}
                    </span>
                  </div>
                  {trainingSession.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs sm:text-sm text-red-800">
                      Lỗi: {trainingSession.error}
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">Tiến độ</span>
                  <span className="text-xs sm:text-sm text-gray-700">
                    {trainingSession
                      ? `${trainingSession.processedItems}/${trainingSession.totalItems}`
                      : '0/0'}{' '}
                    ({trainingProgress}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className="bg-purple-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Training Logs */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-2 text-gray-900 text-sm sm:text-base">
                  Nhật ký huấn luyện:
                </h4>
                {trainingLogs.length === 0 ? (
                  <p className="text-gray-700 text-xs sm:text-sm">Đang chờ huấn luyện bắt đầu...</p>
                ) : (
                  <div className="space-y-1">
                    {trainingLogs.map((log, index) => (
                      <div key={index} className="text-xs sm:text-sm text-gray-800 break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isTraining && (
                <div className="mt-4 text-center">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-purple-500 mx-auto" />
                  <p className="text-xs sm:text-sm text-gray-700 mt-2 font-medium">
                    Đang huấn luyện...
                  </p>
                </div>
              )}

              {/* Completion Message with Summary */}
              {trainingSession?.currentStep === 'completed' && trainingSession.summary && (
                <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 font-medium text-center mb-3 text-sm sm:text-base">
                    Huấn luyện hoàn thành thành công!
                  </p>

                  <div className="bg-white rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                      📊 Tóm tắt huấn luyện:
                    </h5>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                      <div>
                        • Tổng sản phẩm:{' '}
                        <span className="font-medium">{trainingSession.summary.totalItems}</span>
                      </div>
                      <div>
                        • Danh mục:{' '}
                        <span className="font-medium">
                          {trainingSession.summary.categoriesProcessed?.length || 0}
                        </span>
                      </div>
                      <div>
                        • Sản phẩm có hình:{' '}
                        <span className="font-medium">
                          {trainingSession.summary.itemsWithImages} (
                          {trainingSession.summary.imageCoverage})
                        </span>
                      </div>
                      <div>
                        • Sản phẩm có tags:{' '}
                        <span className="font-medium">
                          {trainingSession.summary.itemsWithTags} (
                          {trainingSession.summary.tagCoverage})
                        </span>
                      </div>
                      <div>
                        • Tổng tags:{' '}
                        <span className="font-medium">{trainingSession.summary.totalTags}</span>
                      </div>
                      <div>
                        • Trung bình tags/sản phẩm:{' '}
                        <span className="font-medium">
                          {trainingSession.summary.averageTagsPerItem}
                        </span>
                      </div>
                      <div>
                        • Thời gian huấn luyện:{' '}
                        <span className="font-medium">
                          {trainingSession.summary.trainingDuration} giây
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <h6 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">
                      🎯 AI đã học được:
                    </h6>
                    <p className="text-blue-800 text-xs sm:text-sm">
                      Sutygon-bot giờ đây có thể hiểu và phân tích{' '}
                      {trainingSession.summary.totalItems} sản phẩm từ{' '}
                      {trainingSession.summary.categoriesProcessed?.length || 0} danh mục khác nhau,
                      với {trainingSession.summary.totalTags} tags để tìm kiếm chính xác hơn.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {trainingSession?.currentStep === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-red-800 font-medium text-sm sm:text-base">
                    Huấn luyện thất bại!
                  </p>
                  <p className="text-red-700 text-xs sm:text-sm mt-1">
                    {trainingSession.error ||
                      'Đã xảy ra lỗi không xác định trong quá trình huấn luyện.'}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-xs sm:text-sm">{success}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for closing during training */}
      <ConfirmationModal
        isOpen={showCloseConfirmation}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="Dừng huấn luyện?"
        message="Quá trình huấn luyện đang diễn ra. Bạn có chắc chắn muốn dừng lại không?"
        confirmText="Dừng lại"
        cancelText="Tiếp tục"
      />

      {/* Confirmation Modal for deleting all training data */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={deleteAllTrainingData}
        title="Xóa tất cả dữ liệu huấn luyện?"
        message="Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu huấn luyện AI. Bạn có chắc chắn muốn tiếp tục không?"
        confirmText="Xóa tất cả"
        cancelText="Hủy"
        isLoading={isDeleting}
        loadingText="Đang xóa..."
      />
    </>
  );
}
