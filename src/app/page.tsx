'use client';
import React, { useState, useEffect } from 'react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { AppProvider } from '@/context/AppContext';
import ClientLayout from './ClientLayout';
import { useRouter } from 'next/navigation';
import TabContent from '@/components/tabs/TabContent';
import { useUser } from '@/context/UserContext';
import SessionWarningModal from '@/components/common/SessionWarningModal';

export default function Home() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { isAuthenticated, showSessionWarning, sessionWarningSeconds, extendSession, logout } =
    useUser();

  useEffect(() => {
    // Give UserContext time to load and validate session
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/login');
      } else {
        setChecking(false);
      }
    }, 1000); // Wait 1 second for session validation

    return () => clearTimeout(timer);
  }, [router, isAuthenticated]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-white text-lg mb-2">Đang xác thực phiên đăng nhập...</div>
          <div className="text-gray-400 text-sm">Vui lòng chờ trong giây lát</div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <ClientLayout>
        <BrowserTabBar />
        <TabContent />
      </ClientLayout>
      <SessionWarningModal
        isOpen={showSessionWarning}
        onExtendSession={() => {
          extendSession();
        }}
        onLogout={() => {
          logout();
          router.replace('/login');
        }}
        remainingSeconds={sessionWarningSeconds}
      />
    </AppProvider>
  );
}
