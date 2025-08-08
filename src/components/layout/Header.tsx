'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/common/Logo';
import SearchBar from '@/components/common/SearchBar';
import SignOutButton from '@/components/common/buttons/SignOutButton';
import { useUser } from '@/context/UserContext';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const router = useRouter();
  const { currentUser, logout } = useUser();

  return (
    <header className="w-full bg-transparent pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center">
          <Logo />
          <h1 className="ml-2 sm:ml-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 font-bold text-xl sm:text-2xl font-sans">
            SUTYGON CRM
          </h1>
        </div>
        <div className="flex-1 w-full sm:max-w-2xl sm:mx-4 order-3 sm:order-2">
          <SearchBar onSearch={onSearch} />
        </div>
        <div className="order-2 sm:order-3">
          <SignOutButton
            userName={currentUser?.name}
            onSignOut={() => {
              logout();
              router.replace('/login');
            }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
