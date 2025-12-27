import type { Metadata } from "next";
import Navbar from '@/components/Navbar'; 
import { Cormorant } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react"
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
  const isVercel = process.env.VERCEL === "1";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${cormorant.className} antialiased`}>
        <Navbar />
        <div className="pt-16">
          {children}
          {isVercel ? <Analytics /> : null}
        </div>
      </body>
    </html>
  );
}