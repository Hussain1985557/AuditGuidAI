import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { CrossViewProvider } from '@/lib/crossView';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NBB Internal Audit',
  description: 'National Bank of Bahrain internal audit, risk and controls analytics platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <CrossViewProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="main-panel">{children}</main>
          </div>
        </CrossViewProvider>
      </body>
    </html>
  );
}
