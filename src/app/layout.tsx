import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TabProvider } from '@/context/TabContext';

export const metadata: Metadata = {
  title: 'Sutygon CRM',
  description: 'Sutygon CRM - Your Business Management Solution',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 min-h-screen`}>
        <TabProvider>{children}</TabProvider>
      </body>
    </html>
  );
}
