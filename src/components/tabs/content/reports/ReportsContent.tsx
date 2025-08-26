'use client';
import React from 'react';
import { useUser } from '@/context/UserContext';
import OnlineUsersSection from './OnlineUsersSection';
import { useOnlineUsers, OnlineUser } from '@/hooks/useOnlineUsers';

const ReportsContent: React.FC = () => {
  const { currentUser } = useUser();

  // Create OnlineUser object from currentUser
  const onlineCurrentUser: OnlineUser | null = currentUser
    ? {
        id: currentUser.id.toString(),
        name: currentUser.name,
        email: '', // User type doesn't have email
        role: currentUser.role as 'admin' | 'user',
        deviceType: 'Unknown Device', // Will be detected by the system
        location: 'Unknown Location', // Will be detected by the system
        browser: 'Unknown Browser', // Will be detected by the system
      }
    : null;

  const { onlineUsers } = useOnlineUsers(onlineCurrentUser);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Báo cáo</h2>
        <div className="text-sm text-gray-400">Cập nhật thời gian thực</div>
      </div>

      {/* Online Users Section */}
      <OnlineUsersSection
        currentUser={onlineUsers.find((u) => u.id === onlineCurrentUser?.id) || null}
      />
    </div>
  );
};

export default ReportsContent;
