import React, { useState } from 'react';
import { formatPhoneNumber } from '@/lib/utils/phone';
import { Calendar } from 'lucide-react';
import AddCustomerModal from '../customers/AddCustomerModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale';
import { parse, format } from 'date-fns';
import OrdersNewStep3 from './OrdersNewStep3';
import OrdersNewStep4 from './OrdersNewStep4';
import { useOrderNewFlow } from './hooks';
import { OrderItem } from './types';
import { useTabContext } from '@/context/TabContext';
import { TabId, createTabId } from '@/types/tabTypes';

const steps = ['Khách Hàng', 'Chọn Ngày Thuê', 'Sản Phẩm', 'Thanh Toán'];

interface Customer {
  id: number;
  name: string;
  company?: string | null;
  phone: string;
}

const DAY_LABELS = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];

function getDayLabel(dateStr: string): string | null {
  if (!dateStr || dateStr.length !== 10) return null;
  const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
  if (isNaN(parsed.getTime())) return null;
  return DAY_LABELS[parsed.getDay()];
}

// Helper to get expected return date string and day
function getExpectedReturnDate(dateStr: string): { date: string; day: string } | null {
  const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
  if (isNaN(parsed.getTime())) return null;
  const returnDate = new Date(parsed.getTime());
  returnDate.setDate(returnDate.getDate() + 3);
  const formatted = format(returnDate, 'dd/MM/yyyy');
  return { date: formatted, day: DAY_LABELS[returnDate.getDay()] };
}

interface Note {
  id: string;
  itemId: string | null;
  text: string;
  done: boolean;
}

