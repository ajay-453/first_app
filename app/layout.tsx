import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3P Explorer',
  description: 'Get the Top 3 for any topic, powered by AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
