import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Upload, Save, Loader2, BookOpen, Play } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface AITrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AITrainingModal({ isOpen, onClose }: AITrainingModalProps) {
  const { sessionToken } = useUser();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [showRunButton, setShowRunButton] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Không thể truy cập camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        setImage(imageData);
        stopCamera();
        setError(null);
      }
    }
  }, [stopCamera]);

  const handleTraining = useCallback(async () => {
    if (!image || !description || !category) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setIsTraining(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'training-image.jpg');
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', tags);

      const result = await fetch('/api/inventory/ai-training', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      const data = await result.json();

      if (!result.ok) {
        if (result.status === 409) {
          // Duplicate detected
          throw new Error(data.details || 'Dữ liệu huấn luyện đã tồn tại');
        } else {
          throw new Error(data.error || 'Training failed');
        }
      }

      setSuccess(`Đã huấn luyện thành công! Sutygon-bot đã học được ${data.trainingDataSize} mẫu.`);

      // Reset form
      setImage(null);
      setDescription('');
      setCategory('');
      setTags('');
      setShowRunButton(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setIsTraining(false);
    }
  }, [image, description, category, tags, sessionToken]);

  const resetModal = useCallback(() => {
    setImage(null);
    setDescription('');
    setCategory('');
    setTags('');
    setError(null);
    setSuccess(null);
    setIsTraining(false);
    setShowRunButton(false);
    stopCamera();
  }, [stopCamera]);

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
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const handleCancelClose = useCallback(() => {
    setShowCloseConfirmation(false);
  }, []);

  // Check if form is ready for training
  const isFormReady = image && description && category;

  // Update showRunButton when form is ready
  React.useEffect(() => {
    if (isFormReady && !showRunButton && !isTraining) {
      setShowRunButton(true);
    }
  }, [isFormReady, showRunButton, isTraining]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <BookOpen size={20} className="mr-2 text-green-500" />
              Huấn luyện Sutygon-bot
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 p-1">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p>📚 Giúp Sutygon-bot học cách nhận diện sản phẩm tốt hơn bằng cách:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Chụp ảnh sản phẩm rõ ràng</li>
              <li>Mô tả chi tiết về sản phẩm</li>
              <li>Chọn danh mục chính xác</li>
              <li>Thêm tags liên quan</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm">
              {success}
            </div>
          )}

          {!image ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-700 mb-4 text-sm sm:text-base">
                  Chụp ảnh hoặc tải lên hình ảnh sản phẩm để huấn luyện
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Camera size={24} className="sm:w-8 sm:h-8 text-green-500 mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Chụp ảnh</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Upload size={24} className="sm:w-8 sm:h-8 text-green-500 mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Tải lên</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="flex items-start space-x-4">
                <div className="relative flex-shrink-0">
                  <img
                    src={image}
                    alt="Training"
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Mô tả sản phẩm *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả chi tiết về sản phẩm: màu sắc, chất liệu, hoa văn, phong cách..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Danh mục *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-sm"
                    >
                      <option value="">Chọn danh mục</option>
                      <option value="Áo dài">Áo dài</option>
                      <option value="Áo sơ mi">Áo sơ mi</option>
                      <option value="Quần">Quần</option>
                      <option value="Váy">Váy</option>
                      <option value="Áo khoác">Áo khoác</option>
                      <option value="Phụ kiện">Phụ kiện</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Tags (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="truyền thống, lụa, hoa văn, trang trọng..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Phân cách bằng dấu phẩy</p>
                  </div>
                </div>
              </div>

              {/* Run Training Button */}
              {showRunButton && !isTraining && (
                <button
                  onClick={handleTraining}
                  disabled={!isFormReady}
                  className="w-full bg-blue-500 text-white py-2 sm:py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base font-medium"
                >
                  <Play size={16} className="sm:w-5 sm:h-5 mr-2" />
                  🚀 Chạy huấn luyện
                </button>
              )}

              {/* Training Progress */}
              {isTraining && (
                <div className="w-full bg-green-500 text-white py-2 sm:py-3 px-4 rounded-md flex items-center justify-center text-sm sm:text-base font-medium">
                  <Loader2 size={16} className="sm:w-5 sm:h-5 animate-spin mr-2" />
                  Đang huấn luyện Sutygon-bot...
                </div>
              )}
            </div>
          )}

          {streamRef.current && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 max-w-md w-full">
                <h3 className="text-lg font-medium mb-4 text-gray-900">Chụp ảnh</h3>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 sm:h-64 object-cover rounded-lg mb-4"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex space-x-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 text-sm font-medium"
                  >
                    Chụp
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 text-sm font-medium"
                  >
                    Hủy
                  </button>
                </div>
              </div>
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
    </>
  );
}
