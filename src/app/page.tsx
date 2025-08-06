'use client';
import React, { useState, useEffect } from 'react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { AppProvider } from '@/context/AppContext';
import ClientLayout from './ClientLayout';
import { useRouter } from 'next/navigation';
import TabContent from '@/components/tabs/TabContent';
import { useUser } from '@/context/UserContext';
import SessionWarningModal from '@/components/common/SessionWarningModal';
import Lottie from 'lottie-react';
import loadingAnimation from '../../public/loading.json';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
        <div className="text-center max-w-sm w-full">
          {/* Lottie Animation */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto mb-6">
            <Lottie
              animationData={loadingAnimation}
              loop={true}
              autoplay={true}
              className="w-full h-full"
            />
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <div className="text-white text-lg sm:text-xl font-medium">
              Đang xác thực phiên đăng nhập...
            </div>
            <div className="text-gray-400 text-sm sm:text-base">Vui lòng chờ trong giây lát</div>
          </div>
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
