import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import Webcam from 'react-webcam';
import { AddItemFormState } from '@/types/inventory';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { parseTags } from './InventoryUtils';

interface AddItemStep1Props {
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  onNext: () => void;
  onBack?: () => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  // Lightning mode props
  lightningMode?: boolean;
  heldTags?: string[];
  setHeldTags?: (tags: string[]) => void;
}

const AddItemStep1: React.FC<AddItemStep1Props> = ({
  form,
  setForm,
  onNext,
  onBack,
  isUploading,
  setIsUploading,
  lightningMode = false,
  heldTags = [],
  setHeldTags,
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
    return mobile;
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      // Check file size before processing (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        alert(
          `File too large! Size: ${(file.size / 1024 / 1024).toFixed(2)}MB\nMaximum allowed: 2MB\nPlease choose a smaller image.`
        );
        return;
      }

      setForm({ ...form, photoFile: file });
    } else {
      setForm({ ...form, photoFile: null });
    }
  };

  const handleFileUpload = () => {
    photoInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    if (isMobile()) {
      setShowCamera(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileSelect(file);
            setShowCamera(false);
          })
          .catch((error) => {
            console.error('Error converting camera image:', error);
          });
      }
    }
  }, [handleFileSelect]);

  const handleCameraError = (error: string | DOMException) => {
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

  // Handle tag click for holding/unholding in lightning mode
  const handleTagClick = (tag: string) => {
    if (!lightningMode || !setHeldTags) return;

    if (heldTags.includes(tag)) {
      // Remove from held tags
      setHeldTags(heldTags.filter((t) => t !== tag));
    } else {
      // Add to held tags
      setHeldTags([...heldTags, tag]);
    }
  };

  // Handle removing a tag from the input
  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const newTags = currentTags.filter((tag) => tag !== tagToRemove);
    setForm({ ...form, tagsInput: newTags.join(', ') });

    // Also remove from held tags if it was held
    if (lightningMode && setHeldTags && heldTags.includes(tagToRemove)) {
      setHeldTags(heldTags.filter((t) => t !== tagToRemove));
    }
  };

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-4 max-w-md w-full mx-4 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Chụp ảnh</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{cameraError}</p>
                <button
                  onClick={() => setShowCamera(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
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
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-left w-full">
        Thông tin sản phẩm
      </h3>
      <form className="w-full space-y-4 sm:space-y-5" onSubmit={(e) => e.preventDefault()}>
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="itemName">
            Tên sản phẩm
          </label>
          <textarea
            id="itemName"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập tên sản phẩm"
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base resize-none"
            rows={2}
            required
            disabled={isUploading}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="category">
            Danh mục
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
            disabled={isUploading}
          >
            <option value="">Chọn danh mục</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="tags">
            Tags (tối đa 10, phân tách bằng dấu phẩy){' '}
            <span className="text-xs text-gray-400">(Không bắt buộc)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={form.tagsInput}
            onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            placeholder="Ví dụ: Cao Cấp, Bà Sui, Đám Cưới"
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
            disabled={isUploading}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, idx) => {
              const isHeld = lightningMode && heldTags.includes(tag);
              return (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                    isHeld
                      ? 'bg-yellow-600 text-black font-medium'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                  onClick={() => (lightningMode ? handleTagClick(tag) : handleRemoveTag(tag))}
                  title={
                    lightningMode
                      ? isHeld
                        ? 'Click to unhold'
                        : 'Click to hold'
                      : 'Click to remove'
                  }
                >
                  {tag}
                  {lightningMode && isHeld && <span className="text-xs">📌</span>}
                  {!lightningMode && <X className="w-3 h-3 hover:text-red-400" />}
                </span>
              );
            })}
            {lightningMode && tags.length > 0 && (
              <div className="text-xs text-gray-400 mt-1 w-full">
                💡 Lightning mode: Click tags to hold them for next item
              </div>
            )}
          </div>
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ảnh sản phẩm <span className="text-xs text-gray-400">(Không bắt buộc)</span>
          </label>

          {/* Image Upload Options */}
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            {/* Camera Capture Button (Mobile Only) */}
            {isMobile() && (
              <button
                type="button"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCameraCapture}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4" />
                Chụp ảnh
              </button>
            )}

            {/* File Upload Button */}
            <button
              type="button"
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleFileUpload}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
              Tải ảnh lên
            </button>
          </div>

          {/* Selected File Display */}
          {form.photoFile && (
            <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                  <img
                    src={URL.createObjectURL(form.photoFile)}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{form.photoFile.name}</div>
                  <div className="text-xs text-gray-400">
                    {(form.photoFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                  disabled={isUploading}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
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
          const file = e.target.files?.[0] || null;
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
          const file = e.target.files?.[0] || null;
          handleFileSelect(file);
        }}
        onError={(e) => {
          console.error('DEBUG: Camera input error:', e);
          alert('Không thể truy cập camera. Vui lòng sử dụng "Tải ảnh lên" thay thế.');
        }}
        disabled={isUploading}
      />
    </>
  );
};

export default AddItemStep1;
