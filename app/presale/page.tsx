'use client';

// Window type declarations for mobile wallets
declare global {
  interface Window {
    ethereum?: any;
    web3?: {
      currentProvider?: any;
    };
    trustwallet?: any;
    providers?: any[];
  }
}

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useAccount, useSwitchChain, useBalance, useWalletClient } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Info, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { userService, cardService } from '@/lib/supabase';
import { useChainId } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';

function PresalePageInner() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDetails, setShowDetails] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { userData } = useWallet();

  // Phase 3 countdown states (15 days from now)
  const [phase3Timer, setPhase3Timer] = useState({
    daysLeft: 15,
    hoursLeft: 0,
    minutesLeft: 0,
    secondsLeft: 0
  });

  // Phase 3 countdown timer (August 10th 12:00 UTC) - Updated every second
  useEffect(() => {
    const phase3Date = new Date('2025-08-10T12:00:00Z'); // August 10th 12:00 UTC
    
    const updatePhase3Timer = () => {
      const now = new Date();
      const timeLeft = phase3Date.getTime() - now.getTime();
      
      if (timeLeft <= 0) {
        setPhase3Timer({ daysLeft: 0, hoursLeft: 0, minutesLeft: 0, secondsLeft: 0 });
        return;
      }
      
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      setPhase3Timer({ daysLeft, hoursLeft, minutesLeft, secondsLeft });
    };
    
    updatePhase3Timer();
    const interval = setInterval(updatePhase3Timer, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Save user to database when wallet is connected
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully from presale page');
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address]);

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-20 md:pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
            Phase 2 Sold Out !

            </h1>
         
          </div>

          {/* Phase 2 Completed Announcement */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-4 py-6 md:p-8 mb-6 shadow-xl">
            
            {/* Phase 2 Status */}
            <div className="text-center mb-6">
            
           
              <p className="text-gray-400 text-sm">
                Phase 2 has <span className="text-green-400 font-semibold">raised $2.5M</span> and completely<span className="text-red-400 font-semibold"> sold out</span> at $0.10 per BBLP.
              </p>
            </div>

            {/* What's Next Section */}
            <div className="bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 mt-1">
                  <ArrowRight className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Phase 3 – August 10, 12:00 UTC (Whitelist Only)</h3>
                  <p className="text-gray-300 text-sm mb-4">
                
                  Be part of the final round. Join the whitelist now and secure your allocation.                 </p>
                  
                  {/* Phase 3 Countdown */}
                  <div className="bg-zinc-700/50 rounded-xl p-4 mb-4">
                    <div className="text-center mb-3">
                      <p className="text-sm text-gray-400 mb-2">Phase 3 starts in:</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-white">{String(phase3Timer.daysLeft).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400">Days</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{String(phase3Timer.hoursLeft).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400">Hours</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{String(phase3Timer.minutesLeft).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400">Min</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{String(phase3Timer.secondsLeft).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400">Sec</div>
                      </div>
                    </div>
                  </div>

                  {/* Join Whitelist CTA */}
                  {isConnected ? (
                    <Link href="/whitelist" className="block">
                      <Button className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-yellow-400/25">
                        Join Whitelist
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-yellow-400/25"
                      onClick={() => setShowWalletModal(true)}
                    >
                      Join Whitelist
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Phase Summary */}
            <div className="space-y-3 mb-6">
              {/* Phase 1 - Completed with strikethrough and sold out effects */}
              <div className="flex items-center justify-between p-3 bg-gray-500/5 border border-gray-500/20 rounded-lg opacity-60 relative">
                {/* Diagonal strikethrough line */}
              
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-400 line-through">Phase 1</span>
                    <p className="text-xs text-gray-500 line-through">$0.07 per BBLP</p>
                  </div>
                </div>
                <div className="relative z-10">
                  <span className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">SOLD OUT </span>
                </div>
              </div>

              {/* Phase 2 - Completed with strikethrough and sold out effects */}
              <div className="flex items-center justify-between p-3 bg-gray-500/5 border border-gray-500/20 rounded-lg opacity-60 relative">
                {/* Diagonal strikethrough line */}
            
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-400 line-through">Phase 2</span>
                    <p className="text-xs text-gray-500 line-through">$0.10 per BBLP</p>
                  </div>
                </div>
                <div className="relative z-10">
                  <span className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">SOLD OUT </span>
                </div>
              </div>

              {/* Phase 3 - Active and highlighted */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border-2 border-yellow-400/30 rounded-lg shadow-lg shadow-yellow-400/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center animate-pulse">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Phase 3</span>
                    <p className="text-xs text-yellow-400 font-medium">$0.14 per BBLP</p>
                  </div>
                </div>
                <span className="text-xs text-yellow-400 font-bold bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-full animate-pulse">Aug 10, 12:00 UTC</span>
              </div>
            </div>

            {/* Key Information */}
            <div className="bg-zinc-800/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Important Information</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>Phase 3 will be the final presale round before public launch</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>Whitelist members get guaranteed allocation and priority access</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>No public sale will be available after Phase 3 ends</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 Details Accordion */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                    <Info className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Phase 3 Details</h3>
                    <p className="text-xs text-gray-500">Learn more about the upcoming presale</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden md:inline">
                    {showDetails ? 'Hide' : 'Show'}
                  </span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
              
              {showDetails && (
                <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-zinc-700">
                  <div className="space-y-4 pt-4 md:pt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                     
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">Token Price</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">$0.14 per BBLP token</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                     
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">Whitelist Access</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">Exclusive access for registered users</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                     
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">Networks</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">Ethereum & BSC networks</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                   
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">Final Opportunity</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">Last chance before public launch</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
                  
        <Particles
          quantityDesktop={30}
          quantityMobile={15}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
      
      {/* Wallet Connection Modal */}
      <WalletModal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </>
  );
}

export default function PresalePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <PresalePageInner />
    </Suspense>
  );
}