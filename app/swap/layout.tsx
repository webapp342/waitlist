import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Swap Cryptocurrencies | Bblip - Fast & Secure Token Exchange',
  description: 'Swap cryptocurrencies instantly with Bblip\'s secure DEX aggregator. Best rates, low fees, and support for 100+ tokens across multiple chains.',
  keywords: 'crypto swap, token exchange, DEX, cryptocurrency trading, bblip swap, token swap, defi exchange',
  openGraph: {
    title: 'Swap Cryptocurrencies | Bblip - Fast & Secure Token Exchange',
    description: 'Swap cryptocurrencies instantly with Bblip\'s secure DEX aggregator.',
    images: ['/twitter-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swap Cryptocurrencies | Bblip - Fast & Secure Token Exchange',
    description: 'Swap cryptocurrencies instantly with Bblip\'s secure DEX aggregator.',
    images: ['/twitter-image.png'],
  },
};

export default function SwapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
