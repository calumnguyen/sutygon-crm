import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  height = 'h-4',
  width = 'w-full',
  rounded = true,
  animate = true,
}) => {
  return (
    <div
      className={`
        bg-gray-700 
        ${height} 
        ${width} 
        ${rounded ? 'rounded' : ''} 
        ${animate ? 'animate-pulse' : ''} 
        ${className}
      `}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonCard: React.FC<{
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ className = '', title = 'Loading...', icon }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      {icon || <SkeletonLoader height="h-6" width="w-6" rounded />}
      <span className="text-white text-xl font-bold">{title}</span>
    </div>
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <SkeletonLoader height="h-4" width="w-24" />
          <SkeletonLoader height="h-4" width="w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ rows = 3, className = '', title = 'Loading...', icon }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      {icon || <SkeletonLoader height="h-6" width="w-6" rounded />}
      <span className="text-white text-xl font-bold">{title}</span>
    </div>
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 text-gray-400 text-sm font-medium">
        <span className="w-20">Tên sản phẩm</span>
        <span className="w-16">Số lượng</span>
        <span className="w-12">Giá</span>
        <span className="w-16">Thành tiền</span>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonLoader height="h-4" width="w-20" />
          <SkeletonLoader height="h-4" width="w-16" />
          <SkeletonLoader height="h-4" width="w-12" />
          <SkeletonLoader height="h-4" width="w-16" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonInfoCard: React.FC<{
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ className = '', title = 'Loading...', icon }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      {icon || <SkeletonLoader height="h-6" width="w-6" rounded />}
      <span className="text-white text-xl font-bold">{title}</span>
    </div>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Tên khách hàng:</span>
        <SkeletonLoader height="h-4" width="w-32" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Số điện thoại:</span>
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Địa chỉ:</span>
        <SkeletonLoader height="h-4" width="w-24" />
      </div>
    </div>
  </div>
);

export const SkeletonPaymentHistory: React.FC<{
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ className = '', title = 'Lịch sử thanh toán', icon }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      {icon || <SkeletonLoader height="h-6" width="w-6" rounded />}
      <span className="text-white text-xl font-bold">{title}</span>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <SkeletonLoader height="h-4" width="w-4" rounded />
            <div className="space-y-1">
              <SkeletonLoader height="h-3" width="w-24" />
              <SkeletonLoader height="h-3" width="w-32" />
            </div>
          </div>
          <SkeletonLoader height="h-4" width="w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonSettlement: React.FC<{
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ className = '', title = 'Tất toán', icon }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      {icon || <SkeletonLoader height="h-6" width="w-6" rounded />}
      <span className="text-white text-xl font-bold">{title}</span>
    </div>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Tổng tiền hàng:</span>
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Thuế VAT:</span>
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Tiền cọc:</span>
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-base">Đã thanh toán:</span>
        <SkeletonLoader height="h-4" width="w-20" />
      </div>
      <div className="border-t border-gray-600 my-4"></div>
      <div className="flex items-center justify-between">
        <span className="text-white text-lg font-bold">Số tiền còn lại:</span>
        <SkeletonLoader height="h-5" width="w-24" />
      </div>
    </div>
  </div>
);
