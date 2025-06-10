'use client';
import React from 'react';

interface SignOutButtonProps {
  onSignOut?: () => void;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut }) => {
  return (
    <button
      className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-gray-300 font-medium"
      onClick={onSignOut}
    >
      Đăng Xuất
    </button>
  );
};

export default SignOutButton;
