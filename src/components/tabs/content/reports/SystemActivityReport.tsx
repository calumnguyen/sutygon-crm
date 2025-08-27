'use client';
import React, { useState, useEffect, useMemo } from 'react';
import OnlineUsersSection from './OnlineUsersSection';
import { useUser } from '@/context/UserContext';
import { detectDeviceType, getLocationFromIP, getBrowserInfo } from '@/lib/utils/deviceDetection';
import { Store, Clock, User } from 'lucide-react';

interface StoreStatus {
  isOpen: boolean;
  openedBy?: string;
  openedAt?: string;
  closedBy?: string;
  closedAt?: string;
}

const StoreStatusSection: React.FC = () => {
  const [storeStatus, setStoreStatus] = useState<StoreStatus>({ isOpen: false });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStoreStatus = async () => {
    try {
      const res = await fetch('/api/store/status');
      const data = await res.json();
      setStoreStatus(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch store status:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStoreStatus();
  }, []);

  // Poll every minute
  useEffect(() => {
    const interval = setInterval(fetchStoreStatus, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-3">
      {/* Ultra Compact Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center gap-1">
          <Store className="w-3 h-3 text-blue-400" />
          <h3 className="text-white text-xs font-medium">Trạng thái cửa hàng</h3>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-2 h-2 text-gray-400" />
          <span className="text-xs text-gray-400">
            {lastUpdated.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </span>
        </div>
      </div>

      {/* Ultra Compact Content */}
      <div className="p-2">
        {/* Status Row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-white text-xs font-medium">
            {storeStatus.isOpen ? 'Đang mở' : 'Đã đóng'}
          </span>
        </div>

        {/* Details Row */}
        <div className="flex items-center gap-3 text-xs">
          {storeStatus.isOpen && storeStatus.openedBy && (
            <div className="flex items-center gap-1">
              <User className="w-2 h-2 text-green-400" />
              <span className="text-gray-400">Mở bởi:</span>
              <span className="text-white">{storeStatus.openedBy}</span>
            </div>
          )}

          {!storeStatus.isOpen && storeStatus.closedBy && (
            <div className="flex items-center gap-1">
              <User className="w-2 h-2 text-red-400" />
              <span className="text-gray-400">Đóng bởi:</span>
              <span className="text-white">{storeStatus.closedBy}</span>
            </div>
          )}

          {(storeStatus.openedAt || storeStatus.closedAt) && (
            <div className="flex items-center gap-1">
              <Clock className="w-2 h-2 text-blue-400" />
              <span className="text-gray-400">{storeStatus.isOpen ? 'Từ:' : 'Lúc:'}</span>
              <span className="text-white">
                {formatTime(storeStatus.isOpen ? storeStatus.openedAt : storeStatus.closedAt)}
              </span>
              <span className="text-gray-400">-</span>
              <span className="text-white">
                {formatDate(storeStatus.isOpen ? storeStatus.openedAt : storeStatus.closedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

  // Memoize the onlineUser object to prevent recreation on every render
  const onlineUser = useMemo(() => {
    if (!currentUser) return null;

    return {
      id: currentUser.id.toString(),
      name: currentUser.name,
      email: '', // Empty email since User type doesn't have email field
      role: currentUser.role,
      deviceType: deviceInfo.deviceType,
      location: deviceInfo.location,
      browser: deviceInfo.browser,
    };
  }, [
    currentUser?.id,
    currentUser?.name,
    currentUser?.role,
    deviceInfo.deviceType,
    deviceInfo.location,
    deviceInfo.browser,
  ]);

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
        {/* Store Status Section */}
        <StoreStatusSection />

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
