import './globals.css';
import Navbar from '@/components/Navbar'; 
import type { Metadata } from 'next';
import { Cormorant } from 'next/font/google';

const cormorant = Cormorant({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cormorant.className}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
