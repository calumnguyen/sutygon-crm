import React from 'react';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { parseTags } from './InventoryUtils';
import { AddItemFormState } from './InventoryTypes';

interface AddItemStep1Props {
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
}

const AddItemStep1: React.FC<AddItemStep1Props> = ({ form, setForm }) => {
  const tags = parseTags(form.tagsInput);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <h3 className="text-lg font-semibold text-white mb-4 text-left w-full">Thông tin sản phẩm</h3>
      <form className="w-full space-y-5" onSubmit={(e) => e.preventDefault()}>
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
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-4 py-2"
            required
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
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-4 py-2"
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
            className="mt-1 block w-full rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-4 py-2"
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
          <button
            type="button"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition mb-2"
            onClick={() => photoInputRef.current?.click()}
          >
            Tải ảnh lên
          </button>
          <input
            ref={photoInputRef}
            id="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setForm({ ...form, photoFile: e.target.files?.[0] || null })}
          />
          {form.photoFile && (
            <div className="text-xs text-gray-400 mt-1 truncate">{form.photoFile.name}</div>
          )}
        </div>
      </form>
    </>
  );
};

export default AddItemStep1;
