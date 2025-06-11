import React from 'react';
import { MAX_SIZES } from './InventoryConstants';
import { formatNumberWithCommas } from './InventoryUtils';
import { AddItemFormState } from './InventoryTypes';

interface AddItemStep2Props {
  form: AddItemFormState;
  setForm: (form: AddItemFormState) => void;
}

const AddItemStep2: React.FC<AddItemStep2Props> = ({ form, setForm }) => {
  const handleSizeChange = (idx: number, field: 'title' | 'quantity' | 'price', value: string) => {
    const newSizes = [...form.sizes];
    newSizes[idx][field] = value;
    // If quantity is changed, update onHand to match
    if (field === 'quantity') {
      newSizes[idx].onHand = value;
    }
    setForm({ ...form, sizes: newSizes });
  };

  const handlePriceChange = (idx: number, value: string) => {
    // Remove commas and non-numeric chars for storage
    const rawValue = value.replace(/\D/g, '');
    let newSamePrice = form.samePrice;
    if (form.samePrice && idx > 0 && rawValue !== form.sizes[0].price) {
      newSamePrice = false;
    }
    const newSizes = [...form.sizes];
    newSizes[idx].price = rawValue;
    // If samePrice is true and this is the first size, update all
    if (form.samePrice && idx === 0) {
      for (let i = 0; i < newSizes.length; i++) {
        newSizes[i].price = rawValue;
      }
    }
    setForm({ ...form, sizes: newSizes, samePrice: newSamePrice });
  };

  const sizeRows = form.sizes.map((size, idx) => (
    <div
      key={idx}
      className={`grid grid-cols-12 gap-3 items-center bg-gray-800/50 rounded px-1 py-2 row-${idx}`}
      data-idx={idx}
    >
      <span className="sr-only">Row {idx + 1}</span>
      <span style={{ display: 'none' }}>{idx}</span>
      <input
        type="text"
        value={size.title}
        onChange={(e) => handleSizeChange(idx, 'title', e.target.value)}
        placeholder={`Kích thước #${idx + 1}`}
        className="col-span-4 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-4 py-2"
        required
      />
      <input
        type="number"
        min="0"
        value={size.quantity}
        onChange={(e) => handleSizeChange(idx, 'quantity', e.target.value)}
        placeholder="Tồn kho"
        className="col-span-3 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-2 py-2"
        required
      />
      <input
        type="text"
        inputMode="numeric"
        min="0"
        value={formatNumberWithCommas(size.price)}
        onChange={(e) => handlePriceChange(idx, e.target.value)}
        placeholder="Giá"
        className="col-span-3 rounded-lg border bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition px-2 py-2"
        required
      />
      {form.sizes.length > 1 && (
        <button
          type="button"
          className="col-span-2 text-red-400 hover:text-red-600 px-2 py-1 rounded"
          onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) })}
          title="Xoá kích thước"
        >
          Xoá
        </button>
      )}
    </div>
  ));

  return (
    <>
      <h3 className="text-lg font-semibold text-white mb-4 text-left w-full">
        Thông Tin Sản Phẩm Trong Kho
      </h3>
      <div className="w-full mb-3 flex items-center gap-2">
        <input
          id="samePrice"
          type="checkbox"
          checked={form.samePrice}
          onChange={(e) => {
            const checked = e.target.checked;
            let newSizes = form.sizes;
            if (checked && form.sizes.length > 0) {
              newSizes = form.sizes.map((s, idx) => ({ ...s, price: form.sizes[0].price }));
            }
            setForm({ ...form, samePrice: checked, sizes: newSizes });
          }}
          className="accent-blue-600 w-4 h-4"
        />
        <label htmlFor="samePrice" className="text-sm text-gray-200 select-none cursor-pointer">
          Tất cả kích thước có cùng giá
        </label>
      </div>
      <div className="w-full space-y-2">
        <div className="grid grid-cols-12 gap-3 text-xs text-gray-400 font-semibold mb-1 px-1">
          <span className="col-span-4">Kích thước</span>
          <span className="col-span-3">Tồn kho</span>
          <span className="col-span-3">Giá</span>
          <span className="col-span-2"></span>
        </div>
        {sizeRows}
        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          onClick={() => {
            if (form.sizes.length < MAX_SIZES) {
              setForm({
                ...form,
                sizes: [
                  ...form.sizes,
                  {
                    title: '',
                    quantity: '',
                    onHand: '',
                    price: form.samePrice && form.sizes.length > 0 ? form.sizes[0].price : '',
                  },
                ],
              });
            }
          }}
          disabled={form.sizes.length >= MAX_SIZES}
        >
          Thêm kích thước mới
        </button>
      </div>
    </>
  );
};

export default AddItemStep2;
