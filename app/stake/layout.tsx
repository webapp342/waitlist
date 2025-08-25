import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stake BBLP Tokens | Bblip - Earn Passive Income & Rewards',
  description: 'Stake your BBLP tokens and earn passive income through our secure staking platform. Multiple staking pools with competitive APY rates.',
  keywords: 'BBLP staking, crypto staking, passive income, staking rewards, bblip staking, yield farming',
  openGraph: {
    title: 'Stake BBLP Tokens | Bblip - Earn Passive Income & Rewards',
    description: 'Stake your BBLP tokens and earn passive income through our secure staking platform.',
    images: ['/twitter-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stake BBLP Tokens | Bblip - Earn Passive Income & Rewards',
    description: 'Stake your BBLP tokens and earn passive income through our secure staking platform.',
    images: ['/twitter-image.png'],
  },
};

export default function StakeLayout({
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
