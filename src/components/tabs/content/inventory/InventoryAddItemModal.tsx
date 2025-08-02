import React from 'react';
import Button from '@/components/common/dropdowns/Button';
import AddItemStep1 from './AddItemStep1';
import AddItemStep2 from './AddItemStep2';
import { AddItemFormState } from '@/types/inventory';

interface InventoryAddItemModalProps {
  addModalOpen: boolean;
  setAddModalOpen: (open: boolean) => void;
  addStep: number;
  setAddStep: (step: number) => void;
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
  resetAddItemForm: () => void;
  handleAddItem: () => void;
  isUploading?: boolean;
}

const InventoryAddItemModal: React.FC<InventoryAddItemModalProps> = ({
  addModalOpen,
  setAddModalOpen,
  addStep,
  setAddStep,
  form,
  setForm,
  resetAddItemForm,
  handleAddItem,
  isUploading = false,
}) => {
  if (!addModalOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-lg sm:max-w-2xl shadow-2xl border border-gray-700 flex flex-col items-center max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          Thêm sản phẩm mới
        </h2>
        {addStep === 1 && <AddItemStep1 form={form} setForm={setForm} isUploading={isUploading} />}
        {addStep === 2 && <AddItemStep2 form={form} setForm={setForm} />}
        <div className="flex flex-col sm:flex-row justify-end w-full mt-4 sm:mt-6 space-y-2 sm:space-y-0 sm:space-x-3">
          {addStep === 2 && (
            <Button
              variant="secondary"
              onClick={() => setAddStep(1)}
              type="button"
              className="w-full sm:w-auto"
              disabled={isUploading}
            >
              Quay lại
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              resetAddItemForm();
              setAddModalOpen(false);
            }}
            type="button"
            className="w-full sm:w-auto"
            disabled={isUploading}
          >
            Huỷ
          </Button>
          {addStep === 1 && (
            <Button
              variant="primary"
              type="button"
              onClick={() => setAddStep(2)}
              disabled={!form.name.trim() || isUploading}
              className="w-full sm:w-auto"
            >
              Tiếp tục
            </Button>
          )}
          {addStep === 2 && (
            <Button
              variant="primary"
              type="button"
              disabled={
                form.sizes.length < 1 ||
                form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price) ||
                isUploading
              }
              onClick={handleAddItem}
              className="w-full sm:w-auto"
            >
              {isUploading ? 'Đang tải...' : 'Thêm sản phẩm'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryAddItemModal;
