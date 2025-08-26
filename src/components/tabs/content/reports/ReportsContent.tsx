'use client';
import React from 'react';
import { useUser } from '@/context/UserContext';
import { useTabContext } from '@/context/TabContext';
import { createTabId } from '@/types/tabTypes';
import { Activity, Package, ArrowRight, Pin } from 'lucide-react';

const ReportsContent: React.FC = () => {
  const { currentUser } = useUser();
  const { addFirstLevelTab, activateTab } = useTabContext();

  const availableReports = [
    {
      id: 'system-activity',
      title: 'Báo cáo hoạt động hệ thống',
      description: 'Theo dõi hoạt động hệ thống, người dùng online và các thao tác',
      icon: Activity,
      color: 'from-cyan-400 via-blue-500 to-purple-600',
      reportId: 'trailing-audit-report',
      isPinned: true,
    },
    {
      id: 'inventory-adding',
      title: 'Báo cáo nhập kho theo nhân viên',
      description: 'Thống kê số lượng mặt hàng được thêm vào kho theo từng nhân viên',
      icon: Package,
      color: 'from-emerald-400 via-green-500 to-teal-600',
      reportId: 'inventory-adding-per-head-count-2025',
      isPinned: false,
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
    <div className="space-y-4 p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Báo cáo</h1>
        <p className="text-gray-400 text-sm">Chọn báo cáo để xem chi tiết</p>
      </div>

      <div className="space-y-3">
        {availableReports.map((report) => {
          const IconComponent = report.icon;
          return (
            <div
              key={report.id}
              onClick={() => handleOpenReport(report)}
              className={`relative bg-gray-800 border-2 border-transparent bg-gradient-to-r from-gray-800 to-gray-800 rounded-lg p-4 cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] before:absolute before:inset-0 before:rounded-lg before:p-[2px] before:bg-gradient-to-r ${report.color} before:-z-10 hover:before:opacity-100 before:opacity-0 before:transition-opacity before:duration-300`}
            >
              {report.isPinned && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 p-1 rounded-full shadow-lg z-10">
                  <Pin className="w-3 h-3" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`bg-gradient-to-r ${report.color} p-2 rounded-lg flex-shrink-0`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                      {report.title}
                    </h3>
                    <p className="text-gray-300 text-xs sm:text-sm truncate">
                      {report.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsContent;
