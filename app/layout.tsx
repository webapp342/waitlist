import "@/lib/indexedDbPolyfill";
import "./globals.css";
import type { Metadata } from "next";
import { Figtree, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

const FigtreeFont = Figtree({ subsets: ["latin"] });
const SpaceGroteskFont = Space_Grotesk({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-space-grotesk'
});

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
    "digital currency cards",
    "bblip",
    "bblip.io",
    "bblip.com",
    "bblip.net",
    "bblip.org",
    "bblip.co",
    "btc card",
    "eth card",
    "solana card",
    "cardano card",
    "dogecoin card",
    "shiba inu card",
    "litecoin card",
    "ethereum card",
    "bitcoin card",
    "bblip card",
    "bblip.de",
    "bblip protocol",
    "bblip protocol card", 
    "bblip finance",
    "bblip finance card",
    "bblip finance protocol",
    "bblip finance protocol card",  
  ],
  authors: [{ name: "Bblip Team" }],
  creator: "Bblip",
  publisher: "Bblip",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://bblip.io'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'tr-TR': '/tr-TR',
    },
  },
  openGraph: {
    title: "Bblip - Spend Any Crypto, Anywhere",
    description: "Transform your crypto into spendable currency with virtual and physical cards. Accepted at 40M+ merchants worldwide with zero hidden fees.",
    url: 'https://bblip.io',
    siteName: 'Bblip',
    images: [
      {
        url: '/twitter-image.png',
        width: 1200,
        height: 630,
        alt: 'Bblip Crypto Cards - Spend Any Crypto, Anywhere with Virtual & Physical Cards',
        type: 'image/png',
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
    site: '@bblip',
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
  other: {
    'apple-mobile-web-app-title': 'Bblip',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
    'theme-color': '#fbbf24',
    'msapplication-TileColor': '#fbbf24',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress SES deprecation warnings
              const originalConsoleWarn = console.warn;
              console.warn = function(...args) {
                const message = args.join(' ');
                if (message.includes('dateTaming') || message.includes('mathTaming') || message.includes('SES')) {
                  return; // Suppress SES warnings
                }
                originalConsoleWarn.apply(console, args);
              };

              // Suppress CSP violations for known safe scripts
              const originalConsoleError = console.error;
              console.error = function(...args) {
                const message = args.join(' ');
                if (message.includes('Content-Security-Policy') && message.includes('unsafe-inline')) {
                  return; // Suppress CSP warnings for inline scripts
                }
                originalConsoleError.apply(console, args);
              };

              // Global error handler for wallet-related errors
              window.addEventListener('error', function(event) {
                if (event.filename && (
                  event.filename.includes('lockdown-install.js') ||
                  event.filename.includes('inpage.js') ||
                  event.filename.includes('wallet')
                )) {
                  event.preventDefault();
                  return false;
                }
              });

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FinancialService",
              "name": "Bblip",
              "description": "Transform your crypto into spendable currency with Bblip's virtual and physical cards. Accepted at 40M+ merchants worldwide.",
              "url": "https://bblip.io",
              "logo": "https://bblip.io/bblip-logo.svg",
              "image": "https://bblip.io/twitter-image.png",
              "sameAs": [
                "https://twitter.com/bblip",
                "https://discord.gg/bblip",
                "https://t.me/bblip"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["English", "Turkish"]
              },
              "areaServed": "Worldwide",
              "serviceType": "Cryptocurrency Payment Cards",
              "offers": {
                "@type": "Offer",
                "description": "Virtual and physical crypto cards with zero hidden fees",
                "price": "0",
                "priceCurrency": "USD"
              },
              "foundingDate": "2024",
              "category": "Cryptocurrency Payment Platform"
            })
          }}
        />
      </head>
      <body className={`${FigtreeFont.className} ${SpaceGroteskFont.variable}`}>
        <Providers>
          {children}
          <Toaster 
            richColors 
            position="top-center" 
            toastOptions={{
              duration: 3000,
            }}
          />
                  <SpeedInsights />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
