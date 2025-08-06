'use client';
import React from 'react';
import { User } from 'lucide-react';

interface SignOutButtonProps {
  onSignOut: () => void;
  userName?: string;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut, userName }) => {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-gray-300 font-medium"
      onClick={onSignOut}
    >
      <User className="w-4 h-4" />
      <span>{userName || 'Người dùng'}</span>
      <span>•</span>
      <span>Đăng Xuất</span>
    </button>
  );
};

export default SignOutButton;
