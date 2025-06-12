import { Customer } from './types';
import { formatPhoneNumber, getDayLabel, getExpectedReturnDate } from './utils';

interface OrdersNewStep3Props {
  customer: Customer;
  date: string;
  setDate: (date: string) => void;
  setCurrentStep: (step: number) => void;
}

const OrdersNewStep3 = ({ customer, date, setDate, setCurrentStep }: OrdersNewStep3Props) => {
  return (
    <div className="flex min-h-[200px] items-start gap-8 transition-all duration-500 justify-start">
      {/* Step 3+ layout: left/right split */}
      {/* Left section: Customer info, rent date, return date, and summary boxes */}
      <div className="flex flex-col w-1/3 min-w-[320px] max-w-[420px] bg-gray-800 rounded-lg shadow-lg overflow-hidden p-4 gap-4">
        {/* Customer Box */}
        <div
          className="bg-gray-900 rounded-lg p-4 shadow-lg border border-gray-700 flex flex-col items-center cursor-pointer hover:bg-gray-800 transition-colors animate-fade-in-move"
          title="Chỉnh sửa khách hàng"
          onClick={() => setCurrentStep(0)}
        >
          <div className="text-lg font-bold text-blue-400 mb-1">Khách hàng</div>
          <div className="text-white text-base mb-1">
            Tên: <span className="font-semibold">{customer.name}</span>
          </div>
          {customer.company && (
            <div className="text-gray-300 text-sm mb-1">
              Công ty: <span className="font-semibold">{customer.company}</span>
            </div>
          )}
          <div className="text-gray-300 text-sm">
            Số điện thoại: <span className="font-mono">{formatPhoneNumber(customer.phone)}</span>
          </div>
        </div>
        {/* Rent/Return Date Row */}
        <div className="flex flex-row gap-2 w-full animate-fade-in-move">
          <div
            className="bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-700 flex-1 flex flex-col items-center cursor-pointer hover:bg-gray-800 transition-colors"
            title="Chỉnh sửa ngày thuê"
            onClick={() => {
              setDate('');
              setCurrentStep(1);
            }}
          >
            <div className="text-xs font-bold text-blue-400 mb-1">Ngày Thuê</div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm font-bold text-white">{date}</span>
              <span className="text-xs text-blue-300 font-semibold">{getDayLabel(date)}</span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-700 flex-1 flex flex-col items-center">
            <div className="text-xs font-bold text-green-400 mb-1">Ngày trả dự kiến</div>
            {getExpectedReturnDate(date) && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white">
                  {getExpectedReturnDate(date)!.date}
                </span>
                <span className="text-xs text-green-300 font-semibold">
                  {getExpectedReturnDate(date)!.day}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Summary Boxes Group (below) */}
        <div className="flex flex-row gap-2 w-full mt-2">
          {/* Tổng Sản Phẩm Box */}
          <div className="flex-1 animate-fade-in-move">
            <div className="p-[2px] rounded-xl bg-gradient-to-tr from-pink-500 via-yellow-400 to-pink-500 shadow-neon">
              <div className="bg-gray-900 rounded-xl px-4 py-6 flex flex-col items-center min-w-[90px] min-h-[70px]">
                <div className="text-xs font-bold text-pink-400 mb-1">Tổng Sản Phẩm</div>
                <div className="text-xl font-extrabold text-white mb-0.5">0</div>
                <div className="text-xs text-gray-400">sản phẩm</div>
              </div>
            </div>
          </div>
          {/* Tổng Hoá Đơn Box */}
          <div className="flex-1 animate-fade-in-move">
            <div className="p-[2px] rounded-xl bg-gradient-to-tr from-blue-500 via-green-400 to-blue-500 shadow-neon">
              <div className="bg-gray-900 rounded-xl px-4 py-6 flex flex-col items-center min-w-[90px] min-h-[70px]">
                <div className="text-xs font-bold text-blue-400 mb-1">Tổng Hoá Đơn</div>
                <div className="text-xl font-extrabold text-white mb-0.5">0</div>
                <div className="text-xs text-gray-400">Việt Nam Đồng</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right section: Add items to order */}
      <div className="w-1/2 bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-700 min-h-[400px]">
        <div className="text-xl font-bold text-blue-400 mb-2">Thêm sản phẩm vào đơn hàng</div>
        {/* Add your items UI here */}
      </div>
    </div>
  );
};

export default OrdersNewStep3;
