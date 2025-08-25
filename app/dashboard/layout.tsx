import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Bblip - Crypto Card Management',
  description: 'Manage your Bblip crypto cards, track rewards, view referral stats, and access exclusive features. Your personal crypto card dashboard.',
  keywords: 'crypto dashboard, bblip dashboard, crypto card management, referral tracking, rewards dashboard',
  openGraph: {
    title: 'Dashboard | Bblip - Crypto Card Management',
    description: 'Manage your Bblip crypto cards, track rewards, view referral stats, and access exclusive features.',
    images: ['/twitter-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dashboard | Bblip - Crypto Card Management',
    description: 'Manage your Bblip crypto cards, track rewards, view referral stats, and access exclusive features.',
    images: ['/twitter-image.png'],
  },
};

export default function DashboardLayout({
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
