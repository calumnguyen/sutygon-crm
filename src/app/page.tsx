'use client';
import React, { useState, useEffect } from 'react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { AppProvider } from '@/context/AppContext';
import ClientLayout from './ClientLayout';
import { useRouter } from 'next/navigation';
import TabContent from '@/components/tabs/TabContent';

export default function Home() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storeCode = localStorage.getItem('storeCode');
    if (!storeCode) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return <div />; // or a loading spinner
  }

  return (
    <AppProvider>
      <ClientLayout>
        <BrowserTabBar />
        <TabContent />
      </ClientLayout>
    </AppProvider>
  );
}
