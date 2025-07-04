'use client';

import { useEffect, useState } from 'react';
import { SwapInterface } from '@/components/swap/SwapInterface';
import Header from "@/components/header";
import Footer from "@/components/footer";
import Particles from "@/components/ui/particles";
import { cn } from "@/lib/utils";
import SwapAuthGuard from '@/components/SwapAuthGuard';
import Image from "next/image";

// Enhanced styles from stake page
const glowStyles = `
  [&]:before:absolute [&]:before:inset-0 
  [&]:before:rounded-3xl
  [&]:before:bg-gradient-to-r [&]:before:from-blue-500/10 [&]:before:via-purple-500/10 [&]:before:to-blue-500/10
  [&]:before:animate-glow [&]:before:blur-xl
  relative overflow-hidden
`;

const shimmerStyles = `
  [&]:before:absolute [&]:before:inset-0 
  [&]:before:bg-gradient-to-r [&]:before:from-transparent [&]:before:via-white/10 [&]:before:to-transparent
  [&]:before:animate-[shimmer_2s_infinite] [&]:before:content-['']
  relative overflow-hidden
`;

function SwapContent() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
          <Header />
          <div className="flex items-center justify-center py-20 mt-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
              <Image 
                src="/logo.svg" 
                alt="BBLP" 
                width={32} 
                height={32} 
                className="absolute inset-0 m-auto animate-pulse" 
              />
            </div>
          </div>
        </section>
        <Particles
          quantityDesktop={80}
          quantityMobile={30}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
      <section className="flex flex-col items-center  w-full">
        <Header />
        
        {/* Page Title */}
        <div className="text-center mt-20 pt-10  mb-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
            Swap Tokens
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Exchange tokens seamlessly on <span className="text-yellow-200 font-semibold">BSC Network</span>
          </p>
        </div>

        {/* Swap Interface */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 lg:gap-8">
            <div className="order-1 lg:order-1">
              <div className={cn(
                "p-0 md:p-0 mb-6 relative z-10",
              )}>
                <SwapInterface />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Particles
        quantityDesktop={80}
        quantityMobile={30}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
}

export default function SwapPage() {
  return (
    <SwapAuthGuard>
      <SwapContent />
    </SwapAuthGuard>
  );
} 