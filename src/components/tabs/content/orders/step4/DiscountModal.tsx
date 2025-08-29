import React, { useState, useEffect } from 'react';

interface DiscountItemizedName {
  id: number;
  name: string;
}

interface DiscountModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (discountData: {
    discountType: 'vnd' | 'percent';
    discountValue: number;
    itemizedNameId: number;
    description: string;
  }) => void;
  subtotal: number;
  currentTotalDiscount: number; // Add this prop to track current total discount
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  show,
  onClose,
  onSubmit,
  subtotal,
  currentTotalDiscount,
}) => {
  const [discountType, setDiscountType] = useState<'vnd' | 'percent'>('vnd');
  const [discountValue, setDiscountValue] = useState('');
  const [itemizedNameId, setItemizedNameId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [discountItemizedNames, setDiscountItemizedNames] = useState<DiscountItemizedName[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch discount itemized names
  useEffect(() => {
    if (show) {
      setLoading(true);
      fetch('/api/discount-itemized-names')
        .then((res) => res.json())
        .then((data) => {
          setDiscountItemizedNames(data.itemizedNames || []);
        })
        .catch((error) => {
          console.error('Error fetching discount itemized names:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [show]);

  const handleClose = () => {
    setDiscountType('vnd');
    setDiscountValue('');
    setItemizedNameId('');
    setDescription('');
    setTouched(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!discountValue || !itemizedNameId || !description.trim()) {
      return;
    }

    const valueNum = Number(discountValue);
    if (isNaN(valueNum) || valueNum <= 0) return;

    if (discountType === 'percent' && valueNum > 100) return;

    // Calculate the new discount amount
    const newDiscountAmount =
      discountType === 'vnd' ? valueNum : Math.round(subtotal * (valueNum / 100));

    // Check if total discount would exceed subtotal
    if (currentTotalDiscount + newDiscountAmount > subtotal) {
      return; // Don't submit if it would exceed the limit
    }

    onSubmit({
      discountType,
      discountValue: valueNum,
      itemizedNameId: Number(itemizedNameId),
      description: description.trim(),
    });

    handleClose();
  };

  const isFormValid =
    discountValue &&
    !isNaN(Number(discountValue)) &&
    Number(discountValue) > 0 &&
    (discountType !== 'percent' || Number(discountValue) <= 100) &&
    itemizedNameId &&
    description.trim() &&
    (() => {
      // Check if total discount would exceed subtotal
      const newDiscountAmount =
        discountType === 'vnd'
          ? Number(discountValue)
          : Math.round(subtotal * (Number(discountValue) / 100));
      return currentTotalDiscount + newDiscountAmount <= subtotal;
    })();

  const calculatedDiscount =
    discountValue && !isNaN(Number(discountValue)) && Number(discountValue) > 0
      ? discountType === 'vnd'
        ? Number(discountValue)
        : Math.round(subtotal * (Math.min(Number(discountValue), 100) / 100))
      : 0;

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={handleClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="text-xl font-bold text-green-400 mb-4">Thêm Giảm Giá</div>

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Loại giảm giá <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'vnd' | 'percent')}
              required
            >
              <option value="vnd">Số tiền cố định (VND)</option>
              <option value="percent">Phần trăm của đơn hàng</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              {discountType === 'vnd' ? 'Số tiền giảm giá (VND)' : 'Phần trăm giảm giá (%)'}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
              type="number"
              min={1}
              max={discountType === 'percent' ? 100 : undefined}
              value={discountValue}
              onChange={(e) => {
                const value = e.target.value;
                const numValue = Number(value);
                if (discountType === 'percent' && numValue > 100) {
                  setDiscountValue('100');
                } else {
                  setDiscountValue(value);
                }
              }}
              required
            />
            {touched &&
              (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) && (
                <div className="text-xs text-red-400 mt-1">Bắt buộc và hợp lệ</div>
              )}
            {discountType === 'percent' && discountValue && Number(discountValue) > 100 && (
              <div className="text-xs text-red-400 mt-1">
                Phần trăm giảm giá không được vượt quá 100%
              </div>
            )}
            {discountValue &&
              !isNaN(Number(discountValue)) &&
              Number(discountValue) > 0 &&
              (() => {
                const newDiscountAmount =
                  discountType === 'vnd'
                    ? Number(discountValue)
                    : Math.round(subtotal * (Number(discountValue) / 100));
                const wouldExceed = currentTotalDiscount + newDiscountAmount > subtotal;

                return (
                  <>
                    {wouldExceed && (
                      <div className="text-xs text-red-400 mt-1">
                        Tổng giảm giá ({currentTotalDiscount.toLocaleString('vi-VN')} đ +{' '}
                        {newDiscountAmount.toLocaleString('vi-VN')} đ) vượt quá tổng tiền đơn hàng (
                        {subtotal.toLocaleString('vi-VN')} đ)
                      </div>
                    )}
                    {!wouldExceed && (
                      <div className="text-xs text-green-400 mt-1">
                        Giảm giá: {calculatedDiscount.toLocaleString('vi-VN')} đ
                        {discountType === 'percent' && (
                          <span>
                            {' '}
                            ({Math.min(Number(discountValue), 100)}% của{' '}
                            {subtotal.toLocaleString('vi-VN')} đ)
                          </span>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Loại giảm giá chi tiết <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
              value={itemizedNameId}
              onChange={(e) => setItemizedNameId(e.target.value ? Number(e.target.value) : '')}
              required
              disabled={loading}
            >
              <option value="">Chọn loại giảm giá</option>
              {discountItemizedNames.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {loading && <div className="text-xs text-gray-400 mt-1">Đang tải...</div>}
            {touched && !itemizedNameId && !loading && (
              <div className="text-xs text-red-400 mt-1">Bắt buộc</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Mô tả giảm giá <span className="text-red-400">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Nhập mô tả lý do giảm giá..."
            />
            {touched && !description.trim() && (
              <div className="text-xs text-red-400 mt-1">Bắt buộc</div>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-base disabled:opacity-60"
            disabled={!isFormValid}
          >
            Xác nhận
          </button>
        </form>
      </div>
    </div>
  );
};
