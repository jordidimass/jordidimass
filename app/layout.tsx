import './globals.css'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Cormorant } from 'next/font/google'

const cormorant = Cormorant({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const header = ( 
    <header>
      <div>
        <Link href="/">
        <h1>Jordi</h1>
        </Link>
        <p className='py-5 text-lg'>Welcome to my place</p>
      </div>
    </header>
  );

  return (
    <html lang="en">
      <body className={cormorant.className}>{header}{children}</body>
    </html>
  );
}
