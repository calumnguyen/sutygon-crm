"use client";
import React from 'react';

interface ClosableTabProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

const ClosableTab: React.FC<ClosableTabProps> = ({ 
  id, 
  title, 
  isActive, 
  onClick, 
  onClose 
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab click when closing
    onClose(id);
  };

  return (
    <div
      onClick={() => onClick(id)}
      className={`group flex items-center px-4 py-2 rounded-t-lg cursor-pointer
                ${isActive 
                  ? 'bg-gray-700/50 border-t border-x border-gray-600' 
                  : 'bg-gray-800/30 hover:bg-gray-700/30'}`}
    >
      <span className="text-sm text-gray-200">{title}</span>
      <button
        onClick={handleClose}
        className="ml-2 p-1 rounded-full hover:bg-gray-600/50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg
          className="w-3 h-3 text-gray-400 hover:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export default ClosableTab; 