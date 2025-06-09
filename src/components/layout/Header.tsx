"use client";
import React from 'react';
import Logo from '@/components/common/Logo';
import SearchBar from '@/components/common/SearchBar';
import AccountButton from '@/components/common/buttons/AccountButton';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  return (
    <header className="w-full bg-transparent pt-6">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <Logo />
          <h1 className="ml-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 font-bold text-2xl font-sans">
            Sutygon CRM
          </h1>
        </div>
        <div className="flex-1 max-w-2xl mx-4">
          <SearchBar onSearch={onSearch} />
        </div>
        <AccountButton />
      </div>
    </header>
  );
};

export default Header; 