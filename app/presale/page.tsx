'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { usePresale } from '@/hooks/usePresale';
import { TOKEN_IDS } from '@/config/presale';
import { formatUnits, parseEther } from 'ethers';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { Info, ChevronDown, ChevronUp, TrendingUp, Shield, Clock, DollarSign, Zap, Network, ArrowUpDown } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { userService, cardService } from '@/lib/supabase';
import { useChainId } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';

const PAYMENT_TOKENS = [
  { id: TOKEN_IDS.bnb, name: 'BNB', icon: '/bnb.svg', color: 'from-yellow-600 to-yellow-400' },
];

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;

function PresalePageInner() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
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
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [bnbAmount, setBnbAmount] = useState('');
  const [bblpAmount, setBblpAmount] = useState('');
  const [inputMode, setInputMode] = useState<'BNB' | 'BBLP'>('BBLP');
  const { userData } = useWallet();
  
  const { 
    presaleInfo, 
    paymentTokens, 
    loading,
    error: presaleError,
    checkAllowance,
    approveToken,
    buyTokens,
    calculatePaymentAmount,
    tokenPrices
  } = usePresale();

  // Set desired tokens from URL parameter
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam)) && Number(amountParam) > 0) {
      setDesiredTokens(amountParam);
      // Also set the BBLP amount directly for the input field
      setBblpAmount(amountParam);
      setInputMode('BBLP');
    }
  }, [searchParams]);

  // Check if user is on the correct network (BSC Mainnet - Chain ID 56)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;

  // Save user to database when wallet is connected to correct network
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address && isOnBSCMainnet) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully from presale page');
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, isOnBSCMainnet]);

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return;
    
    try {
      setIsSwitchingChain(true);
      setStatusMessage('Switching to BSC Mainnet...');
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
      setStatusMessage('Successfully switched to BSC Mainnet!');
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      if (err.code === 4001) {
        setError('Chain switch was cancelled by user');
      } else {
        setError('Failed to switch to BSC Mainnet. Please switch manually in your wallet.');
      }
    } finally {
      setIsSwitchingChain(false);
    }
  };

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
      if (desiredTokens && isOnBSCMainnet) {
        const amount = await calculatePaymentAmount(selectedToken, desiredTokens);
        setPaymentAmount(amount);
        
        // Check allowance for the calculated payment amount
        if (selectedToken !== TOKEN_IDS.bnb) {
          try {
            setIsCheckingAllowance(true);
            const allowance = await checkAllowance(selectedToken);
            setHasAllowance(BigInt(allowance) >= BigInt(amount));
          } catch (err) {
            console.error('Error checking allowance:', err);
            setHasAllowance(false);
          } finally {
            setIsCheckingAllowance(false);
          }
        } else {
          setHasAllowance(true);
          setIsCheckingAllowance(false);
        }
      } else {
        setPaymentAmount('0');
        setHasAllowance(false);
        setIsCheckingAllowance(false);
      }
    };

    updatePaymentAmount();
  }, [desiredTokens, selectedToken, calculatePaymentAmount, checkAllowance, isOnBSCMainnet]);

  // Presale price (assume presaleInfo?.tokenPriceUSD is in 1e8 USD, and BNB price is in USD)
  const presalePrice = 0.10; // fallback
  const bnbPriceUSD = tokenPrices && tokenPrices[TOKEN_IDS.bnb] ? Number(tokenPrices[TOKEN_IDS.bnb]) / 1e8 : 0;
  const bblpPriceInBNB = bnbPriceUSD > 0 ? presalePrice / bnbPriceUSD : 0;

  // Update BBLP when BNB changes
  useEffect(() => {
    if (inputMode === 'BNB') {
      const bnb = parseFloat(bnbAmount);
      if (!isNaN(bnb) && bnb > 0 && bblpPriceInBNB > 0) {
        setBblpAmount((bnb / bblpPriceInBNB).toFixed(4));
      } else {
        setBblpAmount('');
      }
    }
    // eslint-disable-next-line
  }, [bnbAmount, bblpPriceInBNB]);

  // Update BNB when BBLP changes
  useEffect(() => {
    if (inputMode === 'BBLP') {
      const bblp = parseFloat(bblpAmount);
      if (!isNaN(bblp) && bblp > 0 && bblpPriceInBNB > 0) {
        setBnbAmount((bblp * bblpPriceInBNB).toFixed(6));
      } else {
        setBnbAmount('');
      }
    }
    // eslint-disable-next-line
  }, [bblpAmount, bblpPriceInBNB]);

  // Max button for BNB
  const handleMaxBNB = () => {
    // Assume userData.bnbBalance is available and in string format
    if (userData && userData.bnbBalance) {
      setInputMode('BNB');
      setBnbAmount(userData.bnbBalance);
    }
  };

  // Flip input mode
  const handleFlip = () => {
    setInputMode(inputMode === 'BNB' ? 'BBLP' : 'BNB');
  };

  // Don't redirect if wallet is not connected - show the page with connect wallet option

  const handleApprove = async () => {
    if (!paymentAmount || paymentAmount === '0' || !isOnBSCMainnet) return;
    
    try {
      setIsApproving(true);
      setStatusMessage('Approving tokens...');  
      await approveToken(selectedToken, paymentAmount);
      setStatusMessage('Tokens approved successfully!');
      
      // Re-check allowance
      const allowance = await checkAllowance(selectedToken);
      setHasAllowance(BigInt(allowance) >= BigInt(paymentAmount));
    } catch (err: any) {
      console.error('Approval failed:', err);
      if (err.message.includes('User rejected')) {
        setError('Approval was cancelled by user');
      } else {
        setError(err.message || 'Please try again');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!bnbAmount || parseFloat(bnbAmount) <= 0 || !isOnBSCMainnet) return;
    
    try {
      setIsBuying(true);
      // Convert BNB amount to wei format
      const bnbAmountWei = parseEther(bnbAmount);
      await buyTokens(TOKEN_IDS.bnb, bnbAmountWei.toString());
      setStatusMessage('Purchase successful!');
      setBnbAmount('');
      setBblpAmount('');
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

  const formatPrice = (price: bigint | undefined): string => {
    if (!price) return '0.00';
    return (Number(price) / 1e8).toFixed(2);
  };

  const selectedTokenData = PAYMENT_TOKENS.find(t => t.id === selectedToken);
  const selectedTokenName = selectedTokenData?.name || 'BNB';

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
    <>
      <style jsx>{`
        .animation-delay-0 {
          animation-delay: 0ms;
        }
        .animation-delay-75 {
          animation-delay: 75ms;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-32 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              Buy BBLP
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Buy BBLP tokens at the best price using BNB. Limited supply!
            </p>
          </div>

          {/* Network Warning - Show when connected but not on BSC Mainnet */}
          {isConnected && !isOnBSCMainnet && (
            <div className="w-full max-w-5xl mt-10 mb-10 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Network className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-orange-200">Wrong Network</h3>
                  <p className="text-xs text-orange-300/80">
                    You&apos;re connected to {chain?.name || "Unknown Network"}. Please switch to BSC Mainnet to participate in the presale.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg h-10"
              >
                {isSwitchingChain ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Switching Network...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Switch to BSC Mainnet
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Presale Progress Stepper */}
          <div className="mb-4">
            <div className="bg-black backdrop-blur-xl rounded-2xl border border-zinc-800 p-1 shadow-xl">
              <div className="flex items-center justify-between relative">
                {/* Enhanced Progress Line */}
                <div className="absolute top-1/2 left-12 right-12 h-1 bg-zinc-800 rounded-full -translate-y-1/2 z-0"></div>
                <div className="absolute top-1/2 left-12 w-1/2 h-1 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full -translate-y-1/2 z-0"></div>

                {/* Stage 1 - Seed Sale (Completed) */}
                <div className="flex flex-col items-center relative z-10 bg-black rounded-xl px-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500 flex items-center justify-center mb-3 shadow-lg shadow-green-500/20">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-green-300 mb-1">Seed Sale</h3>
                    <p className="text-xs text-green-400/70 mb-2">Completed</p>
                    <p className="text-lg font-bold text-white">$0.07</p>
                  </div>
                </div>

                {/* Stage 2 - Presale (Active) */}
                <div className="flex flex-col items-center relative z-10 bg-black rounded-xl -px-10 py-2">
                  <div className="relative">
                    {/* Pulsing outer ring */}
                    <div className="absolute inset-0 w-12 h-12 rounded-full  bg-yellow-400/30 animate-ping"></div>
                    {/* Main circle with blinking animation */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300 flex items-center justify-center mb-3 shadow-lg shadow-yellow-400/50 animate-pulse">
                      <span className="text-black font-bold text-sm animate-pulse">02</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-yellow-400 mb-1">Presale</h3>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <p className="text-xs text-yellow-300">Active Now</p>
                    </div>
                    <p className="text-lg font-bold text-yellow-400">$0.10</p>
                  </div>
                </div>

                {/* Stage 3 - Public Launch */}
                <div className="flex flex-col items-center relative z-10 bg-black rounded-xl px-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/50 border-2 border-zinc-700 flex items-center justify-center mb-3">
                    <span className="text-zinc-500 font-bold text-sm">03</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-1">Public Launch</h3>
                    <p className="text-xs text-zinc-500 mb-2">Coming Soon</p>
                    <p className="text-lg font-bold text-zinc-400">$0.14</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Presale Card */}
          <div className={cn(
            "bg-[#0A0A0A]/90 backdrop-blur-xl rounded-xl border border-yellow-400/10 p-4 md:p-8 mb-6 shadow-[0_0_50px_-12px] shadow-yellow-400/10 transition-all duration-300",
            !isOnBSCMainnet && isConnected && "opacity-50 pointer-events-none"
          )}>
            
        

            {/* Swap-like Card UI */}
            <div className="max-w-lg mx-auto bg-black/30 rounded-2xl  shadow-lg">



              {/* BNB Input */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400 mb-1 block">Pay with BNB</label>

                <button
                    onClick={handleMaxBNB}
                    className="ml-3 px-2 py-1 text-xs rounded text-sm  text-yellow-300 "
                    type="button"
                  >
                    Use Max
                  </button>
                </div>

                
                <div className="flex items-center bg-black/20 rounded-xl border border-zinc-800 p-3">
                  <Input
                    type="text"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={bnbAmount}
                    onChange={e => {
                      const value = e.target.value;
                      // Only allow numbers, decimal point, and backspace
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputMode('BNB');
                      setBnbAmount(value);
                    }
                  }}
                    className="bg-transparent border-none text-lg font-semibold flex-1"
                  />
                  <span className="ml-2">
                    <Image src="/bnb.svg" alt="BNB" width={24} height={24} />
                  </span>
               
                </div>
              </div>

          

              {/* BBLP Input */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-1 block">Receive BBLP</label>
                <div className="flex items-center bg-black/20 rounded-xl border border-zinc-800 p-3">
                  <Input
                    type="text"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={bblpAmount}
                    onChange={e => {
                      const value = e.target.value;
                      // Only allow numbers, decimal point, and backspace
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setInputMode('BBLP');
                        setBblpAmount(value);
                        }
                      }}
                    className="bg-transparent border-none text-lg font-semibold flex-1"
                  />
                  <span className="ml-2">
                    <Image src="/logo.svg" alt="BBLP" width={24} height={24} />
                  </span>
                </div>
              </div>

              {/* Payment Summary */}
              {bnbAmount && parseFloat(bnbAmount) > 0 && bblpAmount && parseFloat(bblpAmount) > 0 && (
                <div className="mb-4 p-3 rounded-xl border border-zinc-800/50 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/bnb.svg" alt="BNB" width={20} height={20} />
                      <span className="text-sm text-gray-400">You Pay</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{parseFloat(bnbAmount).toFixed(6)} BNB</div>
                      <div className="text-xs text-gray-500">
                        ${bnbPriceUSD > 0 ? (parseFloat(bnbAmount) * bnbPriceUSD).toFixed(2) : 'Calculating...'} USD
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center my-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                      <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/logo.svg" alt="BBLP" width={20} height={20} />
                      <span className="text-sm text-gray-400">You Receive</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{parseFloat(bblpAmount).toFixed(4)} BBLP</div>
                      <div className="text-xs text-gray-500">
                        ${(parseFloat(bblpAmount) * 0.10).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <Button
                className="w-full h-12  bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-semibold shadow-lg"
                size="lg"
                disabled={!bnbAmount || parseFloat(bnbAmount) <= 0 || isBuying || !isOnBSCMainnet || !isConnected}
                onClick={handleBuy}
              >
                {isBuying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Buying with BNB...
                  </div>
                ) : (
                  `Buy with BNB`
                )}
              </Button>

              {/* Exchange Rate Info */}
              {bnbPriceUSD > 0 && (
                <div className="   ">
                  <div className="flex items-center justify-center text-center mt-1 text-xs">
                    <div className="flex text-center gap-2">
                      <span className="text-gray-400 font-medium">1 BNB = {(1 / bblpPriceInBNB).toFixed(2)} BBLP (${bnbPriceUSD.toFixed(2)} USD)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {(error || statusMessage) && (
              <div className={cn(
                " mt-4 p-2   text-center font-medium  flex items-center justify-center gap-2",
                error 
                  ? ' text-red-300 ' 
                  : ' text-green-300 '
              )}>
                {error ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                )}
                {error || statusMessage}
              </div>
            )}
          </div>

          {/* Presale Details Accordion - Professional */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-xl border border-zinc-800 overflow-hidden mb-20">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <Info className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Presale Details</h3>
                  <p className="text-xs text-gray-500">Terms and information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
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
              <div className="px-6 pb-4 border-t border-zinc-800">
                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Current Price</h4>
                      <p className="text-xs text-gray-400">$0.10 per BBLP token (Presale Round 2)</p>
                    </div>
                  </div>
                  
           
                  
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Early Bird Pricing</h4>
                      <p className="text-xs text-gray-400">Available during presale period only</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Network className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Network Requirement</h4>
                      <p className="text-xs text-gray-400">Presale is available on BSC Mainnet only</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
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