import "@/lib/indexedDbPolyfill";
import "./globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";

const FigtreeFont = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next.js + Notion — Waitlist Template",
  description:
    "A simple Next.js waitlist template with Notion as CMS and Resend to send emails created with React Email and Upstash Redis for rate limiting. Deployed on Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <meta property="og:image" content="/opengraph-image.png" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1280" />
      <meta property="og:image:height" content="832" />
      <meta
        property="og:site_name"
        content="Next.js + Notion — Waitlist Template"
      />
      <meta
        property="og:url"
        content="https://waitlist-murex-nine.vercel.app/"
      />
      <meta name="twitter:image" content="/twitter-image.png" />
      <meta name="twitter:image:type" content="image/png" />
      <meta name="twitter:image:width" content="1280" />
      <meta name="twitter:image:height" content="832" />
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
