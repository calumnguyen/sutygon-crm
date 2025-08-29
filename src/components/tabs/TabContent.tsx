'use client';
import React, { useEffect, useRef } from 'react';
import { useTabContext } from '@/context/TabContext';
import { TAB_CONTENT_MAPPING } from '@/constants/tabs';
import { useUser } from '@/context/UserContext';
import { createTabId } from '@/types/tabTypes';
import HomeContent from '@/components/tabs/content/home/HomeContent';
import UsersContent from '@/components/tabs/content/users/UsersContent';
import CustomerContent from '@/components/tabs/content/customers/CustomerContent';
import OrdersContent from '@/components/tabs/content/orders/OrdersContent';
import OrdersNewContent from '@/components/tabs/content/orders/OrdersNewContent';
import InventoryContent from '@/components/tabs/content/inventory/InventoryContent';
import StoreSettingsContent from '@/components/tabs/content/store-settings/StoreSettingsContent';
import ReportsContent from '@/components/tabs/content/reports/ReportsContent';
import InventoryAddingReport from '@/components/tabs/content/reports/InventoryAddingReport';
import SystemActivityReport from '@/components/tabs/content/reports/SystemActivityReport';
import CustomerServiceReviewReport from '@/components/tabs/content/reports/CustomerServiceReviewReport';

const contentComponents = {
  home: HomeContent,
  users: UsersContent,
  customers: CustomerContent,
  orders: OrdersContent,
  inventory: InventoryContent,
  'store-settings': StoreSettingsContent,
  reports: ReportsContent,
};

const TabContent: React.FC = () => {
  const {
    firstLevelTabs,
    activeFirstLevelTab,
    addFirstLevelTab,
    activateTab,
    updateFirstLevelTabOption,
  } = useTabContext();
  const { userRole } = useUser();
  const redirectedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only create initial tab if none exist - role-based filtering is now handled in FirstLevelTab
    if (firstLevelTabs.length === 0) {
      const defaultFirstLevelTab = {
        id: createTabId('home'),
        type: 'first' as const,
        label: 'Trang Chủ',
        options: [], // Options will be dynamically determined by FirstLevelTab
        isDefault: true,
        isClosable: false,
      };

      addFirstLevelTab(defaultFirstLevelTab);
    }
  }, [firstLevelTabs.length, addFirstLevelTab]);

  // Enhanced role-based tab protection with loop prevention
  useEffect(() => {
    if (userRole && activeFirstLevelTab) {
      const currentRedirectKey = `${userRole}-${activeFirstLevelTab.id}`;

      // Prevent infinite loops by checking if we already redirected for this combo
      if (redirectedRef.current === currentRedirectKey) {
        return;
      }

      // Only redirect non-admin users if they're on admin-only tabs
      if (userRole !== 'admin') {
        // Check if current tab/selectedOption is admin-only
        let isOnAdminContent = false;
        let detectedContent = '';

        if (activeFirstLevelTab.selectedOption?.id) {
          detectedContent =
            TAB_CONTENT_MAPPING[activeFirstLevelTab.selectedOption.id] ||
            activeFirstLevelTab.selectedOption.id;
          isOnAdminContent =
            detectedContent === 'users' ||
            detectedContent === 'store-settings' ||
            detectedContent === 'reports';
        } else {
          detectedContent = TAB_CONTENT_MAPPING[activeFirstLevelTab.id] || activeFirstLevelTab.id;
          isOnAdminContent =
            detectedContent === 'users' ||
            detectedContent === 'store-settings' ||
            detectedContent === 'reports';
        }

        console.log('Admin content check:', {
          activeTabId: activeFirstLevelTab.id,
          selectedOptionId: activeFirstLevelTab.selectedOption?.id,
          detectedContent,
          isOnAdminContent,
          userRole,
        });

        if (isOnAdminContent) {
          console.log('Non-admin user on admin-only content, redirecting to home');
          const homeTab = firstLevelTabs.find((tab) => tab.isDefault);
          if (homeTab) {
            redirectedRef.current = currentRedirectKey;
            // Clear the admin selectedOption and go to home
            updateFirstLevelTabOption(homeTab.id, { id: createTabId('home'), label: 'Trang Chủ' });
            activateTab(homeTab.id);
            return;
          }
        }
      }

      // Reset redirect tracking when role/tab changes appropriately
      redirectedRef.current = null;
    }
  }, [userRole, activeFirstLevelTab, activateTab, updateFirstLevelTabOption, firstLevelTabs]);

  if (!activeFirstLevelTab) return null;

  return (
    <div className="flex-1 overflow-auto">
      {firstLevelTabs.map((tab) => {
        const isActive = tab.id === activeFirstLevelTab.id;

        // Special case for new order tabs
        if (tab.id.startsWith('orders-new-')) {
          return (
            <div
              key={tab.id}
              style={{
                display: isActive ? 'block' : 'none',
                height: '100%',
              }}
            >
              <OrdersNewContent tabId={tab.id} />
            </div>
          );
        }

        // Special case for report tabs
        if (tab.id.startsWith('report-')) {
          const reportId = tab.id.replace('report-', '');
          let ReportComponent = ReportsContent; // Default fallback

          // Map specific reports to their components
          if (reportId === 'inventory-adding-per-head-count-2025') {
            ReportComponent = InventoryAddingReport;
          } else if (reportId === 'trailing-audit-report') {
            ReportComponent = SystemActivityReport;
          } else if (reportId === 'customer-service-review-report') {
            ReportComponent = CustomerServiceReviewReport;
          }

          return (
            <div
              key={tab.id}
              style={{
                display: isActive ? 'block' : 'none',
                height: '100%',
              }}
            >
              <ReportComponent />
            </div>
          );
        }

        // Get content based on selected option (for dropdown tabs) or tab ID
        let contentKey = 'home'; // default fallback

        if (tab.selectedOption && tab.selectedOption.id) {
          contentKey = TAB_CONTENT_MAPPING[tab.selectedOption.id] || tab.selectedOption.id;
        } else {
          contentKey = TAB_CONTENT_MAPPING[tab.id] || tab.id;
        }

        // Block admin-only content for non-admin users
        if (
          userRole !== 'admin' &&
          (contentKey === 'users' || contentKey === 'store-settings' || contentKey === 'reports')
        ) {
          contentKey = 'home';
        }

        const ContentComponent = contentComponents[contentKey as keyof typeof contentComponents];

        return (
          <div
            key={tab.id}
            style={{
              display: isActive ? 'block' : 'none',
              height: '100%',
            }}
          >
            {ContentComponent ? <ContentComponent /> : <HomeContent />}
          </div>
        );
      })}
    </div>
  );
};

export default TabContent;
