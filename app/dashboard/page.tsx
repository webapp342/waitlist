"use client";

import DashboardCTA from "@/components/dashboard-cta";
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, RefreshCw, Plus, Send, Info, ArrowUpRight, ArrowDownLeft, Coins, History, ExternalLink, ChevronDown, ChevronUp, Copy, Share2, Users, Gift, Sparkles, Trophy, Crown, ArrowRight, Activity, Repeat, Network, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { stakeLogsService, StakeLog, referralService, ReferralCode } from '@/lib/supabase';
import { ethers } from 'ethers';
import { userService } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import { useChainId } from 'wagmi';
import { fetchCryptoPrices } from '@/lib/priceService';



// BSC Mainnet Addresses
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const BUSD_ADDRESS = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const BBLP_ADDRESS = '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235';

// Ethereum Mainnet Addresses
const ETH_BBSC_ADDRESS = '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235'; // bBSC token address
const ETH_USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT Ethereum
const ETH_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC Ethereum

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;

const ASSETS = [
  { symbol: 'BBLP', name: 'BBLP Token', icon: '/BBLP.svg', network: 'bsc', networkName: 'BNB Smart Chain', isNative: false },
  { symbol: 'USDT', name: 'Tether USD', icon: '/usdt.svg', network: 'bsc', networkName: 'BNB Smart Chain', isNative: false },
  { symbol: 'BNB', name: 'Binance Coin', icon: '/bnb.svg', network: 'bsc', networkName: 'BNB Smart Chain', isNative: true },
  { symbol: 'BUSD', name: 'Binance USD', icon: '/busd.svg', network: 'bsc', networkName: 'BNB Smart Chain', isNative: false },
  { symbol: 'WBBLP', name: 'WBBLP Token', icon: '/BBLP.svg', network: 'eth', networkName: 'Ethereum', isNative: false },
  { symbol: 'ETH', name: 'Ethereum', icon: '/eth.png', network: 'eth', networkName: 'Ethereum', isNative: true },
  { symbol: 'USDT_ETH', name: 'Tether USD', icon: '/usdt.svg', network: 'eth', networkName: 'Ethereum', isNative: false },
  { symbol: 'USDC_ETH', name: 'USD Coin', icon: '/usdc.svg', network: 'eth', networkName: 'Ethereum', isNative: false },
];

