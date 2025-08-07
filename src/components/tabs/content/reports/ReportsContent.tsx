'use client';
import React from 'react';
import { FileText, Pin } from 'lucide-react';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';

interface Report {
  id: string;
  name: string;
  description: string;
  creator: string;
  dateUpdated: string;
  icon?: React.ReactNode;
  isPinned?: boolean;
}

const AVAILABLE_REPORTS: Report[] = [
  {
    id: 'trailing-audit-report',
    name: 'Báo cáo theo dõi hoạt động hệ thống',
    description: 'Tất cả hoạt động hệ thống như đăng nhập, chỉnh sửa, và các thao tác khác',
    creator: 'Calum',
    dateUpdated: new Date().toLocaleDateString('vi-VN'),
    icon: <FileText className="w-5 h-5" />,
    isPinned: true,
  },
  {
    id: 'inventory-adding-per-head-count-2025',
    name: 'Báo cáo nhập kho theo nhân viên năm 2025',
    description: 'Thống kê các mặt hàng được thêm vào kho bởi từng nhân viên',
    creator: 'Calum',
    dateUpdated: new Date().toLocaleDateString('vi-VN'),
    icon: <FileText className="w-5 h-5" />,
  },
];

const ReportsContent: React.FC = () => {
  const { addFirstLevelTab } = useTabContext();

  // Sort reports: pinned first, then by name
  const sortedReports = [...AVAILABLE_REPORTS].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleReportClick = (report: Report) => {
    // Create a new level 1 tab for the selected report
    const reportTab = {
      id: createTabId(`report-${report.id}`),
      type: 'first' as const,
      label: report.name,
      options: [],
      isDefault: false,
      isClosable: true,
    };

    addFirstLevelTab(reportTab);
  };

  return (
    <div className="h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Báo Cáo</h1>
        <p className="text-gray-400 text-sm mt-1">Danh sách báo cáo có sẵn</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedReports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleReportClick(report)}
              className={`rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden group ${
                report.isPinned
                  ? 'bg-gradient-to-br from-amber-900/30 to-gray-800 border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                  : 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'
              }`}
            >
              {/* Card Header */}
              <div
                className={`p-4 border-b bg-gradient-to-r ${
                  report.isPinned
                    ? 'border-amber-500/30 from-amber-900/20 to-gray-750'
                    : 'border-gray-700 from-gray-800 to-gray-750'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-md transition-colors ${
                      report.isPinned
                        ? 'bg-amber-600 group-hover:bg-amber-500'
                        : 'bg-blue-600 group-hover:bg-blue-500'
                    }`}
                  >
                    {report.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-medium text-sm truncate transition-colors ${
                        report.isPinned
                          ? 'text-amber-100 group-hover:text-amber-200'
                          : 'text-white group-hover:text-blue-400'
                      }`}
                    >
                      {report.name}
                    </h3>
                    <p
                      className={`text-xs mt-1 transition-colors ${
                        report.isPinned ? 'text-amber-300/80' : 'text-gray-400'
                      }`}
                    >
                      {report.description}
                    </p>
                  </div>
                  {report.isPinned && (
                    <div className="flex-shrink-0">
                      <Pin className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Tác giả</span>
                  <span className="text-gray-300 font-medium">{report.creator}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Cập nhật</span>
                  <span className="text-gray-300">{report.dateUpdated}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-gray-750 border-t border-gray-700">
                <div className="flex items-center justify-center text-xs text-gray-400 group-hover:text-blue-400 transition-colors">
                  <span>Nhấn để mở báo cáo</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {AVAILABLE_REPORTS.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Chưa có báo cáo</h3>
            <p className="text-gray-500 text-sm">Các báo cáo sẽ xuất hiện ở đây khi có sẵn</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsContent;
