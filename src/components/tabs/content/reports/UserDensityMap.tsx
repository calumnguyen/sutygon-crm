'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { OnlineUser } from '@/hooks/useOnlineUsers';

// Dynamically import the entire map component to avoid SSR issues
const UserDensityMapClient = dynamic(() => import('./UserDensityMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">Đang tải bản đồ...</p>
      </div>
    </div>
  ),
});

interface UserDensityMapProps {
  onlineUsers: OnlineUser[];
  isConnected: boolean;
}

const UserDensityMap: React.FC<UserDensityMapProps> = ({ onlineUsers, isConnected }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Đang tải bản đồ...</p>
        </div>
      </div>
    );
  }

  return <UserDensityMapClient onlineUsers={onlineUsers} isConnected={isConnected} />;
};

export default UserDensityMap;
