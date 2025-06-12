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
}) => {
  if (!addModalOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl shadow-2xl border border-gray-700 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Thêm sản phẩm mới</h2>
        {addStep === 1 && <AddItemStep1 form={form} setForm={setForm} />}
        {addStep === 2 && <AddItemStep2 form={form} setForm={setForm} />}
        <div className="flex justify-end w-full mt-4 space-x-3">
          {addStep === 2 && (
            <Button variant="secondary" onClick={() => setAddStep(1)} type="button">
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
          >
            Huỷ
          </Button>
          {addStep === 1 && (
            <Button
              variant="primary"
              type="button"
              onClick={() => setAddStep(2)}
              disabled={!form.name.trim()}
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
                form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price)
              }
              onClick={handleAddItem}
            >
              Thêm sản phẩm
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryAddItemModal;
