'use client';
import React from 'react';
import { useUser } from '@/context/UserContext';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import { FileText, ArrowRight, Pin, User } from 'lucide-react';

const ReportsContent: React.FC = () => {
  const { currentUser } = useUser();
  const { addFirstLevelTab, activateTab } = useTabContext();

  const availableReports = [
    {
      id: 'system-activity',
      title: 'Báo cáo hoạt động hệ thống',
      description: 'Theo dõi hoạt động hệ thống, người dùng online và các thao tác',
      color: 'from-blue-500 to-purple-600',
      reportId: 'trailing-audit-report',
      isPinned: true,
      author: 'Calum',
    },
    {
      id: 'inventory-adding',
      title: 'Báo cáo nhập kho theo nhân viên',
      description: 'Thống kê số lượng mặt hàng được thêm vào kho theo từng nhân viên',
      color: 'from-green-500 to-teal-600',
      reportId: 'inventory-adding-per-head-count-2025',
      isPinned: false,
      author: 'Calum',
    },
    {
      id: 'customer-service-review',
      title: 'Báo cáo đánh giá dịch vụ khách hàng',
      description: 'Phân tích phản hồi và đánh giá từ khách hàng về chất lượng dịch vụ',
      color: 'from-pink-500 to-rose-600',
      reportId: 'customer-service-review-report',
      isPinned: false,
      author: 'Calum',
    },
  ];

  const handleOpenReport = (report: (typeof availableReports)[0]) => {
    const tabId = createTabId(`report-${report.reportId}`);
    const newTab = {
      id: tabId,
      type: 'first' as const,
      label: report.title,
      options: [],
      isDefault: false,
      isClosable: true,
    };

    addFirstLevelTab(newTab);
    activateTab(tabId);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Báo cáo</h1>
        <p className="text-gray-400">Chọn báo cáo để xem chi tiết</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableReports.map((report) => (
          <div
            key={report.id}
            onClick={() => handleOpenReport(report)}
            className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:bg-gray-800 hover:border-gray-600 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1"
          >
            {/* Pin indicator */}
            {report.isPinned && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-1.5 rounded-full shadow-lg z-10">
                <Pin className="w-3 h-3" />
              </div>
            )}

            {/* Icon and title */}
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`bg-gradient-to-r ${report.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold text-sm leading-tight flex-1">
                {report.title}
              </h3>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-gray-300 text-xs leading-relaxed">{report.description}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
              <div className="flex items-center space-x-2">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400 text-xs">{report.author}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsContent;
