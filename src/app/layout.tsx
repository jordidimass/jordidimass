import type { Metadata } from "next";
import Navbar from '@/components/Navbar'; 
import { Cormorant } from 'next/font/google';
import "./globals.css";

const cormorant = Cormorant({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Jordi Dimas",
  description: "Welcome to my place on the internet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cormorant.className} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}