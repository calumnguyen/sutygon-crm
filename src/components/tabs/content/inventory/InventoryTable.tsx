import React from 'react';
import { InventoryItem } from '@/types/inventory';
import Button from '@/components/common/dropdowns/Button';

interface InventoryTableProps {
  filteredInventory: InventoryItem[];
  setPreviewOpen: (open: boolean) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ filteredInventory, setPreviewOpen }) => {
  if (filteredInventory.length === 0) {
    return <div className="text-center text-gray-400 py-10">Chưa có sản phẩm nào trong kho.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-sm">
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Tên sản phẩm</th>
            <th className="px-4 py-3 text-left font-medium">Tồn kho</th>
            <th className="px-4 py-3 text-left font-medium">Danh mục</th>
            <th className="px-4 py-3 text-left font-medium">Tags</th>
            <th className="px-4 py-3 text-left font-medium">Giá</th>
            <th className="px-4 py-3 text-left font-medium">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {filteredInventory.map((item) => (
            <tr key={item.id} className="text-white hover:bg-gray-700/50">
              <td className="px-4 py-3 font-mono text-sm">{item.formattedId}</td>
              <td className="px-4 py-3">{item.name}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <div className="text-sm text-gray-400">Tổng số:</div>
                  <div className="flex gap-4 text-sm">
                    {item.sizes.map((size) => (
                      <span key={size.title}>
                        {size.title}: {size.quantity}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">Còn lại:</div>
                  <div className="flex gap-4 text-sm">
                    {item.sizes.map((size) => (
                      <span key={size.title}>
                        {size.title}: {size.onHand}
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{item.category}</td>
              <td className="px-4 py-3">
                {item.tags.length === 0 ? (
                  <span className="text-yellow-400 text-xs italic">
                    Chưa có tag. Thêm tag để quản lý sản phẩm tốt hơn.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {item.sizes.map((size) => (
                    <div
                      key={size.title}
                      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0"
                      style={{ wordBreak: 'break-all' }}
                    >
                      <span className="text-gray-400 font-mono text-xs sm:text-sm break-all">
                        {size.title}:
                      </span>
                      <span className="text-xs sm:text-sm break-all">{size.price}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="secondary"
                  onClick={() => setPreviewOpen(true)}
                  className="p-2"
                  title="Xem trước sản phẩm"
                >
                  Xem
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
