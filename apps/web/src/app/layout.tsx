import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Audit Reliability Lab',
  description: 'Supplier-audit AI reliability system with regression testing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
