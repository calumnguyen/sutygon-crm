import React from 'react';
import { Package, Boxes, RefreshCw } from 'lucide-react';
import { useInventoryOverview } from '@/hooks/useInventoryOverview';

interface InventoryOverviewProps {
  autoRefresh?: boolean;
}

const InventoryOverview: React.FC<InventoryOverviewProps> = ({ autoRefresh = true }) => {
  const { data, loading, error, refetch } = useInventoryOverview(autoRefresh);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-red-400">Tổng Quan Kho - Lỗi</h3>
          <button
            onClick={refetch}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-red-300 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Tổng Quan Kho</h3>
          <button
            onClick={refetch}
            disabled={loading}
            className="text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Total Models */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-300 font-medium">Tổng Mẫu</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-gray-600 animate-pulse rounded"></span>
                  ) : (
                    data.totalModels.toLocaleString('vi-VN')
                  )}
                </p>
                <p className="text-xs text-blue-400 mt-1">Sản phẩm duy nhất</p>
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Boxes className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-300 font-medium">Tổng Sản Phẩm</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-600 animate-pulse rounded"></span>
                  ) : (
                    data.totalProducts.toLocaleString('vi-VN')
                  )}
                </p>
                <p className="text-xs text-green-400 mt-1">Tổng số lượng tồn kho</p>
              </div>
            </div>
          </div>
        </div>

        {autoRefresh && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Tự động cập nhật mỗi 20 giây • Cập nhật lần cuối:{' '}
              {new Date().toLocaleTimeString('vi-VN')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryOverview;
