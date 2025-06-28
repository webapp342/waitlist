'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Particles from "@/components/ui/particles";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { usePresale } from '@/hooks/usePresale';
import { TOKEN_IDS } from '@/config/presale';
import { formatUnits } from 'ethers';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { Info, ChevronDown, ChevronUp, TrendingUp, Shield, Clock, DollarSign, Zap } from 'lucide-react';

const PAYMENT_TOKENS = [
  { id: TOKEN_IDS.bnb, name: 'BNB', icon: '/bnb.svg', color: 'from-yellow-600 to-yellow-400' },
  { id: TOKEN_IDS.usdt, name: 'USDT', icon: '/usdt.svg', color: 'from-green-600 to-green-400' },
  { id: TOKEN_IDS.busd, name: 'BUSD', icon: '/busd.svg', color: 'from-blue-600 to-blue-400' },
];

function PresalePageInner() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desiredTokens, setDesiredTokens] = useState('');
  const [selectedToken, setSelectedToken] = useState<number>(TOKEN_IDS.bnb);
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasAllowance, setHasAllowance] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { 
    presaleInfo, 
    paymentTokens, 
    loading,
    checkAllowance,
    approveToken,
    buyTokens,
    calculatePaymentAmount,
    TOKEN_PRICES
  } = usePresale();

  // Set desired tokens from URL parameter
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam)) && Number(amountParam) > 0) {
      setDesiredTokens(amountParam);
    }
  }, [searchParams]);

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Calculate payment amount when desired tokens or selected token changes
  useEffect(() => {
    const updatePaymentAmount = async () => {
      if (desiredTokens) {
        const amount = await calculatePaymentAmount(selectedToken, desiredTokens);
        setPaymentAmount(amount);
        
        // Check allowance for the calculated payment amount
        if (selectedToken !== TOKEN_IDS.bnb) {
          try {
            const allowance = await checkAllowance(selectedToken, formatUnits(amount, 18));
            setHasAllowance(BigInt(allowance) >= BigInt(amount));
          } catch (err) {
            console.error('Error checking allowance:', err);
            setHasAllowance(false);
          }
        } else {
          setHasAllowance(true);
        }
      } else {
        setPaymentAmount('0');
        setHasAllowance(false);
      }
    };

    updatePaymentAmount();
  }, [desiredTokens, selectedToken, calculatePaymentAmount, checkAllowance]);

  if (!isConnected) {
    return null; // Don't render anything while redirecting
  }

  const handleApprove = async () => {
    if (!paymentAmount || paymentAmount === '0') return;
    
    try {
      setIsApproving(true);
      setStatusMessage('Approving tokens...');
      await approveToken(selectedToken, formatUnits(paymentAmount, 18));
      setStatusMessage('Tokens approved successfully!');
      
      // Re-check allowance
      const allowance = await checkAllowance(selectedToken, formatUnits(paymentAmount, 18));
      setHasAllowance(BigInt(allowance) >= BigInt(paymentAmount));
    } catch (err: any) {
      console.error('Approval failed:', err);
      if (err.message.includes('User rejected')) {
        setError('Approval was cancelled by user');
      } else {
        setError(err.message || 'Failed to approve tokens');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!paymentAmount || paymentAmount === '0') return;
    
    try {
      setIsBuying(true);
      setStatusMessage(selectedToken === TOKEN_IDS.bnb ? 'Buying with BNB...' : 'Buying with tokens...');
      await buyTokens(selectedToken, formatUnits(paymentAmount, 18));
      setStatusMessage('Purchase successful!');
      setDesiredTokens('');
      setPaymentAmount('0');
    } catch (err: any) {
      console.error('Purchase failed:', err);
      if (err.message.includes('User rejected')) {
        setError('Transaction was cancelled by user');
      } else {
        setError(err.message || 'Failed to complete the purchase');
      }
    } finally {
      setIsBuying(false);
    }
  };

  const formatPrice = (price: string): string => {
    return (Number(price) / 1e8).toFixed(2);
  };

  const selectedTokenData = PAYMENT_TOKENS.find(t => t.id === selectedToken);
  const selectedTokenName = selectedTokenData?.name || 'BNB';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
          <p className="mt-4 text-gray-400">Loading presale information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-32 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              Buy BBLIP
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Join the presale and get BBLIP at the <span className="text-yellow-200 font-semibold">best price!</span>
            </p>
          </div>

          {/* Presale Progress Stepper */}
          <div className="mb-8">
            <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-2xl border border-yellow-400/10 p-6 shadow-[0_0_50px_-12px] shadow-yellow-400/10">
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 z-0"></div>
                <div className="absolute top-1/2 left-0 w-2/3 h-0.5 bg-yellow-400 -translate-y-1/2 z-0"></div>

                {/* Stage 1 - Seed Sale (Completed) */}
                <div className="flex flex-col items-center relative z-10 bg-[#0A0A0A] px-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-white mb-1">Seed Sale</h3>
                    <p className="text-xs text-gray-400 mb-2">Completed</p>
                    <p className="text-lg font-bold text-white">$0.07</p>
                  </div>
                </div>

                {/* Stage 2 - Presale (Active) */}
                <div className="flex flex-col items-center relative z-10 bg-[#0A0A0A] px-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-yellow-300 flex items-center justify-center mb-3 shadow-lg shadow-yellow-400/25">
                    <span className="text-black font-bold text-sm">02</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-yellow-400 mb-1">Presale</h3>
                    <p className="text-xs text-yellow-300 mb-2">Active Now</p>
                    <p className="text-lg font-bold text-yellow-400">$0.10</p>
                  </div>
                </div>

                {/* Stage 3 - Public Launch */}
                <div className="flex flex-col items-center relative z-10 bg-[#0A0A0A] px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-700/50 border-2 border-zinc-600 flex items-center justify-center mb-3">
                    <span className="text-zinc-400 font-bold text-sm">03</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-1">Public Launch</h3>
                    <p className="text-xs text-zinc-400 mb-2">Coming Soon</p>
                    <p className="text-lg font-bold text-zinc-300">$0.14</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Presale Card */}
          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-3xl border border-yellow-400/10 p-6 md:p-8 mb-6 shadow-[0_0_50px_-12px] shadow-yellow-400/10">
            
            {/* Presale Info Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-xl bg-black/60 border border-yellow-400/10">
                <p className="text-lg font-bold text-yellow-200">$0.10</p>
                <p className="text-xs text-gray-400">Token Price</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-black/60 border border-yellow-400/10">
                <p className="text-lg font-bold text-white">0</p>
                <p className="text-xs text-gray-400">Purchased</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-black/60 border border-yellow-400/10">
                <p className="text-lg font-bold text-yellow-200">Presale</p>
                <p className="text-xs text-gray-400">Round 2</p>
              </div>
            </div>

            {/* Token Amount Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Tokens to Purchase</label>
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  placeholder="1000"
                  value={desiredTokens}
                  onChange={(e) => setDesiredTokens(e.target.value)}
                  className="h-12 md:h-14 text-lg font-semibold bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 pr-16 rounded-xl"
                  disabled={loading || presaleInfo?.isPaused}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  BBLIP
                </div>
              </div>
            </div>

            {/* Payment Token Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedToken(token.id)}
                    className={cn(
                      "p-3 md:p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-300 border-2",
                      selectedToken === token.id 
                        ? 'bg-yellow-400/10 border-yellow-400/60 scale-105 shadow-lg' 
                        : 'bg-black/30 border-yellow-400/10 hover:border-yellow-400/30 hover:scale-102'
                    )}
                  >
                    <Image src={token.icon} alt={token.name} width={32} height={32} className="mb-2" />
                    <span className="font-medium text-sm text-white">{token.name}</span>
                    <span className="text-xs text-gray-400">${formatPrice(TOKEN_PRICES[token.id])}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Summary - Compact Design */}
            {desiredTokens && paymentAmount !== '0' && (
              <div className="p-4 rounded-xl bg-black/60 border border-yellow-400/10 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-yellow-200" />
                  <h3 className="text-sm font-medium text-white">Payment Summary</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-400">Amount</p>
                    <p className="font-semibold text-white">{desiredTokens} BBLIP</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost</p>
                    <p className="font-semibold text-white">{Number(formatUnits(paymentAmount, 18)).toFixed(6)} {selectedTokenName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Rate</p>
                    <p className="text-sm text-gray-400">$0.10 per token</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Status Messages */}
            {(error || statusMessage) && (
              <div className={cn(
                "w-full mb-4 p-3 rounded-xl text-center font-medium border flex items-center justify-center gap-2",
                error 
                  ? 'bg-red-500/10 text-red-300 border-red-500/20' 
                  : 'bg-green-500/10 text-green-300 border-green-500/20'
              )}>
                {error ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin"></div>
                )}
                {error || statusMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {selectedToken !== TOKEN_IDS.bnb && !hasAllowance && paymentAmount !== '0' && (
                <Button
                  className={cn(
                    "w-full bg-yellow-200 hover:bg-yellow-300 text-black font-medium shadow-lg h-12 md:h-14",
                    "transition-all duration-300"
                  )}
                  size="lg"
                  disabled={isApproving || !desiredTokens}
                  onClick={handleApprove}
                >
                  {isApproving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Approving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Approve {selectedTokenName}
                    </div>
                  )}
                </Button>
              )}

              <Button
                className={cn(
                  "w-full bg-yellow-200 hover:bg-yellow-300 text-black font-medium shadow-lg h-12 md:h-14",
                  "transition-all duration-300"
                )}
                size="lg"
                disabled={
                  isBuying || 
                  !desiredTokens || 
                  paymentAmount === '0' || 
                  (selectedToken !== TOKEN_IDS.bnb && !hasAllowance)
                }
                onClick={handleBuy}
              >
                {isBuying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Buy with {selectedTokenName}
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Presale Details Accordion - Compact */}
          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-xl border border-yellow-400/10 overflow-hidden mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-yellow-200" />
                <div>
                  <h3 className="text-sm font-medium text-white">Presale Details</h3>
                  <p className="text-xs text-gray-400">Terms and information</p>
                </div>
              </div>
              {showDetails ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {showDetails && (
              <div className="px-4 pb-4 border-t border-yellow-400/10">
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Current Price</h4>
                      <p className="text-xs text-gray-400">$0.10 per BBLIP token (Presale Round 2)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Secure Purchase</h4>
                      <p className="text-xs text-gray-400">Multiple payment options with smart contract security</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Early Bird Pricing</h4>
                      <p className="text-xs text-gray-400">Available during presale period only</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
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