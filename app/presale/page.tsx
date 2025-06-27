'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Particles from "@/components/ui/particles";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { usePresale } from '@/hooks/usePresale';
import { TOKEN_IDS } from '@/config/presale';
import { formatUnits } from 'ethers';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import TextBlur from "@/components/ui/text-blur";
import AnimatedShinyText from "@/components/ui/shimmer-text";

const PAYMENT_TOKENS = [
  { id: TOKEN_IDS.bnb, name: 'BNB', icon: '💎', color: 'from-yellow-600 to-yellow-400' },
  { id: TOKEN_IDS.usdt, name: 'USDT', icon: '💵', color: 'from-green-600 to-green-400' },
  { id: TOKEN_IDS.busd, name: 'BUSD', icon: '💰', color: 'from-blue-600 to-blue-400' },
];

export default function PresalePage() {
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
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full max-w-4xl">
          <div className="text-center">
            <div className="text-2xl text-white mb-4">Loading presale information...</div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          </div>
        </section>
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

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
      <motion.section 
        className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
            ← Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-center mb-4">
            <div className="flex w-fit items-center justify-center rounded-full bg-muted/80 text-center">
              <AnimatedShinyText className="px-4 py-1">
                <span>🚀 Token Presale is Live!</span>
              </AnimatedShinyText>
            </div>
          </div>
          
          <TextBlur
            className="text-4xl font-bold text-white mb-2"
            text="Token Presale"
          />
          <p className="text-gray-400">Purchase tokens at presale price with multiple payment options</p>
        </motion.div>

        {/* Status/Error Messages */}
        {(error || statusMessage) && (
          <motion.div variants={itemVariants} className="w-full max-w-md mb-6">
            <div className={`p-4 rounded-xl text-center font-medium ${
              error 
                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                : 'bg-green-500/20 text-green-300 border border-green-500/50'
            }`}>
              {error || statusMessage}
            </div>
          </motion.div>
        )}

        {/* Presale Info */}
        {presaleInfo && (
          <motion.div variants={itemVariants} className="w-full max-w-md mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="font-semibold mb-4 text-center">📊 Presale Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Token Price</p>
                  <p className="font-semibold">${formatPrice(TOKEN_PRICES.tokenPriceUSD)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Your Purchased</p>
                  <p className="font-semibold">{Number(formatUnits(presaleInfo.userTokensPurchased, 18)).toFixed(2)}</p>
                </div>
              </div>
              {presaleInfo.isPaused && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm text-center">⚠️ Presale is currently paused</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Presale Card */}
        <motion.div variants={itemVariants} className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="space-y-6">
            
            {/* Payment Token Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedToken(token.id)}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                      selectedToken === token.id
                        ? 'bg-blue-500/20 border-2 border-blue-500/50 scale-105 shadow-lg'
                        : 'bg-white/5 border-2 border-transparent hover:border-blue-500/30 hover:scale-102'
                    }`}
                  >
                    <span className="text-2xl mb-2">{token.icon}</span>
                    <span className="font-medium text-sm">{token.name}</span>
                    <span className="text-xs text-gray-400">${formatPrice(TOKEN_PRICES[token.id])}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Tokens to Purchase</label>
              <Input
                type="number"
                placeholder="Enter desired token amount"
                value={desiredTokens}
                onChange={(e) => setDesiredTokens(e.target.value)}
                className="w-full"
                disabled={loading || presaleInfo?.isPaused}
              />
            </div>

            {/* Payment Calculation */}
            {desiredTokens && paymentAmount !== '0' && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
                <div className="text-sm text-gray-400 mb-2">💰 Payment Summary</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Amount:</span>
                    <span className="font-semibold">{desiredTokens} TOKENS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cost:</span>
                    <span className="font-semibold">{Number(formatUnits(paymentAmount, 18)).toFixed(6)} {selectedTokenName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Rate:</span>
                    <span className="text-sm text-gray-400">${formatPrice(TOKEN_PRICES.tokenPriceUSD)} per token</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {selectedToken !== TOKEN_IDS.bnb && !hasAllowance && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                  onClick={handleApprove}
                  disabled={!desiredTokens || paymentAmount === '0' || presaleInfo?.isPaused || isApproving}
                >
                  {isApproving ? 'Approving...' : `Approve ${selectedTokenName}`}
                </Button>
              )}

              <Button
                className={`w-full bg-gradient-to-r ${selectedTokenData?.color || 'from-blue-600 to-purple-600'} hover:opacity-90`}
                size="lg"
                onClick={handleBuy}
                disabled={!desiredTokens || paymentAmount === '0' || presaleInfo?.isPaused || isBuying || (!hasAllowance && selectedToken !== TOKEN_IDS.bnb)}
              >
                {presaleInfo?.isPaused 
                  ? 'Presale Paused'
                  : isBuying
                    ? 'Processing...'
                    : `Buy with ${selectedTokenName} ${selectedTokenData?.icon || ''}`}
              </Button>
            </div>

            {/* Helper Text */}
            {selectedToken !== TOKEN_IDS.bnb && !hasAllowance && !isApproving && !isBuying && (
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  💡 First approve {selectedTokenName} spending, then complete your purchase
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div variants={itemVariants} className="mt-8 text-center text-sm text-gray-400 max-w-md">
          <p className="mb-2">
            🔒 Secure token purchase with multiple payment options
          </p>
          <p>
            💎 Early bird pricing available during presale period
          </p>
        </motion.div>
      </motion.section>

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