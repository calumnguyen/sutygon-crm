import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TabProvider } from '@/context/TabContext';
import { UserProvider } from '@/context/UserContext';
import PusherProvider from '@/components/common/PusherProvider';

export const metadata: Metadata = {
  title: 'Sutygon CRM',
  description: 'Sutygon CRM - Your Business Management Solution',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 min-h-screen`}>
        <UserProvider>
          <TabProvider>
            <PusherProvider>{children}</PusherProvider>
          </TabProvider>
        </UserProvider>
      </body>
    </html>
  );
}
