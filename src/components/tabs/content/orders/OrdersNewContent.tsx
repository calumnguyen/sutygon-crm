import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '@/lib/utils/phone';
import { Calendar } from 'lucide-react';
import AddCustomerModal from '../customers/AddCustomerModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale';
import { parse, format } from 'date-fns';

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

const OrdersNewContent: React.FC<{ tabId: string }> = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [date, setDate] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [existingPhones, setExistingPhones] = useState<string[]>([]);
  const [prefillPhone, setPrefillPhone] = useState('');

  // Fetch all customer phones for validation
  useEffect(() => {
    async function fetchPhones() {
      try {
        const res = await fetch('/api/customers');
        const customers = await res.json();
        setExistingPhones(customers.map((c: Customer) => c.phone));
      } catch (err) {
        setExistingPhones([]);
      }
    }
    fetchPhones();
  }, []);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers, max 11 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setSearched(false);
    setCustomer(null);
  };

  const handlePhoneEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phone) {
      setSearching(true);
      setSearched(false);
      setCustomer(null);
      try {
        const res = await fetch(`/api/customers?phone=${phone}`);
        const data = await res.json();
        setCustomer(data);
      } catch (err) {
        setCustomer(null);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }
  };

  // Add customer handler (copied from CustomerContent)
  const handleAddCustomer = async (customerData: {
    name: string;
    phone: string;
    company?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerData.name,
          phone: customerData.phone,
          company: customerData.company ?? null,
          notes: customerData.notes ?? null,
          address: null,
          activeOrdersCount: 0,
          lateOrdersCount: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      const inserted = await res.json();
      setCustomer(inserted);
      setIsAddModalOpen(false);
      setExistingPhones((prev) => [...prev, inserted.phone]);
      return true;
    } catch (error) {
      console.error('Failed to add customer:', error);
      return false;
    }
  };

  // Open modal and prefill phone
  const handleOpenAddModal = () => {
    setPrefillPhone(phone);
    setIsAddModalOpen(true);
  };

  // Handle customer selection and move to step 2
  const handleCustomerSelect = () => {
    if (customer) {
      setCurrentStep(1);
    }
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 8); // Only digits, max 8
    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 2);
    }
    if (value.length > 2) {
      formatted += '/' + value.slice(2, 4);
    }
    if (value.length > 4) {
      formatted += '/' + value.slice(4, 8);
    }
    setDate(formatted);
  };

  // Validate the complete date (including year range)
  const validateDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 2000 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  };

  // Helper to parse DD/MM/YYYY to Date
  const parseDate = (str: string): Date | null => {
    if (!str || str.length !== 10) return null;
    const parsed = parse(str, 'dd/MM/yyyy', new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Helper to format Date to DD/MM/YYYY
  const formatDateString = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  // Auto-advance to step 3 when a valid date is set in step 2
  useEffect(() => {
    if (currentStep === 1 && validateDate(date)) {
      const timeout = setTimeout(() => setCurrentStep(2), 350); // allow for UI feedback
      return () => clearTimeout(timeout);
    }
  }, [date, currentStep]);

  return (
    <div className="p-6">
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
      <div
        className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden min-h-[200px] flex items-center gap-8 transition-all duration-500 ${currentStep >= 2 && validateDate(date) && searched && customer ? 'justify-start' : 'justify-center'}`}
      >
        {/* Step 3+ layout: Rent Date box and Customer box side by side */}
        {currentStep >= 2 && validateDate(date) && searched && customer ? (
          <>
            {/* Customer Box */}
            <div className="flex flex-col items-center min-w-[320px] animate-fade-in-move">
              <div
                className="bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-700 w-full flex flex-col items-center cursor-pointer hover:bg-gray-800 transition-colors"
                title="Chỉnh sửa khách hàng"
                onClick={() => {
                  // Only allow going back to step 1 to update customer
                  setCurrentStep(0);
                }}
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
            {/* Rent Date Box (stacked, compact, aligned) */}
            <div className="flex flex-col gap-2 min-w-[180px] animate-fade-in-move justify-between h-full">
              <div className="bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-700 w-full flex flex-col items-center">
                <div className="text-sm font-bold text-blue-400 mb-1">Ngày Thuê</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold text-white">{date}</span>
                  <span className="text-sm text-blue-300 font-semibold">{getDayLabel(date)}</span>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-700 w-full flex flex-col items-center">
                <div className="text-sm font-bold text-green-400 mb-1">Ngày trả dự kiến</div>
                {getExpectedReturnDate(date) && (
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {getExpectedReturnDate(date)!.date}
                    </span>
                    <span className="text-sm text-green-300 font-semibold">
                      {getExpectedReturnDate(date)!.day}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Summary Boxes Group (right-aligned) */}
            <div className="flex gap-6 ml-auto">
              {/* Tổng Sản Phẩm Box */}
              <div className="animate-fade-in-move">
                <div className="p-[3px] rounded-2xl bg-gradient-to-tr from-pink-500 via-yellow-400 to-pink-500 shadow-neon">
                  <div className="bg-gray-900 rounded-2xl px-10 py-8 flex flex-col items-center min-w-[200px] min-h-[140px]">
                    <div className="text-base font-bold text-pink-400 mb-2">Tổng Sản Phẩm</div>
                    <div className="text-3xl font-extrabold text-white mb-1">0</div>
                    <div className="text-sm text-gray-400">sản phẩm</div>
                  </div>
                </div>
              </div>
              {/* Tổng Hoá Đơn Box */}
              <div className="animate-fade-in-move">
                <div className="p-[3px] rounded-2xl bg-gradient-to-tr from-blue-500 via-green-400 to-blue-500 shadow-neon">
                  <div className="bg-gray-900 rounded-2xl px-10 py-8 flex flex-col items-center min-w-[200px] min-h-[140px]">
                    <div className="text-base font-bold text-blue-400 mb-2">Tổng Hoá Đơn</div>
                    <div className="text-3xl font-extrabold text-white mb-1">0</div>
                    <div className="text-sm text-gray-400">Việt Nam Đồng</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Steps 1 & 2: original search and date picking UI (no compact rent date box)
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
        )}
      </div>
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
