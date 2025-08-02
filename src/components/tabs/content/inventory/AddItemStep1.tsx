import React from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { parseTags } from './InventoryUtils';
import { AddItemFormState } from './InventoryTypes';

interface AddItemStep1Props {
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  isUploading?: boolean;
}

const AddItemStep1: React.FC<AddItemStep1Props> = ({ form, setForm, isUploading = false }) => {
  const tags = parseTags(form.tagsInput);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Debug log for form state
  React.useEffect(() => {
    console.log('DEBUG: Current form.photoFile:', form.photoFile);
  }, [form.photoFile]);

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

  const handleCameraCapture = () => {
    console.log('DEBUG: Camera capture button clicked');
    if (cameraInputRef.current) {
      try {
        cameraInputRef.current.click();
      } catch (error) {
        console.error('DEBUG: Back camera failed, trying front camera:', error);
        // Try fallback camera input
        const fallbackInput = document.getElementById('camera-fallback') as HTMLInputElement;
        if (fallbackInput) {
          fallbackInput.click();
        }
      }
    }
  };

  const handleFileUpload = () => {
    console.log('DEBUG: File upload button clicked');
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const isMobile = () => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    console.log('DEBUG: isMobile() called, result:', mobile, 'userAgent:', navigator.userAgent);
    return mobile;
  };

  return (
    <>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-left w-full">
        Thông tin sản phẩm
      </h3>
      <form className="w-full space-y-4 sm:space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="itemName">
            Tên sản phẩm
          </label>
          <input
            id="itemName"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập tên sản phẩm"
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
            required
            disabled={isUploading}
          />
        </div>
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
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
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
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
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
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isUploading ? 'Đang tải...' : 'Chụp ảnh'}
              </button>
            )}

            {/* File Upload Button */}
            <button
              type="button"
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleFileUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? 'Đang tải...' : 'Tải ảnh lên'}
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
              console.log('DEBUG: Camera file:', file);
              if (file) {
                console.log('DEBUG: Camera file details:', {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                });
                // Validate file size (max 10MB for mobile photos)
                if (file.size > 10 * 1024 * 1024) {
                  alert('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.');
                  return;
                }
              }
              handleFileSelect(file);
            }}
            onError={(e) => {
              console.error('DEBUG: Camera input error:', e);
              alert('Không thể truy cập camera. Vui lòng sử dụng "Tải ảnh lên" thay thế.');
            }}
            disabled={isUploading}
          />

          {/* Fallback camera input for better mobile compatibility */}
          <input
            id="camera-fallback"
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              console.log('DEBUG: Fallback camera input onChange triggered');
              const file = e.target.files?.[0] || null;
              if (file) {
                console.log('DEBUG: Fallback camera file details:', {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                });
                // Validate file size (max 10MB for mobile photos)
                if (file.size > 10 * 1024 * 1024) {
                  alert('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.');
                  return;
                }
              }
              handleFileSelect(file);
            }}
            disabled={isUploading}
          />

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
    </>
  );
};

export default AddItemStep1;
