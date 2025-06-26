"use client";

import CTA from "@/components/cta";
import Form from "@/components/form";
import Logos from "@/components/logos";
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // If already connected when page loads, redirect to dashboard
    if (isConnected) {
      router.replace('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8">
        <Header />
        <CTA />
        <Form />
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
    </main>
  );
}
