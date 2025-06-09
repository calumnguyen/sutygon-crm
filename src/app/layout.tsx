import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';
import { TabProvider } from '@/context/TabContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sutygon CRM',
  description: 'Sutygon CRM - Your Business Management Solution',
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TabProvider>
          <ClientLayout>{children}</ClientLayout>
        </TabProvider>
      </body>
    </html>
  );
};

export default Layout;
