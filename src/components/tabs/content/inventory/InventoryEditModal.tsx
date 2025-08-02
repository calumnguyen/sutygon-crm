import React, { useState, useEffect } from 'react';
import Button from '@/components/common/dropdowns/Button';
import { Loader2, Trash2 } from 'lucide-react';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { parseTags } from './InventoryUtils';
import { AddItemFormState } from '@/types/inventory';
import { InventoryItem } from '@/types/inventory';

interface InventoryEditModalProps {
  editModalOpen: boolean;
  setEditModalOpen: (open: boolean) => void;
  item: InventoryItem | null;
  onSave: (updatedItem: {
    id: number;
    name: string;
    category: string;
    tags: string[];
    sizes: Array<{ title: string; quantity: number; onHand: number; price: number }>;
  }) => void;
  onDelete: (itemId: number) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

const InventoryEditModal: React.FC<InventoryEditModalProps> = ({
  editModalOpen,
  setEditModalOpen,
  item,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const [form, setForm] = useState<AddItemFormState>({
    name: '',
    category: 'Áo Dài',
    tags: [],
    tagsInput: '',
    photoFile: null,
    sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
    samePrice: true,
  });
  const [editStep, setEditStep] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        tags: item.tags,
        tagsInput: item.tags.join(', '),
        photoFile: null, // We don't edit the photo file, just keep the URL
        sizes: item.sizes.map((size) => ({
          title: size.title,
          quantity: size.quantity.toString(),
          onHand: size.onHand.toString(),
          price: size.price.toString(),
        })),
        samePrice: false, // Don't use same price for editing
      });
      setEditStep(1);
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;

