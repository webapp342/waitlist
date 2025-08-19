'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ReferralPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to airdrop page immediately
    router.push('/airdrop');
  }, [router]);

  // Show minimal loading state while redirecting
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
      </div>
    </main>
  );
} 