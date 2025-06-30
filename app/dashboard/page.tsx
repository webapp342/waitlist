"use client";

import DashboardCTA from "@/components/dashboard-cta";
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { useAccount, useBalance } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, RefreshCw, Plus, Send, Info, ArrowUpRight, ArrowDownLeft, Coins, History, ExternalLink, ChevronDown, ChevronUp, Copy, Share2, Users, Gift } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { stakeLogsService, StakeLog, referralService, ReferralCode } from '@/lib/supabase';
import { ethers } from 'ethers';
import { userService } from '@/lib/supabase';

const USDT_ADDRESS = '0x690419A4f1B5320c914f41b44CE10EB0BAC70908';
const BUSD_ADDRESS = '0xD7D767dB964C36B41EfAABC02669169eDF513eAb';
const BBLIP_ADDRESS = '0xbB7Adc4303857A388ba3BFb52fe977f696A2Ca72';

const ASSETS = [
  { symbol: 'BBLIP', name: 'BBLIP Token', icon: '/logo.svg' },
  { symbol: 'BNB', name: 'Binance Coin', icon: '/bnb.svg'  },
  { symbol: 'USDT', name: 'Tether USD', icon: '/usdt.svg'  },
  { symbol: 'BUSD', name: 'Binance USD', icon: '/busd.svg' }
];

