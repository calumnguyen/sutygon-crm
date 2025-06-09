"use client";
import React from 'react';

/**
 * InventoryContent Component
 * 
 * Displays the inventory management content.
 * 
 * @component
 */
const InventoryContent: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-200 mb-4">Kho Hàng</h2>
      
      {/* Inventory Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Tổng Sản Phẩm</h3>
          <p className="text-2xl font-semibold text-gray-200">1,234</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Sản Phẩm Sắp Hết</h3>
          <p className="text-2xl font-semibold text-yellow-400">23</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Hết Hàng</h3>
          <p className="text-2xl font-semibold text-red-400">5</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Mã SP</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tên Sản Phẩm</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Số Lượng</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Đơn Giá</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {[1, 2, 3, 4, 5].map((product) => (
                <tr key={product} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-gray-300">SP{product}00</td>
                  <td className="px-4 py-3 text-sm text-gray-300">Sản phẩm {product}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{product * 10}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{product * 100000}đ</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product * 10 > 20 
                        ? 'bg-green-500/20 text-green-400'
                        : product * 10 > 10
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {product * 10 > 20 ? 'Còn Hàng' : product * 10 > 10 ? 'Sắp Hết' : 'Hết Hàng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end space-x-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Thêm Sản Phẩm
        </button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
          Nhập Kho
        </button>
      </div>
    </div>
  );
};

export default InventoryContent; 