"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Container from "@/components/container";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AirdropPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // Wallet bağlı değilse ana sayfaya yönlendir
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  // Wallet bağlı değilse loading göster
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-200 mx-auto mb-4"></div>
          <p className="text-zinc-400">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <section className="w-full pt-32 pb-16">
        <Container size="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-white">
                Airdrop
              </h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                Bblip token airdrop programına hoş geldiniz. Yakında burada airdrop işlemlerinizi gerçekleştirebileceksiniz.
              </p>
            </div>
            
            <div className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-8 max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-yellow-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-lg font-semibold">Wallet Connected</span>
                </div>
                <p className="text-zinc-400">
                  Airdrop sayfası yakında aktif olacak. Geliştirme aşamasında...
                </p>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
} 