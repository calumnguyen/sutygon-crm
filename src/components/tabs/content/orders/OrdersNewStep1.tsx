import React from 'react';
import { Calendar } from 'lucide-react';

interface OrdersNewStep1Props {
  currentStep: number;
  phone: string;
  searching: boolean;
  handlePhoneInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePhoneEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  date: string;
  handleDateInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validateDate: (dateStr: string) => boolean;
  setShowCalendarModal: (open: boolean) => void;
  formatDateString: (date: Date) => string;
  setDate: (date: string) => void;
}

const OrdersNewStep1: React.FC<OrdersNewStep1Props> = ({
  currentStep,
  phone,
  searching,
  handlePhoneInput,
  handlePhoneEnter,
  date,
  handleDateInput,
  validateDate,
  setShowCalendarModal,
  formatDateString,
  setDate,
}) => {
  return (
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
          value={phone}
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
  );
};

export default OrdersNewStep1;
