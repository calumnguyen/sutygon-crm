import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Package, Plus, Trash2, Edit3 } from 'lucide-react';
import { OrderItem } from './types';

interface ReturnDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrderDate: Date;
  currentReturnDate: Date;
  orderItems: OrderItem[];
  onUpdateExtensions: (extensions: OrderItem[]) => Promise<void>;
}

interface ExtensionFormData {
  extraDays: number;
  feeType: 'vnd' | 'percent';
  extraFee: string;
  percent: string;
}

const ReturnDateModal: React.FC<ReturnDateModalProps> = ({
  isOpen,
  onClose,
  currentOrderDate,
  currentReturnDate,
  orderItems,
  onUpdateExtensions,
}) => {
  const [extensions, setExtensions] = useState<OrderItem[]>([]);
  const [showAddExtension, setShowAddExtension] = useState(false);
  const [editingExtension, setEditingExtension] = useState<OrderItem | null>(null);
  const [extensionForm, setExtensionForm] = useState<ExtensionFormData>({
    extraDays: 0,
    feeType: 'vnd',
    extraFee: '',
    percent: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>('');

  // Calculate total rental days including extensions
  const calculateTotalDays = (startDate: Date, endDate: Date) => {
    const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
    const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // For rental periods, we count both start and end dates
    // So if start date is Aug 30 and end date is Sep 1, that's 3 days (Aug 30, Aug 31, Sep 1)
    return diffDays + 1;
  };

  // Use the same order date that the main view is using
  const getOrderDate = () => {
    return currentOrderDate instanceof Date ? currentOrderDate : new Date(currentOrderDate);
  };

  const calculateCorrectReturnDate = () => {
    // Use the same logic as OrderDatesSection to calculate the correct return date
    const totalExtraDays = orderItems
      .filter((item) => item.isExtension)
      .reduce((sum, ext) => sum + (ext.extraDays || 0), 0);
    const orderDate = getOrderDate();
    const returnDate = new Date(orderDate);
    returnDate.setDate(orderDate.getDate() + 2 + totalExtraDays); // Base 3 days (add 2) + extensions
    return returnDate;
  };

  // Calculate new return date based on extensions
  const calculateNewReturnDate = () => {
    const totalExtraDays = extensions.reduce((sum, ext) => sum + (ext.extraDays || 0), 0);
    const orderDate = getOrderDate();
    const newReturnDate = new Date(orderDate);
    newReturnDate.setDate(orderDate.getDate() + 2 + totalExtraDays); // Base 3 days + extensions
    return newReturnDate;
  };

  // Calculate subtotal (excluding extensions)
  const subtotal = orderItems
    .filter((item) => !item.isExtension)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);

  // Format date for display
  const formatDate = (date: Date) => {
    const dateObj = new Date(date);
    // Convert to Vietnam time (UTC+7) - same as OrderDatesSection
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
    const vietnamDate = new Date(dateObj.getTime() + vietnamOffset);

    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[vietnamDate.getDay()];
    const formattedDate = vietnamDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dayName}, ${formattedDate}`;
  };

  // Initialize extensions when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentExtensions = orderItems.filter((item) => item.isExtension);
      setExtensions(currentExtensions);
      setError('');
    }
  }, [isOpen, orderItems]);

  // Calculate extension price
  const calculateExtensionPrice = (form: ExtensionFormData) => {
    if (form.feeType === 'vnd') {
      return Number(form.extraFee) || 0;
    } else {
      return Math.round(subtotal * ((Number(form.percent) || 0) / 100));
    }
  };

  const handleAddExtension = () => {
    if (extensionForm.extraDays < 1) {
      setError('Số ngày gia hạn phải lớn hơn 0');
      return;
    }

    if (
      extensionForm.feeType === 'vnd' &&
      (!extensionForm.extraFee || Number(extensionForm.extraFee) < 0)
    ) {
      setError('Vui lòng nhập phụ phí gia hạn');
      return;
    }

    if (
      extensionForm.feeType === 'percent' &&
      (!extensionForm.percent || Number(extensionForm.percent) < 0)
    ) {
      setError('Vui lòng nhập phần trăm phụ phí');
      return;
    }

    const newExtension: OrderItem = {
      id: Date.now(), // Temporary ID
      orderId: 0, // Will be set when creating the extension
      name: `Gia hạn thời gian thuê - ${extensionForm.extraDays} ngày`,
      size: '',
      quantity: 1,
      price: calculateExtensionPrice(extensionForm),
      isExtension: true,
      extraDays: extensionForm.extraDays,
      feeType: extensionForm.feeType,
      percent: extensionForm.feeType === 'percent' ? Number(extensionForm.percent) : undefined,
      isCustom: false,
      inventoryItemId: null,
      imageUrl: undefined,
      formattedId: null,
      pickedUpQuantity: 0,
      warning: undefined,
      warningResolved: false,
      noteNotComplete: 0,
      pickupHistory: [],
    };

    if (editingExtension) {
      // Update existing extension
      setExtensions((prev) =>
        prev.map((ext) => (ext.id === editingExtension.id ? { ...newExtension, id: ext.id } : ext))
      );
      setEditingExtension(null);
    } else {
      // Add new extension
      setExtensions((prev) => [...prev, newExtension]);
    }

    // Reset form
    setExtensionForm({
      extraDays: 0,
      feeType: 'vnd',
      extraFee: '',
      percent: '',
    });
    setShowAddExtension(false);
    setError('');
  };

  const handleEditExtension = (extension: OrderItem) => {
    setEditingExtension(extension);
    setExtensionForm({
      extraDays: extension.extraDays || 0,
      feeType: (extension.feeType as 'vnd' | 'percent') || 'vnd',
      extraFee: extension.feeType === 'vnd' ? String(extension.price) : '',
      percent: extension.feeType === 'percent' ? String(extension.percent || '') : '',
    });
    setShowAddExtension(true);
  };

  const handleRemoveExtension = (extensionId: number) => {
    setExtensions((prev) => prev.filter((ext) => ext.id !== extensionId));
  };

  const handleSubmit = async () => {
    setIsUpdating(true);
    setError('');

    try {
      await onUpdateExtensions(extensions);
      onClose();
    } catch (err) {
      setError('Có lỗi xảy ra khi cập nhật gia hạn');
      console.error('Error updating extensions:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const newReturnDate = calculateNewReturnDate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl shadow-2xl border border-gray-700 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>

        <div className="text-xl font-bold text-green-400 mb-4">Quản lý ngày trả và gia hạn</div>

        {/* Current Information */}
        <div className="mb-6 space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-2">Thông tin hiện tại</div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm">Ngày thuê: {formatDate(getOrderDate())}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">Ngày trả: {formatDate(currentReturnDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm">
                Tổng thời gian: {calculateTotalDays(getOrderDate(), currentReturnDate)} ngày
              </span>
            </div>
          </div>
        </div>

        {/* Extensions List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Danh sách gia hạn</h3>
            <button
              onClick={() => {
                setShowAddExtension(true);
                setEditingExtension(null);
                setExtensionForm({
                  extraDays: 0,
                  feeType: 'vnd',
                  extraFee: '',
                  percent: '',
                });
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm gia hạn
            </button>
          </div>

          {extensions.length > 0 ? (
            <div className="space-y-2">
              {extensions.map((extension) => (
                <div
                  key={extension.id}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-medium">{extension.name}</div>
                      <div className="text-sm text-gray-400">
                        Phí: {extension.price.toLocaleString('vi-VN')} đ
                        {extension.feeType === 'percent' && extension.percent && (
                          <span className="ml-2">({extension.percent}% của tổng đơn)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditExtension(extension)}
                        className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveExtension(extension.id)}
                        className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">Chưa có gia hạn nào</div>
          )}
        </div>

        {/* Add/Edit Extension Form */}
        {showAddExtension && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-600">
            <h4 className="text-white font-medium mb-3">
              {editingExtension ? 'Chỉnh sửa gia hạn' : 'Thêm gia hạn mới'}
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Số ngày gia hạn</label>
                <input
                  type="number"
                  min="1"
                  value={extensionForm.extraDays}
                  onChange={(e) =>
                    setExtensionForm((prev) => ({ ...prev, extraDays: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Nhập số ngày gia hạn"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Loại phí</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={extensionForm.feeType === 'vnd'}
                      onChange={() => setExtensionForm((prev) => ({ ...prev, feeType: 'vnd' }))}
                    />
                    <span className="text-sm text-white">VND</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={extensionForm.feeType === 'percent'}
                      onChange={() => setExtensionForm((prev) => ({ ...prev, feeType: 'percent' }))}
                    />
                    <span className="text-sm text-white">%</span>
                  </label>
                </div>
              </div>

              {extensionForm.feeType === 'vnd' ? (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Phụ phí (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={extensionForm.extraFee}
                    onChange={(e) =>
                      setExtensionForm((prev) => ({ ...prev, extraFee: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập phụ phí gia hạn"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Phần trăm (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={extensionForm.percent}
                    onChange={(e) =>
                      setExtensionForm((prev) => ({ ...prev, percent: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập phần trăm phụ phí"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAddExtension}
                  className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  {editingExtension ? 'Cập nhật' : 'Thêm'}
                </button>
                <button
                  onClick={() => {
                    setShowAddExtension(false);
                    setEditingExtension(null);
                    setExtensionForm({
                      extraDays: 0,
                      feeType: 'vnd',
                      extraFee: '',
                      percent: '',
                    });
                  }}
                  className="flex-1 px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Return Date Preview */}
        <div className="mb-6 bg-gray-800 rounded-lg p-3">
          <div className="text-sm text-gray-400 mb-2">Thông tin mới</div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm">Ngày trả mới: {formatDate(newReturnDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm">
              Tổng thời gian: {calculateTotalDays(getOrderDate(), newReturnDate)} ngày
            </span>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium"
          >
            {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnDateModal;
