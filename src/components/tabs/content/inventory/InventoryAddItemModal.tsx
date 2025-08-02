import React, { useState } from 'react';
import { X } from 'lucide-react';
import AddItemStep1 from './AddItemStep1';
import AddItemStep2 from './AddItemStep2';
import { AddItemFormState } from './InventoryTypes';

interface InventoryAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  handleAddItem: () => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
}

const InventoryAddItemModal: React.FC<InventoryAddItemModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  handleAddItem,
  isUploading,
  setIsUploading,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      await handleAddItem();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Thêm sản phẩm mới</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
            />
          ) : (
            <AddItemStep2 form={form} setForm={setForm} />
          )}
        </div>

        {/* Step 2 Navigation */}
        {currentStep === 2 && (
          <div className="flex justify-between p-6 border-t">
            <button
              onClick={handleBack}
              disabled={isUploading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleSave}
              disabled={
                form.sizes.length < 1 ||
                form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price) ||
                isUploading
              }
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Đang tải...' : 'Thêm sản phẩm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAddItemModal;
