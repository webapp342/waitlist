import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ETH Yield Vault | Bblip',
  description: 'Bblip ETH Yield Vault allows you to earn passive income on your Ethereum holdings through secure, automated strategies. Access staking, restaking, and DeFi yield opportunities with just one click. On-chain, transparent, and optimized for maximum returns.',
  keywords: 'ETH staking, yield farming, cryptocurrency, DeFi, Ethereum, rewards',
  openGraph: {
    title: 'ETH Yield Vault  | Bblip',
    description: 'Bblip ETH Yield Vault allows you to earn passive income on your Ethereum holdings through secure, automated strategies. Access staking, restaking, and DeFi yield opportunities with just one click. On-chain, transparent, and optimized for maximum returns.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ETH Yield Vault | Bblip',
    description: 'Bblip ETH Yield Vault allows you to earn passive income on your Ethereum holdings through secure, automated strategies. Access staking, restaking, and DeFi yield opportunities with just one click. On-chain, transparent, and optimized for maximum returns.',
  },
};

export default function EthYieldLayout({
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