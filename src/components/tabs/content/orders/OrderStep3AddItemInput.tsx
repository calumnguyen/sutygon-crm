import React from 'react';
import { Search } from 'lucide-react';

interface OrderStep3AddItemInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  error: string;
  loading: boolean;
}

const OrderStep3AddItemInput: React.FC<OrderStep3AddItemInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onAdd,
  error,
  loading,
}) => (
  <div className="bg-gray-900 rounded-lg p-4 shadow-lg border border-gray-700 flex flex-col items-center w-full">
    <div className="text-xl font-bold text-blue-400 mb-2">Thêm sản phẩm vào đơn hàng</div>
    <form
      className="w-full flex flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Mã sản phẩm hoặc tên sản phẩm"
          className="w-full text-base pl-10 pr-4 py-2 rounded-lg bg-gray-800 border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-white placeholder-gray-400"
          disabled={loading}
        />
      </div>
      {error && <div className="text-red-400 text-sm mt-1">{error}</div>}
    </form>
  </div>
);

export default OrderStep3AddItemInput;
