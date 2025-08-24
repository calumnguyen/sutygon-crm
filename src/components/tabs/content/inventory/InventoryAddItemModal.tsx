import React, { useState } from 'react';
import { X, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import AddItemStep1 from './AddItemStep1';
import AddItemStep2 from './AddItemStep2';
import { AddItemFormState } from './InventoryTypes';
import { useUser } from '@/context/UserContext';

interface InventoryAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  handleAddItem: (shouldCloseModal?: boolean) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  // Lightning mode props
  lightningMode?: boolean;
  setLightningMode?: (mode: boolean) => void;
  heldTags?: string[];
  setHeldTags?: (tags: string[]) => void;
  lastCategory?: string;
  setLastCategory?: (category: string) => void;
}

const InventoryAddItemModal: React.FC<InventoryAddItemModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  handleAddItem,
  isUploading,
  setIsUploading,
  lightningMode = false,
  setLightningMode,
  heldTags = [],
  setHeldTags,
  lastCategory = '',
  setLastCategory,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const { setImportantTask } = useUser();

  // Protect against logout when modal is open
  React.useEffect(() => {
    if (isOpen) {
      setImportantTask(true);
      console.log('🔒 Add Item Modal opened - important task protection enabled');
    } else {
      // Add a small delay before removing protection to prevent race conditions
      const timer = setTimeout(() => {
        setImportantTask(false);
        console.log('🔓 Add Item Modal closed - important task protection disabled');
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [isOpen, setImportantTask]);

  const handleNext = () => {
    console.log('DEBUG: handleNext called, currentStep:', currentStep);
    console.log('DEBUG: Lightning mode:', lightningMode);

    if (currentStep === 1) {
      console.log('DEBUG: Going from step 1 to step 2');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      console.log('DEBUG: At step 2, lightning mode:', lightningMode);
      if (lightningMode) {
        console.log('DEBUG: Lightning mode - calling handleAddItem and resetting for next item');
        // In lightning mode, call the handleAddItem prop and then reset for next item
        handleLightningAddAndReset();
      } else {
        console.log('DEBUG: Normal mode - closing modal');
        handleSave();
      }
    }
  };

  const handleLightningAddAndReset = async () => {
    try {
      console.log('DEBUG: handleLightningAddAndReset called');

      // Save current category and tags for next item
      if (setLastCategory) {
        setLastCategory(form.category);
      }

      // Handle held tags
      if (setHeldTags) {
        const currentTags = form.tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        // Only keep tags that are currently in the form AND were previously held
        const newHeldTags = heldTags.filter((tag) => currentTags.includes(tag));
        setHeldTags(newHeldTags);
      }

      // Call the actual API function but don't close modal
      await handleAddItem(false); // Pass false to prevent modal closure

      // Reset form for next item while preserving category and held tags
      const heldTagsString = heldTags.length > 0 ? heldTags.join(', ') : '';
      setForm({
        name: '',
        category: lastCategory || form.category, // Keep the last category
        tagsInput: heldTagsString, // Pre-fill with held tags
        tags: [...heldTags], // Pre-fill tags array
        photoFile: null,
        sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
        samePrice: true,
      });

      // Go back to step 1 for next item
      setCurrentStep(1);
    } catch (error) {
      console.error('Lightning mode add failed:', error);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      await handleAddItem(true); // Pass true to close modal in normal mode
      onClose();
      setCurrentStep(1);
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(1);
  };

  const toggleLightningMode = () => {
    if (setLightningMode) {
      setLightningMode(!lightningMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600">
        {/* Lightning Mode Banner */}
        {lightningMode && (
          <div className="bg-yellow-600 text-black">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">
                  {bannerCollapsed ? 'Chế Độ Nhanh' : 'Chế Độ Nhanh - Thêm nhanh nhiều sản phẩm'}
                </span>
              </div>
              <button
                onClick={() => setBannerCollapsed(!bannerCollapsed)}
                className="text-black hover:text-gray-700 transition-colors"
              >
                {bannerCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
            {!bannerCollapsed && (
              <div className="px-3 pb-3 text-sm">
                <p>• Danh mục sẽ được giữ cho sản phẩm tiếp theo</p>
                <p>• Tags có thể được &quot;giữ&quot; để tái sử dụng</p>
                <p>• Sau khi thêm sẽ chuyển về bước 1 cho sản phẩm mới</p>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Thêm sản phẩm mới</h2>
            {setLightningMode && (
              <button
                onClick={toggleLightningMode}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  lightningMode
                    ? 'bg-yellow-600 text-black hover:bg-yellow-700'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Zap className="w-4 h-4" />
                Lightning
              </button>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 ? (
            <AddItemStep1
              form={form}
              setForm={setForm}
              onNext={handleNext}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              lightningMode={lightningMode}
              heldTags={heldTags}
              setHeldTags={setHeldTags}
            />
          ) : (
            <AddItemStep2
              form={form}
              setForm={setForm}
              onNext={handleNext}
              lightningMode={lightningMode}
            />
          )}
        </div>

        {/* Step 2 Navigation */}
        {currentStep === 2 && (
          <div className="flex justify-between p-6 border-t border-gray-600">
            <button
              onClick={handleBack}
              disabled={isUploading}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 disabled:opacity-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleNext}
              disabled={
                form.sizes.length < 1 ||
                form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price) ||
                isUploading
              }
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading
                ? 'Đang tải...'
                : lightningMode
                  ? 'Thêm sản phẩm & Tiếp tục'
                  : 'Thêm sản phẩm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAddItemModal;
