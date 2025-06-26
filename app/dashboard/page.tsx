"use client";

import DashboardCTA from "@/components/dashboard-cta";
import Logos from "@/components/logos";
import Particles from "@/components/ui/particles";
import DashboardHeader from "@/components/dashboard-header";
import Footer from "@/components/footer";
import DebugChain from "@/components/debug-chain";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { userData } = useWallet();

  // Clear any existing toasts on dashboard load
  useEffect(() => {
    toast.dismiss();
  }, []);

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null; // Don't render anything while redirecting
  }

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8">
        <DashboardHeader />

        <DashboardCTA userData={userData} />

        <Logos />
      </section>

      <Footer />

      <Particles
        quantityDesktop={150}
        quantityMobile={50}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
      
      <DebugChain />
    </main>
  );
} 