const OrdersNewContent: React.FC<{ tabId: string }> = ({ tabId }) => {
  const {
    currentStep,
    setCurrentStep,
    phone,
    setPhone,
    searching,
    setSearching,
    searched,
    setSearched,
    customer,
    setCustomer,
    date,
    setDate,
    showCalendarModal,
    setShowCalendarModal,
    isAddModalOpen,
    setIsAddModalOpen,
    existingPhones,
    setExistingPhones,
    prefillPhone,
    setPrefillPhone,
    handlePhoneInput,
    handlePhoneEnter,
    handleAddCustomer,
    handleOpenAddModal,
    handleCustomerSelect,
    handleDateInput,
    validateDate,
    parseDate,
    formatDateString,
  } = useOrderNewFlow();

  // LIFTED STATE: Persist order items and notes across steps
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Tab navigation
  const { removeTab, firstLevelTabs, activateTab, addFirstLevelTab } = useTabContext();

  // Handle payment success - show banner and navigate back to Orders view
  const handlePaymentSuccess = () => {
    setShowSuccessBanner(true);
    
    // After 3 seconds, navigate back to Orders view
    setTimeout(() => {
      // Find the main Orders tab (not the new order tab)
      let ordersTab = firstLevelTabs.find(tab => 
        tab.selectedOption?.id === 'orders' && !tab.id.startsWith('orders-new-')
      );
      
      if (!ordersTab) {
        // Create a new Orders tab if none exists
        const newOrdersTabId = createTabId('orders-main');
        addFirstLevelTab({
          id: newOrdersTabId,
          label: 'Đơn Hàng',
          type: 'first',
          options: [],
          isClosable: true,
          isDefault: false,
          selectedOption: { id: createTabId('orders'), label: 'Đơn Hàng' },
        });
        ordersTab = { id: newOrdersTabId } as any;
      }
      
      if (ordersTab) {
        // Activate the Orders tab
        activateTab(ordersTab.id);
      }
      
      // Remove the current new order tab
      removeTab(createTabId(tabId));
    }, 3000);
  };

  return (
    <div className="p-6">
      {showSuccessBanner && (
        <div className="mb-6 px-6 py-4 rounded-lg bg-green-600 text-white text-lg font-semibold shadow-lg flex items-center justify-center border border-green-400">
          <div className="text-center">
            <div className="text-xl font-bold mb-1">🎉 Thanh toán thành công!</div>
            <div className="text-green-100">Đơn hàng đã được xử lý. Đang chuyển về trang Đơn Hàng...</div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Thêm Đơn Mới</h1>
      </div>
      <div className="mb-4 text-gray-400 text-sm flex items-center gap-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <span className={idx === currentStep ? 'text-blue-400 font-semibold' : 'text-gray-400'}>
              {step}
            </span>
            {idx < steps.length - 1 && <span className="mx-1">&gt;</span>}
          </React.Fragment>
        ))}
      </div>
      {currentStep === 3 ? (
        <OrdersNewStep4
          customer={customer}
          date={date}
          orderItems={orderItems}
          notes={notes}
          setCurrentStep={setCurrentStep}
          createdOrderId={createdOrderId}
          onPaymentSuccess={handlePaymentSuccess}
        />
      ) : currentStep >= 2 && validateDate(date) && searched && customer ? (
        <OrdersNewStep3
          customer={customer}
          date={date}
          setDate={setDate}
          setCurrentStep={setCurrentStep}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          notes={notes}
          setNotes={setNotes}
          setCreatedOrderId={setCreatedOrderId}
        />
      ) : (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden min-h-[200px] flex items-center gap-8 transition-all duration-500 justify-center">
          {/* Step 1 & 2: original search and date picking UI (no compact rent date box) */}
          <>
            <div
              className={`flex flex-col items-center gap-6 transition-all duration-500 ${currentStep === 1 ? 'translate-x-[-120px] opacity-80' : ''}`}
              style={{ minWidth: 340 }}
            >
              <span className="text-lg text-white font-semibold transition-all duration-300">
                {currentStep === 0 ? 'Nhập số điện thoại khách hàng' : 'Chọn ngày thuê đồ'}
              </span>
              {currentStep === 0 ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formatPhoneNumber(phone)}
                  onChange={handlePhoneInput}
                  onKeyDown={handlePhoneEnter}
                  placeholder="Nhập số điện thoại"
                  className="w-full max-w-md text-2xl px-6 py-4 rounded-lg bg-gray-900 border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-white placeholder-gray-500"
                  disabled={searching}
                />
              ) : (
                <div className="flex items-center gap-2 w-full max-w-md relative">
                  <input
                    type="text"
                    value={date}
                    onChange={handleDateInput}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    className={`w-full text-2xl px-6 py-4 rounded-lg bg-gray-900 border-2 ${
                      date.length === 10
                        ? validateDate(date)
                          ? 'border-green-500'
                          : 'border-red-500'
                        : 'border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-white placeholder-gray-500`}
                  />
                  <button
                    className="p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    title="Chọn ngày"
                    type="button"
                    onClick={() => setShowCalendarModal(true)}
                  >
                    <Calendar className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    className="ml-2 px-3 py-2 rounded bg-gray-700 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                    onClick={() => {
                      const today = new Date();
                      setDate(formatDateString(today));
                    }}
                  >
                    Hôm nay
                  </button>
                </div>
              )}
            </div>
            {searched && customer && (
              <div
                className={`flex flex-col items-center gap-4 min-w-[320px] transition-all duration-500 ${
                  currentStep === 0 ? 'animate-fade-in' : 'translate-x-[120px]'
                }`}
              >
                <div
                  className={`bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-700 w-full ${
                    currentStep === 0 ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''
                  }`}
                  onClick={currentStep === 0 ? handleCustomerSelect : undefined}
                >
                  <div className="text-xl font-bold text-blue-400 mb-2">Khách hàng</div>
                  <div className="text-white text-lg mb-1">
                    Tên: <span className="font-semibold">{customer.name}</span>
                  </div>
                  {customer.company && (
                    <div className="text-gray-300 text-base mb-1">
                      Công ty: <span className="font-semibold">{customer.company}</span>
                    </div>
                  )}
                  <div className="text-gray-300 text-base">
                    Số điện thoại:{' '}
                    <span className="font-mono">{formatPhoneNumber(customer.phone)}</span>
                  </div>
                </div>
              </div>
            )}
            {searched && !customer && currentStep === 0 && (
              <div className="flex flex-col items-center gap-4 min-w-[320px] animate-fade-in">
                <div className="bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-700 w-full flex flex-col items-center">
                  <div className="text-xl font-bold text-red-400 mb-2">
                    Không tìm thấy khách hàng.
                  </div>
                  <div className="text-white text-base mb-4">
                    Thêm khách hàng mới cho số{' '}
                    <span className="font-mono text-blue-400">{formatPhoneNumber(phone)}</span>?
                  </div>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition text-lg"
                    onClick={handleOpenAddModal}
                  >
                    Thêm khách hàng này ngay
                  </button>
                </div>
              </div>
            )}
          </>
        </div>
      )}
      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddCustomer}
        existingPhones={existingPhones}
        prefillPhone={prefillPhone}
      />
      {/* Calendar Modal (moved outside main content wrapper) */}
      {showCalendarModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setShowCalendarModal(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <DatePicker
              selected={parseDate(date)}
              onChange={(d: Date | null) => {
                if (d) {
                  setDate(formatDateString(d));
                  setShowCalendarModal(false);
                }
              }}
              dateFormat="dd/MM/yyyy"
              locale={vi}
              inline
              minDate={new Date(2000, 0, 1)}
              maxDate={new Date(2100, 11, 31)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersNewContent;
