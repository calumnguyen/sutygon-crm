"use client";
import React from 'react';
import HomeContent from './HomeContent';
import OrdersContent from './OrdersContent';
import InventoryContent from './InventoryContent';

/**
 * ContentManager Component
 * 
 * Manages and renders the appropriate content component based on the active tab.
 * 
 * @component
 * @param {ContentManagerProps} props - The component props
 * @param {string | undefined} props.activeTabId - The ID of the currently active tab
 */
interface ContentManagerProps {
  activeTabId?: string;
}

const ContentManager: React.FC<ContentManagerProps> = ({ activeTabId = 'home' }) => {
  const renderContent = () => {
    switch (activeTabId) {
      case 'home':
        return <HomeContent />;
      case 'orders':
        return <OrdersContent />;
      case 'inventory':
        return <InventoryContent />;
      default:
        return <HomeContent />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {renderContent()}
    </div>
  );
};

export default ContentManager; 