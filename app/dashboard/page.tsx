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
import { TrendingUp, Wallet, RefreshCw, Plus, Send, Info, ArrowUpRight, ArrowDownLeft, Coins } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";

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

          {/* Transaction History - Placeholder */}
          <div className="mt-8 mb-10 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Recent Transactions</h3>
            <p className="text-sm text-gray-500 mb-6">Your transaction history will appear here</p>
          
          </div>
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