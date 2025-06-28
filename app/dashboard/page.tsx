"use client";

import DashboardCTA from "@/components/dashboard-cta";
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAccount, useBalance } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, RefreshCw, Plus, Send, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const USDT_ADDRESS = '0x690419A4f1B5320c914f41b44CE10EB0BAC70908';
const BUSD_ADDRESS = '0xD7D767dB964C36B41EfAABC02669169eDF513eAb';
const BBLIP_ADDRESS = '0xbB7Adc4303857A388ba3BFb52fe977f696A2Ca72';

const ASSETS = [
  { symbol: 'BNB', name: 'Binance Coin', icon: '/bnb.svg' },
  { symbol: 'USDT', name: 'Tether USD', icon: '/usdt.svg' },
  { symbol: 'BUSD', name: 'Binance USD', icon: '/busd.svg' },
  { symbol: 'BBLIP', name: 'BBLIP Token', icon: '/logo.svg' }
];

export default function Dashboard() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const { userData } = useWallet();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [bnbPrice, setBnbPrice] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          change: '+2.34%'
        };
      case 'USDT':
        return {
          balance: usdtBalance ? parseFloat(usdtBalance.formatted) : 0,
          usdValue: usdtUsd,
          price: 1.00,
          change: '+0.01%'
        };
      case 'BUSD':
        return {
          balance: busdBalance ? parseFloat(busdBalance.formatted) : 0,
          usdValue: busdUsd,
          price: 1.00,
          change: '0.00%'
        };
      case 'BBLIP':
        return {
          balance: bblipBalance ? parseFloat(bblipBalance.formatted) : 0,
          usdValue: bblipUsd,
          price: 0.10,
          change: '+15.67%'
        };
      default:
        return { balance: 0, usdValue: 0, price: 0, change: '0.00%' };
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

        {/* Professional Warning Message */}
        {needsStaking && (
          <div className="w-full max-w-6xl mt-6">
            <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-xl rounded-xl border border-orange-400/20 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center  flex-shrink-0">
                  <Info className="w-3 h-3 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-orange-200 ">Card Activation Required</h4>
                 
                </div>
               
                
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="w-full max-w-6xl mt-8">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">Portfolio Overview</h1>
              <p className="text-gray-400 text-sm md:text-base">Manage your crypto assets and track performance</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="bg-black/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200/50 hover:text-yellow-200"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Link href="/presale">
                <Button
                  size="sm"
                  className="bg-yellow-200 hover:bg-yellow-300 text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buy More
                </Button>
              </Link>
            </div>
          </div>

          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Total Portfolio Value */}
            <div className="bg-gradient-to-br from-[#0A0A0A]/90 to-black/60 backdrop-blur-xl rounded-2xl border border-yellow-400/20 p-4 md:p-6 shadow-lg shadow-yellow-400/5">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-medium text-gray-400">Total Portfolio</h3>
                  <p className="text-lg md:text-2xl font-bold text-white">
                    ${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">+12.34%</span>
                <span className="text-gray-400">24h</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-[#0A0A0A]/90 to-black/60 backdrop-blur-xl rounded-2xl border border-blue-400/20 p-4 md:p-6 shadow-lg">
              <h3 className="text-xs md:text-sm font-medium text-gray-400 mb-3 md:mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/presale" className="flex items-center justify-center gap-2 p-3 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 text-yellow-200 hover:text-yellow-100 transition-all duration-200">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Buy</span>
                </Link>
                <Link href="/stake" className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-200 hover:text-blue-100 transition-all duration-200">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Stake</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-zinc-800 mb-6">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 py-3 md:py-4 px-1 text-center border-b-2 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'portfolio'
                    ? 'border-yellow-200 text-yellow-200'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'
                }`}
              >
                Portfolio Assets
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-3 md:py-4 px-1 text-center border-b-2 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'transactions'
                    ? 'border-yellow-200 text-yellow-200'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'
                }`}
              >
                Transaction History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="pb-8">
            {activeTab === 'portfolio' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {ASSETS.map((asset) => {
                  const data = getAssetData(asset.symbol);
                  const isPositive = data.change.startsWith('+');
                  
                  return (
                    <div
                      key={asset.symbol}
                      className="bg-gradient-to-br from-[#0A0A0A]/90 to-black/60 backdrop-blur-xl rounded-2xl border border-yellow-400/10 p-4 md:p-6 shadow-lg hover:border-yellow-400/20 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-black/60 border border-yellow-400/10 flex items-center justify-center">
                            <Image src={asset.icon} alt={asset.symbol} width={24} height={24} className="md:w-6 md:h-6" />
                          </div>
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-white">{asset.symbol}</h3>
                            <p className="text-xs md:text-sm text-gray-400">{asset.name}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg md:text-xl font-bold text-white">
                            ${data.usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {data.change}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                        <div>
                          <p className="text-xs md:text-sm text-gray-400">Balance</p>
                          <p className="text-sm md:text-base font-semibold text-white">
                            {data.balance.toFixed(asset.symbol === 'BNB' ? 4 : 2)} {asset.symbol}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm text-gray-400">Price</p>
                          <p className="text-sm md:text-base font-semibold text-white">
                            ${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0A0A0A]/90 to-black/60 backdrop-blur-xl rounded-2xl border border-yellow-400/10 p-6 md:p-8 shadow-lg text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 md:w-8 md:h-8 text-zinc-400" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-white mb-2">No Transactions Yet</h3>
                <p className="text-sm md:text-base text-gray-400 mb-6">Your transaction history will appear here once you start trading</p>
                <Link href="/presale">
                  <Button className="bg-yellow-200 hover:bg-yellow-300 text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Make Your First Purchase
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
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