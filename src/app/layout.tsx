import type { Metadata } from "next";
import Navbar from '@/components/Navbar';
import RouteScopedFloatingTerminal from "@/components/RouteScopedFloatingTerminal";
import { Cormorant } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";

const cormorant = Cormorant({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-cormorant',
});

const SITE_URL = "https://jordidimas.com";
const OG_IMAGE = "https://utfs.io/f/c07cbb6c-bf22-46bc-bdc3-c711408f5856-1xaifo.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jordi Dimas",
    template: "%s | Jordi Dimas",
  },
  description: "Software developer from Guatemala with a deep fascination for physics, systems theory, and computer science.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Jordi Dimas",
    title: "Jordi Dimas",
    description: "Software developer from Guatemala with a deep fascination for physics, systems theory, and computer science.",
    images: [{ url: OG_IMAGE, width: 400, height: 400, alt: "Jordi Dimas" }],
  },
  twitter: {
    card: "summary",
    title: "Jordi Dimas",
    description: "Software developer from Guatemala with a deep fascination for physics, systems theory, and computer science.",
    creator: "@jordidimass",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: "google22661a48ab83bd48",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  "url": SITE_URL,
                  "name": "Jordi Dimas",
                  "description": "Software developer from Guatemala with a deep fascination for physics, systems theory, and computer science.",
                },
                {
                  "@type": "Person",
                  "@id": `${SITE_URL}/#person`,
                  "name": "Jordi Dimas",
                  "url": SITE_URL,
                  "image": OG_IMAGE,
                  "sameAs": [
                    "https://x.com/jordidimass",
                    "https://github.com/jordidimass",
                    "https://www.linkedin.com/in/jordidimass/",
                    "https://instagram.com/jordidimass",
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${cormorant.variable} ${GeistSans.variable} font-sans antialiased`}>
        <Navbar />
        <main className="pt-16">
          {children}
          {isVercel ? <Analytics /> : null}
        </main>
        <RouteScopedFloatingTerminal />
      </body>
    </html>
  );
}