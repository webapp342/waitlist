import "@/lib/indexedDbPolyfill";
import "./globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";

const FigtreeFont = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bblip - Spend Any Crypto, Anywhere | Virtual & Physical Crypto Cards",
  description: "Transform your crypto into spendable currency with Bblip's virtual and physical cards. Accepted at 40M+ merchants worldwide, zero hidden fees, and instant virtual cards. No KYC required for early adopters.",
  keywords: [
    "crypto cards",
    "virtual cards",
    "physical crypto cards", 
    "spend cryptocurrency",
    "crypto payment cards",
    "debit cards crypto",
    "crypto to fiat",
    "blockchain cards",
    "crypto spending",
    "digital currency cards"
  ],
  authors: [{ name: "Bblip Team" }],
  creator: "Bblip",
  publisher: "Bblip",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://bblip.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Bblip - Spend Any Crypto, Anywhere",
    description: "Transform your crypto into spendable currency with virtual and physical cards. Accepted at 40M+ merchants worldwide with zero hidden fees.",
    url: 'https://bblip.com',
    siteName: 'Bblip',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1280,
        height: 832,
        alt: 'Bblip Crypto Cards - Spend Any Crypto, Anywhere',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bblip - Spend Any Crypto, Anywhere',
    description: 'Transform your crypto into spendable currency with virtual and physical cards. Accepted at 40M+ merchants worldwide.',
    images: ['/twitter-image.png'],
    creator: '@bblip',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'Finance',
  classification: 'Cryptocurrency Payment Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>

      <body className={FigtreeFont.className}>
        <Providers>
          {children}
          <Toaster 
            richColors 
            position="top-center" 
            toastOptions={{
              duration: 3000,
            }}
          />
          <Analytics />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Clear any existing toasts on page load
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  const toasts = document.querySelectorAll('[data-sonner-toast]');
                  toasts.forEach(toast => toast.remove());
                }, 100);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
