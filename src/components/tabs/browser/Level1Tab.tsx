"use client";
import React from 'react';

interface Level1TabProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: (tabId: string) => void;
}

const Level1Tab: React.FC<Level1TabProps> = ({ id, title, isActive, onClick }) => {
  return (
    <div
      onClick={() => onClick(id)}
      className={`flex items-center px-4 py-2 rounded-t-lg cursor-pointer
                ${isActive 
                  ? 'bg-gray-700/50 border-t border-x border-gray-600' 
                  : 'bg-gray-800/30 hover:bg-gray-700/30'}`}
    >
      <span className="text-sm text-gray-200">{title}</span>
    </div>
  );
};

export default Level1Tab; 