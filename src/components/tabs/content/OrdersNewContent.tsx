import React from 'react';

const steps = ['Khách Hàng', 'Chọn Ngày Thuê', 'Sản Phẩm', 'Thanh Toán'];

const OrdersNewContent: React.FC<{ tabId: string }> = () => {
  const currentStep = 0; // Default to first step for now
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
      {/* Step content goes here */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden min-h-[200px] flex items-center justify-center">
        <span className="text-gray-400">Chọn khách hàng để bắt đầu tạo đơn mới.</span>
      </div>
    </div>
  );
};

export default OrdersNewContent;