export default function Dashboard() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const { userData } = useWallet();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [bnbPrice, setBnbPrice] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stakeLogs, setStakeLogs] = useState<StakeLog[]>([]);
  const [showStakeLogs, setShowStakeLogs] = useState(false);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, totalRewards: '0' });
  const [showReferralSection, setShowReferralSection] = useState(false);

  // Fetch token balances for the connected wallet
  const { data: usdtBalance, refetch: refetchUSDT } = useBalance(address ? { address, token: USDT_ADDRESS } : { address: undefined });
  const { data: busdBalance, refetch: refetchBUSD } = useBalance(address ? { address, token: BUSD_ADDRESS } : { address: undefined });
  const { data: bblipBalance, refetch: refetchBBLIP } = useBalance(address ? { address, token: BBLIP_ADDRESS } : { address: undefined });

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

  // Load stake logs when wallet is connected
  useEffect(() => {
    const loadStakeLogs = async () => {
      if (isConnected && address) {
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
  }, [isConnected, address]);

  // Load referral data when wallet is connected
  useEffect(() => {
    const loadReferralData = async () => {
      if (isConnected && address) {
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
              totalRewards: stats.totalRewards
            });
            
            console.log('Referral data loaded:', { code: code?.code, stats });
          }
        } catch (error) {
          console.error('Error loading referral data:', error);
        }
      }
    };

    loadReferralData();
  }, [isConnected, address]);

  // Calculate total USD value for all assets
  const bnbUsd = userData?.bnbBalance && bnbPrice ? parseFloat(userData.bnbBalance) * bnbPrice : 0;
  const usdtUsd = usdtBalance ? parseFloat(usdtBalance.formatted) * 1 : 0;
  const busdUsd = busdBalance ? parseFloat(busdBalance.formatted) * 1 : 0;
  const bblipUsd = bblipBalance ? parseFloat(bblipBalance.formatted) * 0.10 : 0;
  const totalUsd = bnbUsd + usdtUsd + busdUsd + bblipUsd;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchUSDT(),
        refetchBUSD(),
        refetchBBLIP()
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
      case 'BBLIP':
        return {
          balance: bblipBalance ? parseFloat(bblipBalance.formatted) : 0,
          usdValue: bblipUsd,
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

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
        <Header />

        <DashboardCTA userData={userData} totalUsd={totalUsd} />

     

        {/* Main Dashboard Content */}
        <div className="w-full max-w-6xl mt-8">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Portfolio Overview</h1>
              <p className="text-gray-500 text-sm">Track and manage your digital assets</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              
              <Link href="/presale">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buy 
                </Button>
              </Link>

              <Link href="/stake">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 font-semibold transition-all"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Stake
                </Button>
              </Link>
            </div>
          </div>

                     
  
          {/* Assets Table - Clean Professional Design */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
            {/* Table Header with Total Assets Value */}
           

            {/* Assets List - Simplified */}
            <div className="divide-y divide-zinc-800">
              {ASSETS.map((asset) => {
                const data = getAssetData(asset.symbol);
                const isPositive = data.changeValue > 0;
                
                return (
                  <div
                    key={asset.symbol}
                    className="px-6 py-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      {/* Asset Info */}
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center ",
                      
                        )}>
                          <Image src={asset.icon} alt={asset.symbol} width={24} height={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{asset.symbol}</h3>
                          <p className="text-sm text-gray-500">{data.balance.toFixed(4)} {asset.symbol}</p>
                        </div>
                      </div>

                      {/* Balance & Change */}
                      <div className="text-right">
                        <p className="font-semibold text-lg text-white">
                          ${data.usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                     
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stake Logs - Only show when wallet is connected */}
          {isConnected && stakeLogs.length > 0 && (
            <div className="mt-8 mb-10 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl">
              {/* Stake Logs Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <History className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Staking Activity</h3>
                    <p className="text-sm text-gray-500">Your recent staking transactions</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowStakeLogs(!showStakeLogs)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  {showStakeLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Stake Logs List */}
              {showStakeLogs && (
                <div className="space-y-3">
                  {stakeLogs.slice(0, 5).map((log, index) => {
                    const logDate = new Date(log.created_at || '');
                    const isConfirmed = log.status === 'confirmed';
                    const isPending = log.status === 'pending';
                    const isFailed = log.status === 'failed';

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
                        case 'stake': return 'text-green-400';
                        case 'unstake': return 'text-yellow-400';
                        case 'claim_rewards': return 'text-blue-400';
                        case 'emergency_withdraw': return 'text-red-400';
                        default: return 'text-gray-400';
                      }
                    };

                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'confirmed': return 'bg-green-400';
                        case 'pending': return 'bg-yellow-400';
                        case 'failed': return 'bg-red-400';
                        default: return 'bg-gray-400';
                      }
                    };

                    return (
                      <div key={index} className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
                              {getActionIcon(log.action_type)}
                            </div>
                            <div>
                              <p className={`font-semibold capitalize ${getActionColor(log.action_type)}`}>
                                {log.action_type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-400">
                                {logDate.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`}></div>
                            <span className="text-xs text-gray-400 capitalize">{log.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            {log.amount !== '0' && (
                              <div>
                                <p className="text-gray-400">Amount</p>
                                <p className="font-semibold text-white">{parseFloat(log.amount).toFixed(2)} BBLIP</p>
                              </div>
                            )}
                            {log.block_number && (
                              <div>
                                <p className="text-gray-400">Block</p>
                                <p className="font-semibold text-white">#{log.block_number}</p>
                              </div>
                            )}
                          </div>
                          
                          <a
                            href={`https://testnet.bscscan.com/tx/${log.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {log.gas_used && log.gas_price && (
                          <div className="mt-3 pt-3 border-t border-zinc-700">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>Gas: {log.gas_used.toLocaleString()}</span>
                              <span>Price: {ethers.formatUnits(log.gas_price, 'gwei')} Gwei</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show more link if there are more logs */}
              {stakeLogs.length > 5 && (
                <div className="mt-6 text-center">
                  <Link href="/stake">
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                      View All Transactions
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* No Transactions Message */}
          {isConnected && stakeLogs.length === 0 && (
            <div className="mt-8 mb-10 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Staking Activity</h3>
              <p className="text-sm text-gray-500 mb-6">Start staking to see your transaction history</p>
              <Link href="/stake">
                <Button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold">
                  Start Staking
                </Button>
              </Link>
            </div>
          )}

          {/* Referral System - Only show when wallet is connected */}
          {isConnected && referralCode && (
            <div className="mt-8 mb-10 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl">
              {/* Referral Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Referral Program</h3>
                    <p className="text-sm text-gray-500">Earn rewards by inviting friends</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowReferralSection(!showReferralSection)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  {showReferralSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Referral Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Total Referrals</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{referralStats.totalReferrals}</p>
                </div>
                
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Total Rewards</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{parseFloat(referralStats.totalRewards).toFixed(2)} BBLIP</p>
                </div>
                
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Your Code</span>
                  </div>
                  <p className="text-lg font-mono text-white">{referralCode.code}</p>
                </div>
              </div>

              {/* Referral Details */}
              {showReferralSection && (
                <div className="space-y-4">
                  {/* Referral Link */}
                  <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700">
                    <h4 className="text-sm font-semibold text-white mb-3">Your Referral Link</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}?ref=${referralCode.code}`}
                        readOnly
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}?ref=${referralCode.code}`);
                          toast.success('Referral link copied!');
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          const url = `${window.location.origin}?ref=${referralCode.code}`;
                          if (navigator.share) {
                            navigator.share({
                              title: 'Join BBLIP Card Program',
                              text: 'Get your exclusive crypto cards with my referral link!',
                              url: url
                            });
                          } else {
                            navigator.clipboard.writeText(url);
                            toast.success('Referral link copied!');
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                    <h4 className="text-sm font-semibold text-white mb-3">How Referral Rewards Work</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                        <p>Share your referral link with friends</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                        <p>When they sign up and connect their wallet, you both get rewards</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                        <p>Rewards are automatically added to your account</p>
                      </div>
                    </div>
                  </div>

                  {/* View All Referrals Button */}
                  <div className="text-center pt-4">
                    <Link href="/referral">
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Users className="w-4 h-4 mr-2" />
                        View All Referrals
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
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