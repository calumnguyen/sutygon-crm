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
    <html lang="en">
      <body className={inter.className}>
        <TabProvider>{children}</TabProvider>
      </body>
    </html>
  );
}
