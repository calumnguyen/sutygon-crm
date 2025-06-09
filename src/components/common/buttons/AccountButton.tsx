"use client";
import React from 'react';

interface AccountButtonProps {
  onAccountClick?: () => void;
  username?: string;
}

const AccountButton: React.FC<AccountButtonProps> = ({ 
  onAccountClick,
  username = 'CN'
}) => {
  return (
    <button
      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
      onClick={onAccountClick}
    >
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-gray-300 text-sm">{username}</span>
      </div>
      <span className="text-gray-300">Đăng Nhập</span>
    </button>
  );
};

export default AccountButton; 