    const tags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);

    const sizes = form.sizes.map((s) => ({
      title: s.title,
      quantity: parseInt(s.quantity, 10) || 0,
      onHand: parseInt(s.onHand, 10) || 0,
      price: parseInt(s.price.replace(/\D/g, ''), 10) || 0,
    }));

    onSave({
      id: parseInt(item.id, 10),
      name: form.name,
      category: form.category,
      tags,
      sizes,
    });
  };

  const handleDelete = () => {
    if (!item) return;
    onDelete(parseInt(item.id, 10));
    setShowDeleteConfirm(false);
  };

  if (!editModalOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-lg sm:max-w-2xl shadow-2xl border border-gray-700 flex flex-col items-center max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          Chỉnh sửa sản phẩm
        </h2>

        {editStep === 1 && (
          <div className="w-full">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-left w-full">
              Thông tin sản phẩm
            </h3>
            <form className="w-full space-y-4 sm:space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label
                  className="block text-sm font-medium text-gray-300 mb-1"
                  htmlFor="editItemName"
                >
                  Tên sản phẩm
                </label>
                <input
                  id="editItemName"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nhập tên sản phẩm"
                  className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
                  required
                  disabled={isSaving || isDeleting}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-300 mb-1"
                  htmlFor="editCategory"
                >
                  Danh mục
                </label>
                <select
                  id="editCategory"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
                  disabled={isSaving || isDeleting}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="editTags">
                  Tags (tối đa 10, phân tách bằng dấu phẩy){' '}
                  <span className="text-xs text-gray-400">(Không bắt buộc)</span>
                </label>
                <input
                  id="editTags"
                  type="text"
                  value={form.tagsInput}
                  onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                  placeholder="Ví dụ: Cao Cấp, Bà Sui, Đám Cưới"
                  className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-3 sm:px-4 py-2 text-sm sm:text-base"
                  disabled={isSaving || isDeleting}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {parseTags(form.tagsInput).map((tag, idx) => (
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Ảnh hiện tại</label>
                <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                      <img
                        src={item.imageUrl || '/no-image.png'}
                        alt="Current"
                        className="w-10 h-10 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/no-image.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200">Ảnh hiện tại</div>
                      <div className="text-xs text-gray-400">Không thể thay đổi ảnh</div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {editStep === 2 && (
          <div className="w-full">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-left w-full">
              Thông Tin Sản Phẩm Trong Kho
            </h3>
            <div className="w-full space-y-2">
              <div className="grid grid-cols-12 gap-2 sm:gap-3 text-xs text-gray-400 font-semibold mb-1 px-1">
                <span className="col-span-4">Kích thước</span>
                <span className="col-span-3">Tồn kho</span>
                <span className="col-span-3">Giá</span>
                <span className="col-span-2"></span>
              </div>
              {form.sizes.map((size, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-2 sm:gap-3 items-center bg-gray-800/50 rounded px-1 py-2`}
                >
                  <input
                    type="text"
                    value={size.title}
                    onChange={(e) => {
                      const newSizes = [...form.sizes];
                      newSizes[idx].title = e.target.value;
                      setForm({ ...form, sizes: newSizes });
                    }}
                    placeholder={`Kích thước #${idx + 1}`}
                    className="col-span-4 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-2 sm:px-4 py-2 text-xs sm:text-sm"
                    required
                    disabled={isSaving || isDeleting}
                  />
                  <input
                    type="number"
                    min="0"
                    value={size.quantity}
                    onChange={(e) => {
                      const newSizes = [...form.sizes];
                      newSizes[idx].quantity = e.target.value;
                      newSizes[idx].onHand = e.target.value;
                      setForm({ ...form, sizes: newSizes });
                    }}
                    placeholder="Tồn kho"
                    className="col-span-3 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-2 py-2 text-xs sm:text-sm"
                    required
                    disabled={isSaving || isDeleting}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    min="0"
                    value={size.price}
                    onChange={(e) => {
                      const newSizes = [...form.sizes];
                      newSizes[idx].price = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, sizes: newSizes });
                    }}
                    placeholder="Giá"
                    className="col-span-3 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-2 py-2 text-xs sm:text-sm"
                    required
                    disabled={isSaving || isDeleting}
                  />
                  {form.sizes.length > 1 && (
                    <button
                      type="button"
                      className="col-span-2 text-red-400 hover:text-red-600 px-1 sm:px-2 py-1 rounded text-xs sm:text-sm"
                      onClick={() => {
                        setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) });
                      }}
                      title="Xoá kích thước"
                      disabled={isSaving || isDeleting}
                    >
                      Xoá
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm sm:text-base disabled:opacity-50"
                onClick={() => {
                  setForm({
                    ...form,
                    sizes: [
                      ...form.sizes,
                      {
                        title: '',
                        quantity: '',
                        onHand: '',
                        price: '',
                      },
                    ],
                  });
                }}
                disabled={isSaving || isDeleting}
              >
                Thêm kích thước mới
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end w-full mt-4 sm:mt-6 space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Delete Button */}
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(true)}
            type="button"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {isDeleting ? 'Đang xoá...' : 'Xoá'}
          </Button>

          {/* Navigation Buttons */}
          {editStep === 2 && (
            <Button
              variant="secondary"
              onClick={() => setEditStep(1)}
              type="button"
              className="w-full sm:w-auto"
              disabled={isSaving || isDeleting}
            >
              Quay lại
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setEditModalOpen(false)}
            type="button"
            className="w-full sm:w-auto"
            disabled={isSaving || isDeleting}
          >
            Huỷ
          </Button>

          {editStep === 1 && (
            <Button
              variant="primary"
              type="button"
              onClick={() => setEditStep(2)}
              disabled={!form.name.trim() || isSaving || isDeleting}
              className="w-full sm:w-auto"
            >
              Tiếp tục
            </Button>
          )}

          {editStep === 2 && (
            <Button
              variant="primary"
              type="button"
              disabled={
                form.sizes.length < 1 ||
                form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price) ||
                isSaving ||
                isDeleting
              }
              onClick={handleSave}
              className="w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Xác nhận xoá</h3>
            <p className="text-gray-300 mb-6 text-center">
              Bạn có chắc chắn muốn xoá sản phẩm &quot;{item.name}&quot;? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={isDeleting}
              >
                Huỷ
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {isDeleting ? 'Đang xoá...' : 'Xoá sản phẩm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryEditModal;