function DashboardContent() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const router = useRouter();
  
  // Get staking data from both networks
  const { userData: bscUserData } = useWallet(56); // BSC Mainnet
  const { userData: ethUserData } = useWallet(1); // Ethereum Mainnet
  
  // Combine data from both networks
  const combinedUserData = {
    ...bscUserData,
    stakedAmount: (parseFloat(bscUserData?.stakedAmount || '0') + parseFloat(ethUserData?.stakedAmount || '0')).toString(),
    pendingRewards: (parseFloat(bscUserData?.pendingRewards || '0') + parseFloat(ethUserData?.pendingRewards || '0')).toString(),
    stakes: [...(bscUserData?.stakes || []), ...(ethUserData?.stakes || [])]
  };

  console.log('🎯 Dashboard - bscUserData.stakedAmount:', bscUserData?.stakedAmount);
  console.log('🎯 Dashboard - ethUserData.stakedAmount:', ethUserData?.stakedAmount);
  console.log('🎯 Dashboard - combinedUserData.stakedAmount:', combinedUserData.stakedAmount);
  
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [bnbPrice, setBnbPrice] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stakeLogs, setStakeLogs] = useState<StakeLog[]>([]);
  const [showAllStakeLogs, setShowAllStakeLogs] = useState(false);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referralStats, setReferralStats] = useState({ 
    totalReferrals: 0, 
    totalRewards: '0', 
    tier1Rewards: '0', 
    tier2Rewards: '0',
    tier3Rewards: '0',
    tier4Rewards: '0',
    tier5Rewards: '0'
  });
  const [showReferralDetails, setShowReferralDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [switchChainError, setSwitchChainError] = useState<string | null>(null);

  // Check if user is on any supported network (BSC Mainnet or Ethereum)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;
  const isOnEthMainnet = actualChainId === 1;
  const isOnSupportedNetwork = isOnBSCMainnet || isOnEthMainnet;

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return;
    
    try {
      setIsSwitchingChain(true);
      setSwitchChainError(null);
      
      // Try to switch to BSC Mainnet first, if not available, try Ethereum
      try {
        await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
      } catch (err: any) {
        // If BSC fails, try Ethereum
        await switchChain({ chainId: 1 });
      }
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      if (err.code === 4001) {
        setSwitchChainError('Chain switch was cancelled by user');
      } else {
        setSwitchChainError('Failed to switch to supported network. Please switch manually in your wallet.');
      }
    } finally {
      setIsSwitchingChain(false);
    }
  };

  // Clear switch chain error after 5 seconds
  useEffect(() => {
    if (switchChainError) {
      const timer = setTimeout(() => setSwitchChainError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [switchChainError]);

  // Fetch token balances for the connected wallet - BSC Mainnet (always fetch)
  const { data: usdtBalance, refetch: refetchUSDT } = useBalance(address ? { address, token: USDT_ADDRESS, chainId: 56 } : { address: undefined });
  const { data: busdBalance, refetch: refetchBUSD } = useBalance(address ? { address, token: BUSD_ADDRESS, chainId: 56 } : { address: undefined });
  const { data: bblpBalance, refetch: refetchBBLP } = useBalance(address ? { address, token: BBLP_ADDRESS, chainId: 56 } : { address: undefined });
  const { data: bnbBalance, refetch: refetchBNB } = useBalance(address ? { address, chainId: 56 } : { address: undefined });
  
  // Fetch token balances for the connected wallet - ETH Mainnet (always fetch)
  const { data: ethBblpBalance, refetch: refetchEthBblp } = useBalance(address ? { address, token: ETH_BBSC_ADDRESS, chainId: 1 } : { address: undefined });
  const { data: ethBalance, refetch: refetchEth } = useBalance(address ? { address, chainId: 1 } : { address: undefined });
  const { data: ethUsdtBalance, refetch: refetchEthUsdt } = useBalance(address ? { address, token: ETH_USDT_ADDRESS, chainId: 1 } : { address: undefined });
  const { data: ethUsdcBalance, refetch: refetchEthUsdc } = useBalance(address ? { address, token: ETH_USDC_ADDRESS, chainId: 1 } : { address: undefined });

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

  // Initial loading state
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [isConnected]);

  // Fetch BNB and ETH prices from CoinGecko
  useEffect(() => {
    const fetchPrices = async () => {
      const prices = await fetchCryptoPrices();
      setBnbPrice(prices.bnb);
      setEthPrice(prices.eth);
    };
    fetchPrices();
  }, []);

  // Load stake logs when wallet is connected and on supported network
  useEffect(() => {
    const loadStakeLogs = async () => {
      if (isConnected && address && isOnSupportedNetwork) {
        try {
          const logs = await stakeLogsService.getUserStakeLogs(address);
          setStakeLogs(logs);
          console.log('Stake logs loaded in dashboard:', logs);
        } catch (error) {
          console.error('Error loading stake logs in dashboard:', error);
        }
      }
    };

    loadStakeLogs();
  }, [isConnected, address, isOnSupportedNetwork]);

  // Load referral data when wallet is connected and on supported network
  useEffect(() => {
    const loadReferralData = async () => {
      if (isConnected && address && isOnSupportedNetwork) {
        try {
          // Get user first
          const user = await userService.getUserByWallet(address);
          if (user) {
            // Get or generate referral code
            let code = await referralService.getReferralCodeByUserId(user.id);
            if (!code) {
              // Only generate if user doesn't have a code
              code = await referralService.generateReferralCode(address);
            }
            setReferralCode(code);

            // Get referral stats
            const stats = await referralService.getUserReferralStats(address);
            setReferralStats({
              totalReferrals: stats.totalReferrals,
              totalRewards: stats.totalRewards,
              tier1Rewards: stats.tier1Rewards || '0',
              tier2Rewards: stats.tier2Rewards || '0',
              tier3Rewards: stats.tier3Rewards || '0',
              tier4Rewards: stats.tier4Rewards || '0',
              tier5Rewards: stats.tier5Rewards || '0'
            });
            
            console.log('Referral data loaded:', { code: code?.code, stats });
          }
        } catch (error) {
          console.error('Error loading referral data:', error);
        }
      }
    };

    loadReferralData();
  }, [isConnected, address, isOnSupportedNetwork]);

  // Calculate total USD value for all assets
  const bnbUsd = bnbBalance ? parseFloat(bnbBalance.formatted) * bnbPrice : 0;
  const usdtUsd = usdtBalance ? parseFloat(usdtBalance.formatted) * 1 : 0;
  const busdUsd = busdBalance ? parseFloat(busdBalance.formatted) * 1 : 0;
  const bblpUsd = bblpBalance ? parseFloat(bblpBalance.formatted) * 0.10 : 0;
  const ethBblpUsd = ethBblpBalance ? parseFloat(ethBblpBalance.formatted) * 0.10 : 0;
  const ethUsd = ethBalance ? parseFloat(ethBalance.formatted) * ethPrice : 0; // ETH price ~$3000
  const rBblpUsd = referralStats ? parseFloat(referralStats.totalRewards) / 10 : 0; // Divide by 10 for USDT
  const totalUsd = bnbUsd + usdtUsd + busdUsd + bblpUsd + ethBblpUsd + ethUsd + rBblpUsd;

  const handleRefresh = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet to refresh portfolio');
      return;
    }
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchUSDT(),
        refetchBUSD(),
        refetchBBLP(),
        refetchBNB(),
        refetchEthBblp(),
        refetchEth()
      ]);
      toast.success('Portfolio refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh portfolio');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getAssetData = (symbol: string) => {
    switch (symbol) {
      case 'BNB':
        return {
          balance: bnbBalance ? parseFloat(bnbBalance.formatted) : 0,
          usdValue: bnbUsd,
          price: bnbPrice,
          change: '+2.34%',
          changeValue: 2.34
        };
      case 'USDT':
        return {
          balance: (usdtBalance ? parseFloat(usdtBalance.formatted) : 0) + (referralStats ? parseFloat(referralStats.totalRewards) / 10 : 0), // Add wallet USDT + referral rewards
          usdValue: usdtUsd + rBblpUsd, // Add both USDT balances
          price: 1.00,
          change: '+0.01%',
          changeValue: 0.01
        };
      case 'BUSD':
        return {
          balance: busdBalance ? parseFloat(busdBalance.formatted) : 0,
          usdValue: busdUsd,
          price: 1.00,
          change: '0.00%',
          changeValue: 0
        };
      case 'BBLP':
        return {
          balance: bblpBalance ? parseFloat(bblpBalance.formatted) : 0,
          usdValue: bblpUsd,
          price: 0.10,
          change: '+15.67%',
          changeValue: 15.67
        };
      case 'WBBLP':
        return {
          balance: ethBblpBalance ? parseFloat(ethBblpBalance.formatted) : 0,
          usdValue: ethBblpUsd,
          price: 0.10,
          change: '+12.45%',
          changeValue: 12.45
        };
      case 'ETH':
        return {
          balance: ethBalance ? parseFloat(ethBalance.formatted) : 0,
          usdValue: ethUsd,
          price: ethPrice,
          change: '+5.23%',
          changeValue: 5.23
        };
      case 'USDT_ETH':
        return {
          balance: ethUsdtBalance ? parseFloat(ethUsdtBalance.formatted) : 0,
          usdValue: ethUsdtBalance ? parseFloat(ethUsdtBalance.formatted) * 1 : 0,
          price: 1.00,
          change: '+0.01%',
          changeValue: 0.01
        };
      case 'USDC_ETH':
        return {
          balance: ethUsdcBalance ? parseFloat(ethUsdcBalance.formatted) : 0,
          usdValue: ethUsdcBalance ? parseFloat(ethUsdcBalance.formatted) * 1 : 0,
          price: 1.00,
          change: '+0.01%',
          changeValue: 0.01
        };
      default:
        return { balance: 0, usdValue: 0, price: 0, change: '0.00%', changeValue: 0 };
    }
  };

  // Check if user needs to stake for card activation
  const totalStaked = combinedUserData?.stakedAmount ? parseFloat(combinedUserData.stakedAmount) : 0;
  const needsStaking = totalStaked < 1000;

  if (!isConnected) {
    return null;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
                  <Header />

        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
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
    <main className="flex min-h-screen flex-col items-center overflow-x-clip ">
              <Header />

      <section className="flex flex-col items-center mt-10 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">

        {/* Network Warning - Show when connected but not on supported network */}
        {isConnected && !isOnSupportedNetwork && (
          <div className="w-full mt-20 mb-10 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <Network className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-orange-200">Unsupported Network</h3>
                <p className="text-xs text-orange-300/80">
                  You&apos;re connected to {chain?.name || "Unknown Network"}. Please switch to BSC Mainnet or ETH Mainnet to access all features.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => switchChain({ chainId: BSC_MAINNET_CHAIN_ID })}
                disabled={isSwitchingChain}
                className="w-full sm:w-auto flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg h-10"
              >
                {isSwitchingChain ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Switching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Image src="/bnb.svg" alt="BSC" width={16} height={16} />
                    Switch to BSC Mainnet
                  </div>
                )}
              </Button>
              <Button
                onClick={() => switchChain({ chainId: 1 })}
                disabled={isSwitchingChain}
                className="w-full sm:w-auto flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg h-10"
              >
                {isSwitchingChain ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Switching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Image src="/eth.png" alt="ETH" width={16} height={16} className="rounded-full" />
                    Switch to ETH Mainnet
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Switch Chain Error Message */}
        {switchChainError && (
          <div className="w-full mt-8 mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300">{switchChainError}</p>
            </div>
          </div>
        )}

        <DashboardCTA userData={combinedUserData} totalUsd={totalUsd} />

        {/* Main Dashboard Content */}
        <div className={cn(
          "w-full mt-8 space-y-4 transition-all duration-300",
          !isOnSupportedNetwork && isConnected && "opacity-50 pointer-events-none"
        )}>
          {/* Dashboard Header - Simplified */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Portfolio Overview</h1>
                <button 
                  onClick={handleRefresh}
                  className={cn(
                    "text-zinc-400 hover:text-yellow-400 transition-colors",
                    (!isConnected || isRefreshing) && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isRefreshing || !isConnected}
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </button>
              </div>             
              <p className="text-gray-400 text-xs lg:text-sm">Track and manage your digital assets</p>
            </div>
            
            {/* Action Buttons - Enhanced with Psychological Triggers */}
            <div className="flex items-center gap-2 mt-4 lg:mt-0 animate-slide-in">
              {/* Remove Switch Network button, only show other action buttons */}
              {isOnSupportedNetwork && (
                <>
                  <Link href="/swap">
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-zinc-400 rounded-l  border   transition-all duration-200 group cursor-pointer text-xs px-3 py-1 h-auto"
                      >
                        <Repeat className="w-3 h-3 mr-1 group-hover:rotate-12 text-zinc-200 transition-transform duration-200" />
                        Swap
                      </Button>
                    </Link>

                    <Link href="/stake">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gradient-to-br text-yellow-400 from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm rounded-l border border-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200 group cursor-pointer text-xs px-3 py-1 h-auto"
                      >
                        <Coins className="w-3 h-3 mr-1 group-hover:rotate-12 text-yellow-400 transition-transform duration-200" />
                        Stake
                      </Button>
                    </Link>

                 
                    <Link href="/presale">
                      <Button
                        size="sm"
                        className="group bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-semibold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 relative overflow-hidden text-xs px-3 py-1 h-auto"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                        <Plus className="w-3 h-3 mr-1 group-hover:rotate-90 transition-transform duration-200" />
                        Buy BBLP
                      </Button>
                    </Link>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats Bar - Improved for Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4 animate-fade-in-up mb-4">
            <div className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800/50 text-zinc-400 rounded-xl p-3 lg:p-4 border hover:border-zinc-700/50 transition-all duration-200 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-zinc-500 mb-1">Total Staked</p>
                  <p className="text-base lg:text-lg font-bold text-zinc-200">{combinedUserData?.stakedAmount || '0'} BBLP</p>
                </div>
                <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              </div>
            </div>
            
            <div className="bg-zinc-900/80 backdrop-blur-sm border-yellow-500/10 rounded-xl p-3 lg:p-4 border hover:border-yellow-500/20 transition-all duration-200 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-zinc-500 mb-1">Referral Earnings</p>
                  <p className="text-base lg:text-lg font-bold text-yellow-400">{(parseFloat(referralStats.totalRewards) / 10).toFixed(2)} USDT</p>
                </div>
                <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400/70 group-hover:text-yellow-400 transition-colors" />
              </div>
            </div>
          </div>

          {/* Assets Table - Enhanced for Desktop */}
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-lg border border-zinc-800/50 shadow-xl overflow-hidden mb-4">
            {/* Assets List - Enhanced */}
            <div className="divide-y divide-zinc-800/30">
              {ASSETS.map((asset, index) => {
                const data = getAssetData(asset.symbol);
                const isPositive = data.changeValue > 0;
                return { asset, data, index };
              })
              .sort((a, b) => b.data.usdValue - a.data.usdValue)
              .map(({ asset, data, index }) => {
                const isPositive = data.changeValue > 0;
                
                return (
                  <div
                    key={asset.symbol}
                    className="px-2 py-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Asset Info */}
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center shadow-sm relative">
                          <div className={cn(
                            "w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center",
                            (asset.symbol === 'ETH') && "bg-white/5",
                            (asset.symbol === 'BNB') && "bg-black/5",
                            (asset.symbol === 'BUSD') && "bg-[#f0b90b]/5",
                            (asset.symbol === 'USDT' || asset.symbol === 'USDT_ETH') && "bg-[#50af95]/5"
                          )}>
                            <Image 
                              src={asset.icon} 
                              alt={asset.symbol} 
                              width={(asset.symbol === 'BNB' || asset.symbol === 'USDC' || asset.symbol === 'USDC_ETH') ? 24 : 20} 
                              height={(asset.symbol === 'BNB' || asset.symbol === 'USDC' || asset.symbol === 'USDC_ETH') ? 24 : 20} 
                              className={cn("drop-shadow-sm")} 
                            />
                          </div>
                          {/* Network Badge - Only show for non-native tokens */}
                          {!asset.isNative && (
                            <div className={cn(
                              "absolute bottom-0 right-0 flex items-center justify-center p-0",
                              asset.network === 'bsc' ? 'w-4 h-4 rounded-full bg-black/80 shadow-sm' : 'w-4 h-4 rounded-full bg-white shadow-sm'
                            )}>
                              <Image 
                                src={asset.network === 'bsc' ? '/bnb.svg' : '/eth.png'} 
                                alt={asset.network} 
                                width={asset.network === 'bsc' ? 12 : 10} 
                                height={asset.network === 'bsc' ? 12 : 10}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <h3 className="font-medium text-sm lg:text-base text-white">{asset.symbol.replace('_ETH', '')}</h3>
                            <div className="px-1.5 py-0.5 bg-zinc-800/30 rounded-xl ml-1">
                              <p className="text-xs text-zinc-500">{asset.networkName}</p>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500">{data.balance.toFixed(4)} {asset.symbol.replace('_ETH', '')}</p>
                        </div>
                      </div>

                      {/* Balance & Change */}
                      <div className="text-right">
                        <p className="font-medium text-sm lg:text-base text-white mr-2">
                          ${data.usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staking Activity - Better Desktop Layout */}
          {isConnected && stakeLogs.length > 0 && (
            <div className="animate-fade-in-up">
              <div className="mb-4">
                {/* Header - Enhanced */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base lg:text-lg font-medium text-white">Recent Activity</h3>
                    <p className="text-xs text-zinc-500">Your staking transactions</p>
                  </div>
                  <span className="text-xs text-zinc-500 bg-zinc-800/30 px-2 py-0.5 rounded-full">
                    {stakeLogs.length} total
                  </span>
                </div>

                {/* Transactions List - Show 3 by default */}
                <div className="space-y-2">
                  {stakeLogs.slice(0, showAllStakeLogs ? stakeLogs.length : 3).map((log, index) => {
                    const logDate = new Date(log.created_at || '');
                    const getActionIcon = (actionType: string) => {
                      switch (actionType) {
                        case 'stake': return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
                        case 'unstake': return <ArrowDownLeft className="w-3.5 h-3.5 text-yellow-400" />;
                        case 'claim_rewards': return <Coins className="w-3.5 h-3.5 text-blue-400" />;
                        case 'emergency_withdraw': return <Info className="w-3.5 h-3.5 text-red-400" />;
                        default: return <History className="w-3.5 h-3.5 text-zinc-400" />;
                      }
                    };

                    const getActionColor = (actionType: string) => {
                      switch (actionType) {
                        case 'stake': return 'from-green-500/10 to-green-600/5 border-green-500/10 text-green-400';
                        case 'unstake': return 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/10 text-yellow-400';
                        case 'claim_rewards': return 'from-blue-500/10 to-blue-600/5 border-blue-500/10 text-blue-400';
                        case 'emergency_withdraw': return 'from-red-500/10 to-red-600/5 border-red-500/10 text-red-400';
                        default: return 'from-gray-500/10 to-gray-600/5 border-gray-500/10 text-gray-400';
                      }
                    };

                    return (
                      <div
                        key={index}
                        className={cn(
                          "bg-gradient-to-br rounded-xl py-2.5 px-3 lg:px-4 border backdrop-blur-sm group hover:scale-[1.01] transition-all duration-200 animate-slide-in-right border-zinc-800/30",
                          getActionColor(log.action_type)
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <div className="p-1.5 rounded-lg bg-zinc-900/60 backdrop-blur-sm">
                              {getActionIcon(log.action_type)}
                            </div>
                            <div>
                              <p className={cn("font-medium capitalize text-xs lg:text-sm", getActionColor(log.action_type).split(' ').pop())}>
                                {log.action_type.replace('_', ' ')}
                              </p>
                              <p className="text-[10px] lg:text-xs text-zinc-500">
                                {logDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {log.amount !== '0' && (
                              <div className="text-right">
                                <p className="font-medium text-zinc-200 text-xs lg:text-sm">{parseFloat(log.amount).toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-500">BBLP</p>
                              </div>
                            )}
                            
                            <a
                              href={`https://testnet.bscscan.com/tx/${log.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-zinc-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View All Link */}
                {stakeLogs.length > 3 && (
                  <div className="mt-3">
                    <Link href="/stake">
                      <Button
                        variant="ghost"
                        className="w-full text-zinc-400 hover:text-yellow-400 transition-all duration-200 group text-xs h-8"
                      >
                        <span>View All Transactions</span>
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Transactions State - Enhanced */}
          {isConnected && stakeLogs.length === 0 && (
            <div>
              <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800/50 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center opacity-60">
                  <History className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Activity Yet</h3>
                <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                  Start your staking journey to earn rewards while supporting the network
                </p>
                <Link href="/stake">
                  <Button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-yellow-300 font-medium text-sm transition-all duration-200 px-5 py-2 h-auto">
                    <Sparkles className="w-3 h-3 mr-2 opacity-70" />
                    Start Staking
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Referral Section - Compact Professional Design */}
          {isConnected && referralCode && (
            <div>
              <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800/50 mb-4 overflow-hidden">
                <div className="p-4 lg:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-yellow-400/80" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">Referral Program</h3>
                      <p className="text-xs text-zinc-500">Invite friends, earn rewards together</p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-900/50 rounded-lg p-3 text-center border border-zinc-800/50">
                      <p className="text-lg font-medium text-white mb-0">{referralStats.totalReferrals}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Friends Referred</p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-3 text-center border border-zinc-800/50">
                      <p className="text-lg font-medium text-yellow-400 mb-0">{(parseFloat(referralStats.totalRewards) / 10).toFixed(2)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">USDT Earned</p>
                    </div>
                  </div>
                  
                  {/* Referral Link */}
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 mb-1">Your referral link</p>
                        <p className="text-xs font-mono text-zinc-300 truncate">
                          https://bblip.io?ref={referralCode.code}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://bblip.io?ref=${referralCode.code}`);
                            toast.success('Referral link copied!');
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/50 hover:bg-zinc-700/80 transition-all duration-200"
                          aria-label="Copy referral link"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        </button>
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: 'Join BBLP',
                                text: 'Join BBLP and earn rewards when you stake! Use my referral link:',
                                url: `https://bblip.io?ref=${referralCode.code}`
                              });
                            } else {
                              navigator.clipboard.writeText(`https://bblip.io?ref=${referralCode.code}`);
                              toast.success('Referral link copied!');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/50 hover:bg-zinc-700/80 transition-all duration-200"
                          aria-label="Share referral link"
                        >
                          <Share2 className="w-3.5 h-3.5 text-zinc-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Claim Button - Full Width */}
                  <Link href="/social-connections" className="block">
                    <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-yellow-300 text-sm py-2 h-auto font-medium border border-zinc-700/30 transition-all duration-200">
                      Claim $1,000 USDT Bonus
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}


        </div>
      </section>

      <Particles
        quantityDesktop={100}
        quantityMobile={30}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
} 