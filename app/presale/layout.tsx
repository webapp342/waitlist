import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BBLP Token Presale | Bblip - Early Access Crypto Investment',
  description: 'Join the BBLP token presale and get early access to Bblip\'s revolutionary crypto payment platform. Limited time opportunity with exclusive bonuses.',
  keywords: 'BBLP presale, token presale, crypto presale, bblip token, early investment, crypto launch',
  openGraph: {
    title: 'BBLP Token Presale | Bblip - Early Access Crypto Investment',
    description: 'Join the BBLP token presale and get early access to Bblip\'s revolutionary crypto payment platform.',
    images: ['/twitter-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BBLP Token Presale | Bblip - Early Access Crypto Investment',
    description: 'Join the BBLP token presale and get early access to Bblip\'s revolutionary crypto platform.',
    images: ['/twitter-image.png'],
  },
};

export default function PresaleLayout({
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
