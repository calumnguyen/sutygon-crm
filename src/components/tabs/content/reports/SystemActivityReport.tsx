'use client';
import React, { useState, useEffect } from 'react';
import OnlineUsersSection from './OnlineUsersSection';
import { useUser } from '@/context/UserContext';
import { detectDeviceType, getLocationFromIP, getBrowserInfo } from '@/lib/utils/deviceDetection';

const SystemActivityReport: React.FC = () => {
  const { currentUser } = useUser();
  const [deviceInfo, setDeviceInfo] = useState({
    deviceType: 'Desktop',
    location: 'Loading...',
    browser: 'Unknown',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get real device type and browser
      const realDeviceType = detectDeviceType();
      const realBrowser = getBrowserInfo();

      setDeviceInfo((prev) => ({
        ...prev,
        deviceType: realDeviceType,
        browser: realBrowser,
      }));

      // Get real location
      getLocationFromIP().then((location) => {
        setDeviceInfo((prev) => ({
          ...prev,
          location,
        }));
      });
    }
  }, []);

  // Convert User type to OnlineUser type for the component
  const onlineUser = currentUser
    ? {
        id: currentUser.id.toString(),
        name: currentUser.name,
        email: '', // Empty email since User type doesn't have email field
        role: currentUser.role,
        deviceType: deviceInfo.deviceType,
        location: deviceInfo.location,
        browser: deviceInfo.browser,
      }
    : null;

  return (
    <div className="h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Báo cáo theo dõi hoạt động hệ thống</h1>
          <p className="text-gray-400 text-sm mt-1">
            Tất cả hoạt động hệ thống như đăng nhập, chỉnh sửa, và các thao tác khác
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Online Users Section */}
        <OnlineUsersSection currentUser={onlineUser} />

        {/* Placeholder for future sections */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-center py-16">
            <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 text-gray-400">📊</div>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Báo cáo đang được phát triển</h3>
            <p className="text-gray-500 text-sm">
              Tính năng báo cáo theo dõi hoạt động hệ thống sẽ sớm có sẵn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemActivityReport;
