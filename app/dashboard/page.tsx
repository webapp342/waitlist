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
import { TrendingUp, Wallet, RefreshCw, Plus, Send, Info, ArrowUpRight, ArrowDownLeft, Coins, History, ExternalLink, ChevronDown, ChevronUp, Copy, Share2, Users, Gift, Sparkles, Trophy, Crown, ArrowRight, Activity, Repeat, Network, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { stakeLogsService, StakeLog, referralService, ReferralCode } from '@/lib/supabase';
import { ethers } from 'ethers';
import { userService } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import { useChainId } from 'wagmi';

const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const BUSD_ADDRESS = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const BBLP_ADDRESS = '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235';

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;

const ASSETS = [
  { symbol: 'BBLP', name: 'BBLP Token', icon: '/logo.svg' },
  { symbol: 'rBBLP', name: 'Referral BBLP', icon: '/logo.svg' },
  { symbol: 'BNB', name: 'Binance Coin', icon: '/bnb.svg'  },
  { symbol: 'USDT', name: 'Tether USD', icon: '/usdt.svg'  },
  { symbol: 'BUSD', name: 'Binance USD', icon: '/busd.svg' }
];

function DashboardContent() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const router = useRouter();
  const { userData } = useWallet();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [bnbPrice, setBnbPrice] = useState<number>(0);
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

  // Check if user is on the correct network (BSC Mainnet - Chain ID 56)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return;
    
    try {
      setIsSwitchingChain(true);
      setSwitchChainError(null);
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      if (err.code === 4001) {
        setSwitchChainError('Chain switch was cancelled by user');
      } else {
        setSwitchChainError('Failed to switch to BSC Mainnet. Please switch manually in your wallet.');
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

  // Fetch token balances for the connected wallet - only on correct network
  const { data: usdtBalance, refetch: refetchUSDT } = useBalance(address && isOnBSCMainnet ? { address, token: USDT_ADDRESS } : { address: undefined });
  const { data: busdBalance, refetch: refetchBUSD } = useBalance(address && isOnBSCMainnet ? { address, token: BUSD_ADDRESS } : { address: undefined });
  const { data: bblpBalance, refetch: refetchBBLP } = useBalance(address && isOnBSCMainnet ? { address, token: BBLP_ADDRESS } : { address: undefined });

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

  // Fetch BNB price from CoinGecko
  useEffect(() => {
    const fetchBNBPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
        const data = await response.json();
        setBnbPrice(data.binancecoin.usd);
      } catch (error) {
        setBnbPrice(0);
      }
    };
    fetchBNBPrice();
  }, []);

  // Load stake logs when wallet is connected and on correct network
  useEffect(() => {
    const loadStakeLogs = async () => {
      if (isConnected && address && isOnBSCMainnet) {
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
  }, [isConnected, address, isOnBSCMainnet]);

  // Load referral data when wallet is connected and on correct network
  useEffect(() => {
    const loadReferralData = async () => {
      if (isConnected && address && isOnBSCMainnet) {
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
  }, [isConnected, address, isOnBSCMainnet]);

  // Calculate total USD value for all assets
  const bnbUsd = userData?.bnbBalance && bnbPrice ? parseFloat(userData.bnbBalance) * bnbPrice : 0;
  const usdtUsd = usdtBalance ? parseFloat(usdtBalance.formatted) * 1 : 0;
  const busdUsd = busdBalance ? parseFloat(busdBalance.formatted) * 1 : 0;
      const bblpUsd = bblpBalance ? parseFloat(bblpBalance.formatted) * 0.10 : 0;
    const rBblpUsd = referralStats ? parseFloat(referralStats.totalRewards) * 0.10 : 0;
    const totalUsd = bnbUsd + usdtUsd + busdUsd + bblpUsd + rBblpUsd;

  const handleRefresh = async () => {
    if (!isOnBSCMainnet) {
      toast.error('Please switch to BSC Mainnet to refresh portfolio');
      return;
    }
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchUSDT(),
        refetchBUSD(),
        refetchBBLP()
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
          balance: userData?.bnbBalance ? parseFloat(userData.bnbBalance) : 0,
          usdValue: bnbUsd,
          price: bnbPrice,
          change: '+2.34%',
          changeValue: 2.34
        };
      case 'USDT':
        return {
          balance: usdtBalance ? parseFloat(usdtBalance.formatted) : 0,
          usdValue: usdtUsd,
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
      case 'rBBLP':
        return {
          balance: referralStats ? parseFloat(referralStats.totalRewards) : 0,
          usdValue: rBblpUsd,
          price: 0.10,
          change: '+15.67%',
          changeValue: 15.67
        };
      default:
        return { balance: 0, usdValue: 0, price: 0, change: '0.00%', changeValue: 0 };
    }
  };

  // Check if user needs to stake for card activation
  const totalStaked = userData?.stakedAmount ? parseFloat(userData.stakedAmount) : 0;
  const needsStaking = totalStaked < 1000;

  if (!isConnected) {
    return null;
  }

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
      <section className="flex flex-col items-center mt-10 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <Header />

        {/* Network Warning - Show when connected but not on BSC Mainnet */}
        {isConnected && !isOnBSCMainnet && (
          <div className="w-full max-w-5xl mt-20 -mb-10 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <Network className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-orange-200">Wrong Network</h3>
                <p className="text-xs text-orange-300/80">
                  You&apos;re connected to {chain?.name || "Unknown Network"}. Please switch to BSC Mainnet to access all features.
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

        {/* Switch Chain Error Message */}
        {switchChainError && (
          <div className="w-full max-w-5xl mt-8 mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300">{switchChainError}</p>
            </div>
          </div>
        )}

        <DashboardCTA userData={userData} totalUsd={totalUsd} />

        {/* Main Dashboard Content */}
        <div className={cn(
          "w-full max-w-5xl mt-8 space-y-4 transition-all duration-300",
          !isOnBSCMainnet && isConnected && "opacity-50 pointer-events-none"
        )}>
          {/* Dashboard Header - Simplified */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="animate-fade-in">
<div className="flex items-center gap-2 mb-2">
<h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">Portfolio Overview</h1>
              <button 
                onClick={handleRefresh}
                className={cn(
                  "text-zinc-400 hover:text-yellow-400 transition-colors",
                  (!isOnBSCMainnet || isRefreshing) && "opacity-50 cursor-not-allowed"
                )}
                disabled={isRefreshing || !isOnBSCMainnet}
              >
                <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
              </button>
</div>             
              <p className="text-gray-400 text-sm lg:text-base">Track and manage your digital assets</p>
            </div>
            
            {/* Action Buttons - Enhanced with Psychological Triggers */}
            <div className="flex items-center gap-3 mt-4 -mb-5 lg:mt-0 animate-slide-in">

           


        


              {!isOnBSCMainnet ? (
                <Button
                  onClick={handleSwitchChain}
                  disabled={isSwitchingChain}
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg transition-all duration-200"
                >
                  {isSwitchingChain ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Switching...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Switch Network
                    </div>
                  )}
                </Button>
              ) : (
                <>
                  <Link href="/swap">
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-zinc-400 rounded-l  border   transition-all duration-200 group cursor-pointer"
                      >
                        <Repeat className="w-4 h-4 mr-2 group-hover:rotate-12 text-zinc-200 transition-transform duration-200" />
                        Swap
                      </Button>
                    </Link>

                    <Link href="/stake">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gradient-to-br text-yellow-400 from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm rounded-l  border border-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200 group cursor-pointer"
                      >
                        <Coins className="w-4 h-4 mr-2 group-hover:rotate-12 text-yellow-400 transition-transform duration-200" />
                        Stake
                      </Button>
                    </Link>

                 
                    <Link href="/presale">
                      <Button
                        size="sm"
                        className="group bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-semibold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 relative overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                        <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                        Buy BBLP
                      </Button>
                    </Link>
                </>
              )}

                
            

             
            </div>
          </div>

          {/* Quick Stats Bar - Improved for Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6 animate-fade-in-up">
            <div className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-zinc-400 rounded-xl p-4 lg:p-6 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm  mb-1">Total Staked</p>
                  <p className="text-lg lg:text-xl font-bold text-zinc-200">{userData?.stakedAmount || '0'} BBLP</p>
                </div>
                <Coins className="w-5 h-5 lg:w-6 lg:h-6 text-zinc-200 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-yellow-400/80 mb-1">Referral Earnings</p>
                  <p className="text-lg lg:text-xl font-bold text-yellow-400">{parseFloat(referralStats.totalRewards).toFixed(0)} rBBLP</p>
                </div>
                <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>

          {/* Assets Table - Enhanced for Desktop */}
          <div className="bg-gradient-to-br from-zinc-900/90  to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-fade-in-up">
            {/* Assets List - Enhanced */}
            <div className="divide-y divide-zinc-800/50">
              {ASSETS.map((asset, index) => {
                const data = getAssetData(asset.symbol);
                const isPositive = data.changeValue > 0;
                
                return (
                  <div
                    key={asset.symbol}
                    className="px-6 py-5 hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer group animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Asset Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg">
                          <Image 
                            src={asset.icon} 
                            alt={asset.symbol} 
                            width={28} 
                            height={28} 
                            className="group-hover:rotate-12 transition-transform lg:w-8 lg:h-8" 
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors text-base lg:text-lg">{asset.symbol}</h3>
                          <p className="text-sm text-gray-500">{data.balance.toFixed(4)} {asset.symbol}</p>
                        </div>
                      </div>

                      {/* Balance & Change */}
                      <div className="text-right">
                        <p className="font-bold text-lg lg:text-xl text-white">
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
              <div className="mb-6">
                {/* Header - Enhanced */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-white">Recent Activity</h3>
                    <p className="text-sm text-gray-400">Your staking transactions</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-zinc-800/50 px-3 py-1 rounded-full">
                    {stakeLogs.length} total
                  </span>
                </div>

                {/* Transactions List - Show 3 by default */}
                <div className="space-y-3 lg:space-y-4">
                  {stakeLogs.slice(0, showAllStakeLogs ? stakeLogs.length : 3).map((log, index) => {
                    const logDate = new Date(log.created_at || '');
                    const getActionIcon = (actionType: string) => {
                      switch (actionType) {
                        case 'stake': return <TrendingUp className="w-4 h-4 text-green-400" />;
                        case 'unstake': return <ArrowDownLeft className="w-4 h-4 text-yellow-400" />;
                        case 'claim_rewards': return <Coins className="w-4 h-4 text-blue-400" />;
                        case 'emergency_withdraw': return <Info className="w-4 h-4 text-red-400" />;
                        default: return <History className="w-4 h-4 text-gray-400" />;
                      }
                    };

                    const getActionColor = (actionType: string) => {
                      switch (actionType) {
                        case 'stake': return 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400';
                        case 'unstake': return 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400';
                        case 'claim_rewards': return 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400';
                        case 'emergency_withdraw': return 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-400';
                        default: return 'from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-400';
                      }
                    };

                    return (
                      <div
                        key={index}
                        className={cn(
                          "bg-gradient-to-br rounded-xl p-4 lg:p-6 border backdrop-blur-sm group hover:scale-[1.02] transition-all duration-200 animate-slide-in-right",
                          getActionColor(log.action_type)
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 lg:gap-4">
                            <div className="p-2 rounded-lg bg-zinc-800/50 backdrop-blur-sm">
                              {getActionIcon(log.action_type)}
                            </div>
                            <div>
                              <p className={cn("font-semibold capitalize text-sm lg:text-base", getActionColor(log.action_type).split(' ').pop())}>
                                {log.action_type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-400">
                                {logDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {log.amount !== '0' && (
                              <div className="text-right">
                                <p className="font-bold text-white text-sm lg:text-base">{parseFloat(log.amount).toFixed(2)}</p>
                                <p className="text-xs text-gray-400">BBLP</p>
                              </div>
                            )}
                            
                            <a
                              href={`https://testnet.bscscan.com/tx/${log.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View All Link */}
                {stakeLogs.length > 3 && (
                  <div className="mt-6">
                    <Link href="/stake">
                      <Button
                        variant="ghost"
                        className="w-full text-yellow-400 transition-all duration-200 group"
                      >
                        <span>View All Transactions</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Transactions State - Enhanced */}
          {isConnected && stakeLogs.length === 0 && (
            <div >
              <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-12 shadow-2xl text-center">
                <div className="w-20 h-20  flex items-center justify-center mx-auto mb-6 ">
                  <History className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">No Staking Activity Yet</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Start your staking journey today and earn rewards while supporting the network
                </p>
                <Link href="/stake">
                  <Button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 group">
                    <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" />
                    Start Staking Now
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Referral Section - Better Desktop Layout */}
          {isConnected && referralCode && (
            <div>
              <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 mb-8 shadow-lg overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                  {/* Left Side - Info */}
                  <div className="flex-1 p-6 lg:p-8 lg:border-r border-zinc-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Earn with Referrals</h3>
                        <p className="text-sm text-gray-400">Invite friends, earn rewards together</p>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-black/20 rounded-xl p-4 text-center border border-zinc-800">
                        <p className="text-2xl font-bold text-white mb-1">{referralStats.totalReferrals}</p>
                        <p className="text-xs text-gray-400">Friends Referred</p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-4 text-center border border-zinc-800">
                        <p className="text-2xl font-bold text-yellow-400 mb-1">{parseFloat(referralStats.totalRewards).toFixed(0)}</p>
                        <p className="text-xs text-gray-400">BBLP Earned</p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-4 text-center border border-zinc-800">
                        <p className="text-2xl font-bold text-yellow-400 mb-1">5</p>
                        <p className="text-xs text-gray-400">Reward Tiers</p>
                      </div>
                    </div>
                    
                    {/* Referral Link */}
                    <div className="mt-6 bg-black/20 rounded-xl p-4 border border-zinc-800">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">Your referral link</p>
                          <p className="text-sm font-mono text-white truncate">
                            https://waitlist-murex-nine.vercel.app?ref={referralCode.code}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://waitlist-murex-nine.vercel.app?ref=${referralCode.code}`);
                              toast.success('Referral link copied!');
                            }}
                            className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200"
                            aria-label="Copy referral link"
                          >
                            <Copy className="w-4 h-4 text-yellow-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                                                  title: 'Join BBLP',
                                text: 'Join BBLP and earn rewards when you stake! Use my referral link:',
                                  url: `https://waitlist-murex-nine.vercel.app?ref=${referralCode.code}`
                                });
                              } else {
                                navigator.clipboard.writeText(`https://waitlist-murex-nine.vercel.app?ref=${referralCode.code}`);
                                toast.success('Referral link copied!');
                              }
                            }}
                            className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200"
                            aria-label="Share referral link"
                          >
                            <Share2 className="w-4 h-4 text-yellow-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side - CTA */}
                  <div className="lg:w-64 flex items-center justify-center p-6 lg:p-8 bg-black/20">
                    <Link href="/referral" className="w-full">
                      <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 group">
                        <Trophy className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        View Referral Program
                      </Button>
                    </Link>
                  </div>
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