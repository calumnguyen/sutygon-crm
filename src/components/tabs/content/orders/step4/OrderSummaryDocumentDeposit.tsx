import React, { useState, useEffect } from 'react';
import { OrderItem } from '../types';
import { DiscountModal } from './DiscountModal';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import { useUser } from '@/context/UserContext';

interface Discount {
  id: number;
  discountType: 'vnd' | 'percent';
  discountValue: number;
  discountAmount: number;
  itemizedName: string;
  description: string;
  requestedByUserId?: number;
  authorizedByUserId?: number;
}

/**
 * Document & deposit card for step 4 summary.
 * @param orderItems Array of order items
 * @param setDepositInfo Callback to set deposit info in parent
 * @param setDocumentInfo Callback to set document info in parent
 * @param setDiscounts Callback to set discounts in parent
 * @param discounts Current discounts
 * @param isPaymentSubmitted Whether the payment is completed
 */
export const OrderSummaryDocumentDeposit: React.FC<{
  orderItems?: OrderItem[];
  setDepositInfo?: (info: { type: 'vnd' | 'percent'; value: number } | null) => void;
  setDocumentInfo?: (
    info: {
      documentType: string;
      documentOther?: string;
      documentName: string;
      documentId: string;
    } | null
  ) => void;
  setDiscounts?: (discounts: Discount[]) => void;
  discounts?: Discount[];
  isPaymentSubmitted?: boolean;
  orderId?: string;
}> = ({
  orderItems = [],
  setDepositInfo,
  setDocumentInfo,
  setDiscounts,
  discounts = [],
  isPaymentSubmitted,
  orderId,
}) => {
  const [showModal, setShowModal] = useState<'doc' | 'deposit' | 'discount' | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [pendingDiscountData, setPendingDiscountData] = useState<{
    discountType: 'vnd' | 'percent';
    discountValue: number;
    itemizedNameId: number;
    description: string;
  } | null>(null);
  const { currentUser } = useUser();
  const [docType, setDocType] = useState('');
  const [docOther, setDocOther] = useState('');
  const [docName, setDocName] = useState('');
  const [docId, setDocId] = useState('');
  const [touched, setTouched] = useState(false);
  const [info, setInfo] = useState<null | {
    docType: string;
    docOther?: string;
    docName: string;
    docId: string;
  }>(null);
  const [depositType, setDepositType] = useState<'vnd' | 'percent'>('vnd');
  const [depositValue, setDepositValue] = useState('');
  const [depositTouched, setDepositTouched] = useState(false);
  const [depositInfo, setLocalDepositInfo] = useState<null | {
    type: 'vnd' | 'percent';
    value: number;
  }>(null);
  useEffect(() => {
    if (setDepositInfo) setDepositInfo(depositInfo);
  }, [depositInfo, setDepositInfo]);

  useEffect(() => {
    if (setDocumentInfo) {
      console.log('=== OrderSummaryDocumentDeposit Debug ===');
      console.log('info:', info);
      if (info) {
        const documentInfoToSet = {
          documentType: info.docType,
          documentOther: info.docOther,
          documentName: info.docName,
          documentId: info.docId,
        };
        console.log('Setting documentInfo:', documentInfoToSet);
        setDocumentInfo(documentInfoToSet);
      } else {
        console.log('Setting documentInfo to null');
        setDocumentInfo(null);
      }
    }
  }, [info, setDocumentInfo]);
  const docTypeOptions = [
    'Căn Cước',
    'Giấy Phép Lái Xe',
    'Thẻ Đảng Viên',
    'Giấy tờ có giá trị pháp lý khác',
  ];
  const subtotal = orderItems
    .filter((i) => !i.isExtension)
    .reduce((sum, i) => sum + i.quantity * i.price, 0);
  const handleOpenDoc = () => {
    setShowModal('doc');
    setTouched(false);
  };
  const handleCloseDoc = () => {
    setShowModal(null);
    setTouched(false);
  };
  const handleSubmitDoc = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (
      !docType ||
      !docName.trim() ||
      !docId.trim() ||
      (docType === 'Giấy tờ có giá trị pháp lý khác' && !docOther.trim())
    )
      return;
    setInfo({
      docType,
      docOther: docType === 'Giấy tờ có giá trị pháp lý khác' ? docOther : undefined,
      docName,
      docId,
    });
    setShowModal(null);
  };
  const isOther = docType === 'Giấy tờ có giá trị pháp lý khác';
  const isDocValid = docType && docName.trim() && docId.trim() && (!isOther || docOther.trim());
  const handleOpenDeposit = () => {
    setShowModal('deposit');
    setDepositTouched(false);
  };
  const handleCloseDeposit = () => {
    setShowModal(null);
    setDepositTouched(false);
  };
  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositTouched(true);
    const valueNum = Number(depositValue);
    if (depositType === 'vnd' && (!depositValue || isNaN(valueNum) || valueNum <= 0)) return;
    if (
      depositType === 'percent' &&
      (!depositValue || isNaN(valueNum) || valueNum <= 0 || valueNum > 100)
    )
      return;
    setLocalDepositInfo({ type: depositType, value: valueNum });
    setShowModal(null);
  };
  const isDepositValid =
    depositType === 'vnd'
      ? depositValue && !isNaN(Number(depositValue)) && Number(depositValue) > 0
      : depositValue &&
        !isNaN(Number(depositValue)) &&
        Number(depositValue) > 0 &&
        Number(depositValue) <= 100;
  const depositDisplay = depositInfo
    ? depositInfo.type === 'vnd'
      ? `${depositInfo.value.toLocaleString('vi-VN')} đ`
      : `${Math.round(subtotal * (depositInfo.value / 100)).toLocaleString('vi-VN')} đ (${depositInfo.value}% của đơn hàng)`
    : '';
  const handleClearDeposit = () => {
    setLocalDepositInfo(null);
  };

  // Discount handlers
  const handleOpenDiscount = () => {
    setShowModal('discount');
  };

  const handleCloseDiscount = () => {
    setShowModal(null);
  };

  const handleSubmitDiscount = (discountData: {
    discountType: 'vnd' | 'percent';
    discountValue: number;
    itemizedNameId: number;
    description: string;
  }) => {
    setPendingDiscountData(discountData);
    setShowIdentityModal(true);
  };

  const handleIdentitySuccess = async (user: {
    id: number;
    name: string;
    employeeKey: string;
    role: string;
    status: string;
  }) => {
    try {
      const discountAmount =
        pendingDiscountData!.discountType === 'vnd'
          ? pendingDiscountData!.discountValue
          : Math.round(subtotal * (pendingDiscountData!.discountValue / 100));

      // If order doesn't exist yet, add to local state
      if (!orderId || orderId === '0000-A') {
        if (setDiscounts) {
          // Fetch the itemized name for display
          try {
            const itemizedNamesResponse = await fetch('/api/discount-itemized-names');
            const itemizedNamesData = await itemizedNamesResponse.json();
            const itemizedName =
              itemizedNamesData.itemizedNames?.find(
                (item: { id: number; name: string }) =>
                  item.id === pendingDiscountData!.itemizedNameId
              )?.name || 'Unknown';

            const newDiscount: Discount = {
              id: Date.now(), // Temporary ID for local state
              discountType: pendingDiscountData!.discountType,
              discountValue: pendingDiscountData!.discountValue,
              discountAmount,
              itemizedName,
              description: pendingDiscountData!.description,
              requestedByUserId: user.id, // The user approving is also the one requesting
              authorizedByUserId: user.id,
            };
            setDiscounts([...discounts, newDiscount]);
          } catch (error) {
            console.error('Error fetching itemized name:', error);
            // Fallback with temporary name
            const newDiscount: Discount = {
              id: Date.now(),
              discountType: pendingDiscountData!.discountType,
              discountValue: pendingDiscountData!.discountValue,
              discountAmount,
              itemizedName: 'Temporary',
              description: pendingDiscountData!.description,
              requestedByUserId: user.id, // The user approving is also the one requesting
              authorizedByUserId: user.id,
            };
            setDiscounts([...discounts, newDiscount]);
          }
        }
      } else {
        // Order exists, save to database
        const response = await fetch(`/api/orders/${orderId}/discount`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentUser,
            ...pendingDiscountData,
            discountAmount,
            authorizedByUserId: user.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && setDiscounts) {
            // Refresh discounts
            const discountResponse = await fetch(`/api/orders/${orderId}/discounts`);
            if (discountResponse.ok) {
              const discountResult = await discountResponse.json();
              if (discountResult.success) {
                setDiscounts(discountResult.discounts);
              }
            }
          }
        } else {
          console.error('Failed to add discount');
        }
      }
    } catch (error) {
      console.error('Error adding discount:', error);
    } finally {
      setPendingDiscountData(null);
      setShowIdentityModal(false);
    }
  };

  const handleClearDiscount = async (discountId: number) => {
    try {
      // If order exists, call API to remove discount
      if (orderId !== '0000-A') {
        const response = await fetch(`/api/orders/${orderId}/discount/${discountId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove discount');
        }
      }

      // Remove discount from local state
      if (setDiscounts) {
        setDiscounts(discounts.filter((d) => d.id !== discountId));
      }
    } catch (error) {
      console.error('Error removing discount:', error);
      // You might want to show a toast notification here
    }
  };
  return (
    <div className="bg-gray-800 rounded-lg p-3 shadow flex flex-col gap-3">
      <div className="text-base font-bold text-cyan-400 mb-1 text-left">Giấy Tờ & Đặt Cọc</div>
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded transition-colors cursor-pointer group hover:bg-cyan-900/30 px-1 py-1"
          onClick={isPaymentSubmitted ? undefined : handleOpenDoc}
        >
          <input
            type="checkbox"
            id="can-cuoc"
            className="accent-cyan-500 w-4 h-4 cursor-pointer"
            checked={!!info}
            readOnly
            tabIndex={-1}
            disabled={isPaymentSubmitted}
          />
          <label
            htmlFor="can-cuoc"
            className={`text-white font-medium select-none cursor-pointer text-sm group-hover:text-cyan-300 ${isPaymentSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Giấy Tờ
          </label>
        </div>
        {info && (
          <div className="ml-6 mt-1 px-2 py-1 rounded border border-cyan-500 bg-cyan-900/30 text-xs text-cyan-200 flex flex-col gap-0.5 relative">
            {!isPaymentSubmitted && (
              <button
                type="button"
                className="absolute top-1 right-1 text-xs text-red-300 hover:text-red-500 px-2 py-0.5 rounded focus:outline-none"
                onClick={() => setInfo(null)}
                title="Huỷ thông tin giấy tờ"
              >
                Huỷ
              </button>
            )}
            <span>
              {info.docType}
              {info.docOther ? ` (${info.docOther})` : ''}
            </span>
            <span>
              {info.docName} - {info.docId}
            </span>
          </div>
        )}
        <div
          className="flex items-center gap-2 rounded transition-colors cursor-pointer group hover:bg-yellow-900/30 px-1 py-1"
          onClick={isPaymentSubmitted ? undefined : handleOpenDeposit}
        >
          <input
            type="checkbox"
            id="coc-tien"
            className="accent-yellow-500 w-4 h-4 cursor-pointer"
            checked={!!depositInfo}
            readOnly
            tabIndex={-1}
            disabled={isPaymentSubmitted}
          />
          <label
            htmlFor="coc-tien"
            className={`text-white font-medium select-none text-sm group-hover:text-yellow-300 ${isPaymentSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Cọc Tiền
          </label>
        </div>
        {depositInfo && (
          <div className="ml-6 mt-1 px-2 py-1 rounded border border-yellow-500 bg-yellow-900/20 text-xs text-yellow-200 flex flex-col gap-0.5 relative">
            {!isPaymentSubmitted && (
              <button
                type="button"
                className="absolute top-1 right-1 text-xs text-red-300 hover:text-red-500 px-2 py-0.5 rounded focus:outline-none"
                onClick={handleClearDeposit}
                title="Huỷ thông tin cọc tiền"
              >
                Huỷ
              </button>
            )}
            <span>{depositDisplay}</span>
          </div>
        )}

        {/* Discount Section */}
        <div
          className="flex items-center gap-2 rounded transition-colors cursor-pointer group hover:bg-green-900/30 px-1 py-1"
          onClick={isPaymentSubmitted ? undefined : handleOpenDiscount}
        >
          <input
            type="checkbox"
            id="giam-gia"
            className="accent-green-500 w-4 h-4 cursor-pointer"
            checked={discounts.length > 0}
            readOnly
            tabIndex={-1}
            disabled={isPaymentSubmitted}
          />
          <label
            htmlFor="giam-gia"
            className={`text-white font-medium select-none text-sm group-hover:text-green-300 ${isPaymentSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Giảm Giá
          </label>
        </div>
        {discounts.length > 0 && (
          <div className="ml-6 mt-1 space-y-2">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className="px-2 py-1 rounded border border-green-500 bg-green-900/20 text-xs text-green-200 flex flex-col gap-0.5 relative"
              >
                {!isPaymentSubmitted && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 text-xs text-red-300 hover:text-red-500 px-2 py-0.5 rounded focus:outline-none"
                    onClick={() => handleClearDiscount(discount.id)}
                    title="Huỷ giảm giá"
                  >
                    Huỷ
                  </button>
                )}
                <span className="font-semibold">{discount.itemizedName}</span>
                <span>
                  -{discount.discountAmount.toLocaleString('vi-VN')} đ
                  {discount.discountType === 'percent' && (
                    <span className="text-blue-200"> ({discount.discountValue}% của đơn hàng)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal === 'doc' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseDoc}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={handleCloseDoc}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-cyan-400 mb-4">Cọc Giấy Tờ Tuỳ Thân</div>
            <form className="w-full flex flex-col gap-4" onSubmit={handleSubmitDoc}>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Loại giấy tờ <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  required
                >
                  <option value="">Chọn loại giấy tờ</option>
                  {docTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {touched && !docType && <div className="text-xs text-red-400 mt-1">Bắt buộc</div>}
              </div>
              {isOther && (
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Tên giấy tờ <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                    value={docOther}
                    onChange={(e) => setDocOther(e.target.value)}
                    required={isOther}
                  />
                  {touched && !docOther && (
                    <div className="text-xs text-red-400 mt-1">Bắt buộc</div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Tên trên giấy tờ <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                />
                {touched && !docName && <div className="text-xs text-red-400 mt-1">Bắt buộc</div>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Số giấy tờ <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  required
                />
                {touched && !docId && <div className="text-xs text-red-400 mt-1">Bắt buộc</div>}
              </div>
              <button
                type="submit"
                className="mt-2 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-base disabled:opacity-60"
                disabled={!isDocValid}
              >
                Xác nhận
              </button>
            </form>
          </div>
        </div>
      )}
      {showModal === 'deposit' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseDeposit}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={handleCloseDeposit}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-xl font-bold text-yellow-400 mb-4">Cọc Tiền</div>
            <form className="w-full flex flex-col gap-4" onSubmit={handleSubmitDeposit}>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Hình thức đặt cọc <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as 'vnd' | 'percent')}
                  required
                >
                  <option value="vnd">Số tiền cố định (VND)</option>
                  <option value="percent">Phần trăm của đơn hàng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {depositType === 'vnd' ? 'Số tiền đặt cọc (VND)' : 'Phần trăm của đơn hàng (%)'}{' '}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
                  type="number"
                  min={1}
                  max={depositType === 'percent' ? 100 : undefined}
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                  required
                />
                {depositTouched &&
                  (!depositValue ||
                    isNaN(Number(depositValue)) ||
                    Number(depositValue) <= 0 ||
                    (depositType === 'percent' && Number(depositValue) > 100)) && (
                    <div className="text-xs text-red-400 mt-1">Bắt buộc</div>
                  )}
              </div>
              <button
                type="submit"
                className="mt-2 px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-base disabled:opacity-60"
                disabled={!isDepositValid}
              >
                Xác nhận
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      <DiscountModal
        show={showModal === 'discount'}
        onClose={handleCloseDiscount}
        onSubmit={handleSubmitDiscount}
        subtotal={subtotal}
        currentTotalDiscount={discounts.reduce((sum, discount) => sum + discount.discountAmount, 0)}
      />

      {/* Identity Confirmation Modal */}
      <IdentityConfirmModal
        open={showIdentityModal}
        onClose={() => {
          setShowIdentityModal(false);
          setPendingDiscountData(null);
        }}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
      />
    </div>
  );
};
