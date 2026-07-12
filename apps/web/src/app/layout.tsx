import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Reliability Lab',
  description: 'Supplier-audit AI reliability system with regression testing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
