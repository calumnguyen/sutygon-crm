import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Camera, ArrowLeft } from 'lucide-react';
import Webcam from 'react-webcam';
import { AddItemFormState } from './InventoryTypes';
import { parseTags } from './InventoryUtils';

interface AddItemStep1Props {
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  onNext: () => void;
  onBack?: () => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
}

const AddItemStep1: React.FC<AddItemStep1Props> = ({
  form,
  setForm,
  onNext,
  onBack,
  isUploading,
  setIsUploading,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isMobile = () => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    console.log('DEBUG: isMobile() called, result:', mobile, 'userAgent:', navigator.userAgent);
    return mobile;
  };

  const handleFileSelect = (file: File | null) => {
    console.log('DEBUG: handleFileSelect called with:', file);
    if (file) {
      console.log('DEBUG: File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        isMobile: isMobile(),
        userAgent: navigator.userAgent,
      });

      // Validate file for mobile
      if (isMobile()) {
        console.log('DEBUG: Mobile file validation');
        if (file.size === 0) {
          console.error('DEBUG: File size is 0, this might be a mobile issue');
          alert('File appears to be empty. Please try selecting the file again.');
          return;
        }
        if (!file.type.startsWith('image/')) {
          console.error('DEBUG: File type is not image:', file.type);
          alert('Please select an image file.');
          return;
        }
      }
    } else {
      console.log('DEBUG: No file selected');
    }
    setForm({ ...form, photoFile: file });
  };

  const handleFileUpload = () => {
    console.log('DEBUG: File upload button clicked');
    photoInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    console.log('DEBUG: Camera capture button clicked');
    if (isMobile()) {
      setShowCamera(true);
    } else {
      try {
        cameraInputRef.current?.click();
      } catch (error) {
        console.error('DEBUG: Camera input error:', error);
        alert('Không thể truy cập camera. Vui lòng sử dụng "Tải ảnh lên" thay thế.');
      }
    }
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Convert base64 to File object
        fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            console.log('DEBUG: Camera captured file:', {
              name: file.name,
              size: file.size,
              type: file.type,
            });
            handleFileSelect(file);
            setShowCamera(false);
          })
          .catch((error) => {
            console.error('DEBUG: Error converting camera image:', error);
            alert('Không thể xử lý ảnh từ camera. Vui lòng thử lại.');
          });
      }
    }
  }, []);

  const handleCameraError = (error: string | DOMException) => {
    console.error('DEBUG: Camera error:', error);
    setCameraError('Không thể truy cập camera. Vui lòng sử dụng "Tải ảnh lên" thay thế.');
  };

  const handleNext = () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!form.category.trim()) {
      alert('Vui lòng chọn danh mục');
      return;
    }
    onNext();
  };

  const tags = parseTags(form.tagsInput);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Thông tin cơ bản</h2>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Quay lại</span>
          </button>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Chụp ảnh</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{cameraError}</p>
                <button
                  onClick={() => setShowCamera(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'environment',
                    }}
                    onUserMediaError={handleCameraError}
                    className="w-full rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    Chụp ảnh
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tên sản phẩm *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tên sản phẩm"
            disabled={isUploading}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục *</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading}
          >
            <option value="">Chọn danh mục</option>
            <option value="Áo">Áo</option>
            <option value="Quần">Quần</option>
            <option value="Giày">Giày</option>
            <option value="Túi">Túi</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (tối đa 10, phân tách bằng dấu phẩy){' '}
            <span className="text-xs text-gray-500">(Không bắt buộc)</span>
          </label>
          <input
            type="text"
            value={form.tagsInput}
            onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            placeholder="Ví dụ: Cao Cấp, Bà Sui, Đám Cưới"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm</label>

          <div className="space-y-3">
            {/* Current Image Preview */}
            {form.photoFile && (
              <div className="relative">
                <img
                  src={URL.createObjectURL(form.photoFile)}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md"
                />
                <button
                  onClick={() => setForm({ ...form, photoFile: null })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Tải ảnh lên</span>
              </button>

              {isMobile() && (
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ảnh</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={isUploading || !form.name.trim() || !form.category.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Đang tải...' : 'Tiếp theo'}
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={photoInputRef}
        id="photo"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          console.log('DEBUG: Photo input onChange triggered');
          const file = e.target.files?.[0] || null;
          console.log('DEBUG: Photo input file:', file);
          if (file) {
            console.log('DEBUG: Photo input file details:', {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
            });
          }
          handleFileSelect(file);
        }}
        onError={(e) => {
          console.error('DEBUG: Photo input error:', e);
        }}
        disabled={isUploading}
      />

      <input
        ref={cameraInputRef}
        id="camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          console.log('DEBUG: Camera input onChange triggered');
          const file = e.target.files?.[0] || null;
          console.log('DEBUG: Camera input file:', file);
          if (file) {
            console.log('DEBUG: Camera input file details:', {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
            });
          }
          handleFileSelect(file);
        }}
        onError={(e) => {
          console.error('DEBUG: Camera input error:', e);
          alert('Không thể truy cập camera. Vui lòng sử dụng "Tải ảnh lên" thay thế.');
        }}
        disabled={isUploading}
      />
    </div>
  );
};

export default AddItemStep1;
