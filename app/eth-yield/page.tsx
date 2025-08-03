'use client';

import { useState, useEffect } from 'react';
import { useEthStaking } from '@/hooks/useEthStaking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from "@/components/header";
import Particles from "@/components/ui/particles";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { Coins, TrendingUp, Clock, History, ArrowUpRight, ArrowDownLeft, Wallet, RefreshCw, Info, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { ethTokensService, EthTokens } from '@/lib/supabase';
import { fetchCryptoPrices } from '@/lib/priceService';
import WalletModal from '@/components/WalletModal';
import APRChart from '@/components/APRChart';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export default function EthYieldPage() {
  const [selectedAsset, setSelectedAsset] = useState<'ETH' | 'WETH' | 'stETH' | 'ezETH' | 'wstETH' | 'rsETH' | 'weETH' | 'eETH' | 'ETHx' | 'pufETH'>('ETH');
  const [ethTokensData, setEthTokensData] = useState<EthTokens | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(3000);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Chain control
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isOnMainnet = chainId === mainnet.id;
  
  const {
    isConnected,
    address,
    loading,
    error,
    contractBalance, 
    totalStaked,
    totalStakers,
    totalRewardsPaid,
    userInfo,
    apyRate,
    lockPeriod,
    walletBalance, 
    historyData,
    selectedAsset: hookSelectedAsset,
    stake,
    approveWETH,
    claimRewards,
    withdraw,
    calculateReward
  } = useEthStaking(selectedAsset);

  // Fetch ETH tokens data from Supabase
  useEffect(() => {
    const fetchEthTokens = async () => {
      try {
        const data = await ethTokensService.getLatestEthTokens();
        console.log('ETH Tokens Data from Supabase:', data);
        setEthTokensData(data);
      } catch (error) {
        console.error('Error fetching ETH tokens:', error);
      }
    };

    fetchEthTokens();
  }, []);

  // Fetch ETH price from CoinGecko
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const prices = await fetchCryptoPrices();
        setEthPrice(prices.eth);
        console.log('ETH Price from CoinGecko:', prices.eth);
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        setEthPrice(3000); // Fallback price
      }
    };

    fetchPrices();
  }, []);

  // Debug: Log history data
  useEffect(() => {
    if (historyData) {
      console.log('Stake history count:', historyData.stakeHistory?.length);
      console.log('Claim history count:', historyData.claimHistory?.length);
    }
  }, [historyData]);

  const [chartData, setChartData] = useState<any[]>([]);
  const [currentAPR, setCurrentAPR] = useState<string>('12.5%');

  // Debug: Log lock period
  useEffect(() => {
    console.log('Lock period from contract:', lockPeriod);
  }, [lockPeriod]);

  // Update currentAPR when chartData changes
  useEffect(() => {
    if (chartData.length > 0) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const yesterdayData = chartData.find(item => item.date === yesterdayStr);
      const aprValue = yesterdayData ? `${yesterdayData.totalAPR}%` : '12.5%';
      setCurrentAPR(aprValue);
    }
  }, [chartData]);
  const [stakeAmount, setStakeAmount] = useState('1');
  const [selectedStakeIndex, setSelectedStakeIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('stake');
  const [performanceTab, setPerformanceTab] = useState('performance');
  const [showAPYLabelInfo, setShowAPYLabelInfo] = useState(false);
  const [showAPYValueInfo, setShowAPYValueInfo] = useState(false);
  const [showTVLInfo, setShowTVLInfo] = useState(false);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedAsset !== 'ETH') {
      // First approve token for non-ETH assets
      const approveResult = await approveWETH(stakeAmount);
      if (!approveResult?.success) {
        const errorMsg = approveResult?.error || `Failed to approve ${selectedAsset}`;
        // Clean up long error messages
        const cleanError = errorMsg.includes('User rejected') ? 'Transaction cancelled' : 
                          errorMsg.includes('User denied') ? 'Transaction cancelled' :
                          errorMsg.includes('MetaMask') ? 'Transaction cancelled' :
                          errorMsg;
        toast.error(cleanError);
        return;
      }
      toast.success(`${selectedAsset} approved successfully!`);
    }

    const result = await stake(stakeAmount);
    if (result?.success) {
      toast.success(`Successfully staked ${selectedAsset}!`);
      setStakeAmount('');
    } else {
      const errorMsg = result?.error || 'Failed to stake';
      // Clean up long error messages
      const cleanError = errorMsg.includes('User rejected') ? 'Transaction cancelled' : 
                        errorMsg.includes('User denied') ? 'Transaction cancelled' :
                        errorMsg.includes('MetaMask') ? 'Transaction cancelled' :
                        errorMsg;
      toast.error(cleanError);
    }
  };

  const handleClaimRewards = async () => {
    const result = await claimRewards();
    if (result?.success) {
      toast.success('Successfully claimed rewards!');
    } else {
      const errorMsg = result?.error || 'Failed to claim rewards';
      const cleanError = errorMsg.includes('User rejected') ? 'Transaction cancelled' : 
                        errorMsg.includes('User denied') ? 'Transaction cancelled' :
                        errorMsg.includes('MetaMask') ? 'Transaction cancelled' :
                        errorMsg;
      toast.error(cleanError);
    }
  };

  const handleWithdraw = async (stakeIndex: number) => {
    const result = await withdraw(stakeIndex);
    if (result?.success) {
      toast.success('Successfully withdrawn stake!');
      setSelectedStakeIndex(null);
    } else {
      const errorMsg = result?.error || 'Failed to withdraw';
      const cleanError = errorMsg.includes('User rejected') ? 'Transaction cancelled' : 
                        errorMsg.includes('User denied') ? 'Transaction cancelled' :
                        errorMsg.includes('MetaMask') ? 'Transaction cancelled' :
                        errorMsg;
      toast.error(cleanError);
    } 
  };

  const handleSwitchToMainnet = async () => {
    try {
      await switchChain({ chainId: mainnet.id });
      toast.success('Switched to Ethereum Mainnet!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to switch to Ethereum Mainnet';
      const cleanError = errorMsg.includes('User rejected') ? 'Network switch cancelled' : 
                        errorMsg.includes('User denied') ? 'Network switch cancelled' :
                        errorMsg.includes('MetaMask') ? 'Network switch cancelled' :
                        'Failed to switch to Ethereum Mainnet';
      toast.error(cleanError);
      console.error('Switch chain error:', error);
    }
  };

  const formatEther = (value: bigint | string) => {
    if (typeof value === 'bigint') {
      return ethers.formatEther(value);
    }
    return value;
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isStakeWithdrawable = (stake: any) => {
    const lockPeriodSeconds = parseInt(lockPeriod);
    const currentTime = Math.floor(Date.now() / 1000);
    const stakeTime = Number(stake.timestamp);
    const withdrawalTime = stakeTime + lockPeriodSeconds;
    return currentTime >= withdrawalTime;
  };

  const calculateWithdrawalDate = (stakeTimestamp: bigint, lockPeriodSeconds: string) => {
    const stakeDate = new Date(Number(stakeTimestamp) * 1000);
    const lockPeriodMs = parseInt(lockPeriodSeconds) * 1000;
    const withdrawalDate = new Date(stakeDate.getTime() + lockPeriodMs);
    return withdrawalDate.toLocaleDateString('en-GB');
  };

  const isWithdrawalAvailable = (stakeTimestamp: bigint, lockPeriodSeconds: string) => {
    const stakeDate = new Date(Number(stakeTimestamp) * 1000);
    const lockPeriodMs = parseInt(lockPeriodSeconds) * 1000;
    const withdrawalDate = new Date(stakeDate.getTime() + lockPeriodMs);
    const now = new Date();
    return now >= withdrawalDate;
  };

  // Helper function to get token logo
  const getTokenLogo = (asset: string) => {
    const logoMap: { [key: string]: string } = {
      'ETH': '/eth.png',
      'WETH': '/wETH.png',
      'stETH': '/stETH.png',
      'ezETH': '/ezETH.png',
      'wstETH': '/wstETH.png',
      'rsETH': '/rsETH.png',
      'weETH': '/weETH.png',
      'eETH': '/eETH.png',
      'ETHx': '/ETHx.png',
      'pufETH': '/pufETH.png'
    };
    return logoMap[asset] || '/eth.png';
  };

  const apyPercentage = (parseInt(apyRate) / 100).toFixed(2);
  const lockPeriodDays = Math.floor(parseInt(lockPeriod) / (24 * 60 * 60));

  const hasPendingRewards = userInfo && userInfo.pendingRewards > BigInt(0);
  const pendingRewardsFormatted = userInfo ? formatEther(userInfo.pendingRewards) : '0';

  // Calculate total value locked from Supabase data based on selected asset
  const totalValueLocked = ethTokensData ? 
    (selectedAsset === 'ETH' ? (ethTokensData.eth || 0) : 
     selectedAsset === 'WETH' ? (ethTokensData.weth || 0) :
     selectedAsset === 'stETH' ? (ethTokensData.steth || 0) :
     selectedAsset === 'ezETH' ? (ethTokensData.ezeth || 0) :
     selectedAsset === 'wstETH' ? (ethTokensData.wsteth || 0) :
     selectedAsset === 'rsETH' ? (ethTokensData.rseth || 0) :
     selectedAsset === 'weETH' ? (ethTokensData.weeth || 0) :
     selectedAsset === 'eETH' ? (ethTokensData.eeth || 0) :
     selectedAsset === 'ETHx' ? (ethTokensData.ethx || 0) :
     selectedAsset === 'pufETH' ? (ethTokensData.pufeth || 0) : (ethTokensData.weth || 0)).toFixed(2) : '0.10';



  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-20 md:pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          
          <div className="text-center mb-8">
                          <div className="flex items-center justify-center gap-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine">
                  ETH Yield Vault
                </h1>
                <a 
                  href={
                    selectedAsset === 'ETH' ? "https://etherscan.io/address/0x120FA5738751b275aed7F7b46B98beB38679e093" :
                    selectedAsset === 'WETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                    selectedAsset === 'stETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                    selectedAsset === 'ezETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                    "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C"
                  }
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full hover:bg-green-500/30 hover:border-green-500/50 transition-all duration-200 cursor-pointer"
                >
                  <ShieldCheck   className="w-4 h-4 flex-shrink-0 text-green-400" />
                  <span className="text-green-400 text-xs font-medium">Audited </span>                         <ArrowUpRight className="w-4 h-4 flex-shrink-0 text-green-400" />

                </a>
              </div>
            <p className="text-gray-400 text-sm md:text-base">
              Earn <span className="text-yellow-200 font-semibold">{currentAPR} APY</span> by depositing your {selectedAsset} into the vault
            </p>
          </div>

        {/* Error Display - Only show non-technical errors */}
        {error && !error.includes('User rejected') && !error.includes('User denied') && !error.includes('MetaMask') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-red-400" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-6 py-8 shadow-xl">

            
            {/* Stats Row */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">Estimated APY</span>
                  <span
                    className="ml-1 cursor-pointer relative"
                    onClick={() => setShowAPYLabelInfo((v) => !v)}
                    tabIndex={0}
                    onBlur={() => setShowAPYLabelInfo(false)}
                  >
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-zinc-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">i</span>
                    </div>
                    {showAPYLabelInfo && (
                      <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-zinc-800 border border-zinc-700 text-xs text-gray-300 shadow-lg break-words whitespace-normal -left-20">
                        30-day moving average 
                      </div>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-xs sm:text-sm md:text-base">{currentAPR}</span>
                  <span
                    className="ml-1 cursor-pointer relative"
                    onClick={() => setShowAPYValueInfo((v) => !v)}
                    tabIndex={0}
                    onBlur={() => setShowAPYValueInfo(false)}
                  >
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-zinc-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">i</span>
                    </div>
                    {showAPYValueInfo && (
                      <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-zinc-800 border border-zinc-700 text-xs text-gray-300 shadow-lg break-words whitespace-normal right-0">
                        Current APY rate: {currentAPR}. This rate is calculated based on current market conditions and may vary over time. Higher rates may be available during promotional periods.
                      </div>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">Vault TVL</span>
                  <span
                    className="ml-1 cursor-pointer relative"
                    onClick={() => setShowTVLInfo((v) => !v)}
                    tabIndex={0}
                    onBlur={() => setShowTVLInfo(false)}
                  >
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-zinc-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">i</span>
                    </div>
                                          {showTVLInfo && (
                        <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-zinc-800 border border-zinc-700 text-xs text-gray-300 shadow-lg break-words whitespace-normal -left-20">
                          Total Value Locked represents the total amount of {selectedAsset} currently staked in the {selectedAsset} vault. This shows the combined deposits from all users for this specific asset.
                        </div>
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-xs sm:text-sm md:text-base">{`${parseFloat(totalValueLocked).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedAsset}`}</span>
                  <span className="text-gray-500 font-semibold text-xs sm:text-sm md:text-base">|</span>
                  <span className="text-white font-semibold text-xs sm:text-sm md:text-base">${(parseFloat(totalValueLocked) * ethPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-800/60 border border-zinc-700">
                <TabsTrigger 
                  value="stake" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  Deposit
                </TabsTrigger>
                <TabsTrigger 
                  value="unstake" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  Profits
                </TabsTrigger>
                <TabsTrigger 
                  value="withdraw" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  Withdraw
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  History
                </TabsTrigger>
              </TabsList>

              {/* Deposit Tab */}
              <TabsContent value="stake" className="mt-6">
                {isConnected && !isOnMainnet && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-red-400" />
                      <p className="text-red-300 text-sm">Please switch to Ethereum Mainnet to use this vault</p>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {/* Asset Selection */}
                  <div>
                    <Label className="text-gray-300 font-medium">Select the asset</Label>
                    <div className="mt-2">
                      <Select value={selectedAsset} onValueChange={(value) => setSelectedAsset(value as 'ETH' | 'WETH' | 'stETH' | 'ezETH' | 'wstETH' | 'rsETH' | 'weETH' | 'eETH' | 'ETHx' | 'pufETH')}>
                        <SelectTrigger className="w-full bg-zinc-800/60 border-zinc-700 text-white">
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="ETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/eth.png" alt="ETH" width={20} height={20} />
                              <span className="text-white">ETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="WETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/wETH.png" alt="WETH" width={20} height={20} />
                              <span className="text-white">WETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="stETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/stETH.png" alt="stETH" width={20} height={20} />
                              <span className="text-white">stETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ezETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/ezETH.png" alt="ezETH" width={20} height={20} />
                              <span className="text-white">ezETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="wstETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex  justify-between ">
                                <Image src="/wstETH.png" alt="wstETH" width={20} height={20} />
                                <span className="text-gray-500">wstETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rsETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/rsETH.png" alt="rsETH" width={20} height={20} />
                                <span className="text-gray-500">rsETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="weETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/weETH.png" alt="weETH" width={20} height={20} />
                                <span className="text-gray-500">weETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="eETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/eETH.png" alt="eETH" width={20} height={20} />
                                <span className="text-gray-500">eETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ETHx" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/ETHx.png" alt="ETHx" width={20} height={20} />
                                <span className="text-gray-500">ETHx</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="pufETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/pufETH.png" alt="pufETH" width={20} height={20} />
                                <span className="text-gray-500">pufETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <Label className="text-gray-300 font-medium">Enter amount</Label>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          placeholder="0.0"
                          min="0"
                          step="0.00000001"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          value={stakeAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value >= 0 || e.target.value === '') {
                              setStakeAmount(e.target.value);
                            }
                          }}
                          className="bg-zinc-800/60 border-zinc-700 text-white text-lg font-medium placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        className="border-zinc-700 text-gray-300 hover:bg-zinc-800/60 hover:text-white"
                        onClick={() => setStakeAmount(walletBalance)}
                      >
                        MAX
                      </Button>
                    </div>
                    <span className="text-gray-500 text-sm">Balance: {walletBalance} {selectedAsset}</span>
                  </div>

                  {/* Estimated Earnings */}
                  {stakeAmount && parseFloat(stakeAmount) > 0 && (
                    <div className="bg-zinc-800/40 rounded-xl border border-zinc-700 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm font-medium">Estimated Annual Earnings</span>
                        <span className="text-yellow-400 text-sm font-medium">{currentAPR}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">Daily</span>
                          <span className="text-white text-sm">
                            {(() => {
                              const amount = parseFloat(stakeAmount) || 0;
                              const dailyRate = parseFloat(currentAPR.replace('%', '')) / 365 / 100;
                              return `+${(amount * dailyRate).toFixed(6)} ${selectedAsset}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">Monthly</span>
                          <span className="text-white text-sm">
                            {(() => {
                              const amount = parseFloat(stakeAmount) || 0;
                              const monthlyRate = parseFloat(currentAPR.replace('%', '')) / 12 / 100;
                              return `+${(amount * monthlyRate).toFixed(4)} ${selectedAsset}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs">Yearly</span>
                          <span className="text-white text-sm">
                            {(() => {
                              const amount = parseFloat(stakeAmount) || 0;
                              const yearlyRate = parseFloat(currentAPR.replace('%', '')) / 100;
                              return `+${(amount * yearlyRate).toFixed(4)} ${selectedAsset}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {isConnected ? (
                    isOnMainnet ? (
                      <Button
                        onClick={handleStake}
                        disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold h-12 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Staking...' : selectedAsset !== 'ETH' ? 'Approve & Deposit' : 'Deposit'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSwitchToMainnet}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold h-12 text-lg shadow-lg"
                      >
                        Switch to ETH Mainnet
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-lg font-semibold h-12 text-lg shadow-lg"
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Profits Tab */}
              <TabsContent value="unstake" className="mt-6">
                <div className="space-y-6">
                  {/* Asset Selection */}
                  <div>
                    <Label className="text-gray-300 font-medium">Select the asset</Label>
                    <div className="mt-2">
                      <Select value={selectedAsset} onValueChange={(value) => setSelectedAsset(value as 'ETH' | 'WETH' | 'stETH' | 'ezETH' | 'wstETH' | 'rsETH' | 'weETH' | 'eETH' | 'ETHx' | 'pufETH')}>
                        <SelectTrigger className="w-full bg-zinc-800/60 border-zinc-700 text-white">
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="ETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/eth.png" alt="ETH" width={20} height={20} />
                              <span className="text-white">ETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="WETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/wETH.png" alt="WETH" width={20} height={20} />
                              <span className="text-white">WETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="stETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/stETH.png" alt="stETH" width={20} height={20} />
                              <span className="text-white">stETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ezETH">
                            <div className="flex items-center space-x-2">
                              <Image src="/ezETH.png" alt="ezETH" width={20} height={20} />
                              <span className="text-white">ezETH</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="wstETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/wstETH.png" alt="wstETH" width={20} height={20} />
                                <span className="text-gray-500">wstETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rsETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/rsETH.png" alt="rsETH" width={20} height={20} />
                                <span className="text-gray-500">rsETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="weETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/weETH.png" alt="weETH" width={20} height={20} />
                                <span className="text-gray-500">weETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="eETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/eETH.png" alt="eETH" width={20} height={20} />
                                <span className="text-gray-500">eETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ETHx" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/ETHx.png" alt="ETHx" width={20} height={20} />
                                <span className="text-gray-500">ETHx</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div> 
                          </SelectItem>
                          <SelectItem value="pufETH" disabled>
                          <div className="flex space-x-4 justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <Image src="/pufETH.png" alt="pufETH" width={20} height={20} />
                                <span className="text-gray-500">pufETH</span>
                              </div>
                              <span className="text-yellow-400 text-xs ml-auto">Coming Soon</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
 
                  {/* Profits Display */}
                  <div>
                    <Label className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">Available Profits</Label>
                    <div className="mt-2 p-3 sm:p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs sm:text-sm">Pending Profits</span>
                        <span className="text-green-400 font-semibold text-sm sm:text-base md:text-lg text-right">
                          {userInfo ? ethers.formatEther(userInfo.pendingRewards) : '0'} {selectedAsset}
                        </span>
                      </div>
                      {!hasPendingRewards && userInfo && (
                        <div className="mt-2 text-xs text-gray-500">
                          Deposit {selectedAsset} to vault to gain profits
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claim Button */} 
                  {isOnMainnet ? (
                    <Button
                      onClick={handleClaimRewards}
                      disabled={loading || !hasPendingRewards}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-10 sm:h-12 text-sm sm:text-base md:text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Claiming...' : hasPendingRewards ? 'Withdraw Profits' : 'No Profits Available'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSwitchToMainnet}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold h-10 sm:h-12 text-sm sm:text-base md:text-lg shadow-lg"
                    >
                      Switch to ETH Mainnet
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Withdraw Tab */}
              <TabsContent value="withdraw" className="mt-6">
                <div className="space-y-2">
                  {userInfo && userInfo.stakes.length > 0 ? (
                    <div className="space-y-2">
                      {userInfo.stakes.map((stake, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/60 rounded-lg border border-zinc-700">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden">
                              <Image 
                                src={getTokenLogo(selectedAsset)} 
                                alt={selectedAsset} 
                                width={32} 
                                height={32} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium text-xs sm:text-sm truncate">
                                {formatEther(stake.amount)} {selectedAsset}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {new Date(Number(stake.timestamp) * 1000).toLocaleDateString()} → {calculateWithdrawalDate(stake.timestamp, lockPeriod)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 sm:space-x-2">
                            {stake.isActive ? (
                              <div className="text-center hidden sm:block">
                                <span className="text-yellow-400 text-xs block">
                                  {(() => {
                                    const stakeTime = Number(stake.timestamp);
                                    const lockPeriodSeconds = parseInt(lockPeriod);
                                    const withdrawalTime = stakeTime + lockPeriodSeconds;
                                    const currentTime = Math.floor(Date.now() / 1000);
                                    const timeLeft = withdrawalTime - currentTime;
                                    
                                    if (timeLeft <= 0) {
                                      return 'Available';
                                    } else {
                                      const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60));
                                      return `${daysLeft}d left`;
                                    }
                                  })()}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {isWithdrawalAvailable(stake.timestamp, lockPeriod) ? 'Available' : 'Locked'}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-zinc-700 text-gray-400 hidden sm:block">Inactive</Badge>
                            )}
                            <div className="flex flex-col items-center space-y-1">
                              {/* Show time left above button on mobile */}
                              <span className="text-yellow-400 text-xs block sm:hidden">
                                {(() => {
                                  const stakeTime = Number(stake.timestamp);
                                  const lockPeriodSeconds = parseInt(lockPeriod);
                                  const withdrawalTime = stakeTime + lockPeriodSeconds;
                                  const currentTime = Math.floor(Date.now() / 1000);
                                  const timeLeft = withdrawalTime - currentTime;
                                  
                                  if (timeLeft <= 0) {
                                    return 'Available';
                                  } else {
                                    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60));
                                    return `${daysLeft}d left`;
                                  }
                                })()}
                              </span>
                              <Button
                                disabled={true}
                                size="sm"
                                className="bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 text-xs px-4 py-2 h-9 cursor-not-allowed opacity-50 sm:px-2 sm:h-7 sm:py-1"
                              >
                                Withdraw
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      
                      <p className="text-gray-400 text-xs sm:text-sm">No positions yet</p>
                      <p className="text-gray-500 text-xs">Deposit ETH to see your positions here</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-6">
                <div className="space-y-8">
                                    {/* Stake History */}
                  <div>
                    <Label className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">Deposit History</Label>
                    <div className="mt-3">
                      {(historyData && historyData.stakeHistory && historyData.stakeHistory.length > 0) || (userInfo && userInfo.stakes && userInfo.stakes.length > 0) ? (
                        <div className="space-y-2">
                          {/* Show blockchain history if available */}
                          {historyData && historyData.stakeHistory && historyData.stakeHistory.length > 0 ? (
                            historyData.stakeHistory.map((stake, index) => (
                              <div key={index} className="border border-zinc-700 rounded-lg p-3 bg-blue-500/5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden">
                                      <Image 
                                        src={getTokenLogo(selectedAsset)} 
                                        alt={selectedAsset} 
                                        width={32} 
                                        height={32} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                                        Staked {formatEther(stake.amount)} {selectedAsset}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        {formatTimestamp(stake.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs">
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            /* Fallback to current stakes */
                            userInfo && userInfo.stakes && userInfo.stakes.map((stake, index) => (
                              <div key={index} className="border border-zinc-700 rounded-lg p-3 bg-blue-500/5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden">
                                      <Image 
                                        src={getTokenLogo(selectedAsset)} 
                                        alt={selectedAsset} 
                                        width={32} 
                                        height={32} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                                        Staked {formatEther(stake.amount)} {selectedAsset}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        {formatTimestamp(stake.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={stake.isActive ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-gray-500/30 text-gray-400 bg-gray-500/10"} >
                                    {stake.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-gray-500 mb-2">
                            <History className="w-8 h-8 sm:w-10 sm:h-10 mx-auto" />
                          </div>
                          <p className="text-gray-400 text-xs sm:text-sm">No positions yet</p>
                          <p className="text-gray-500 text-xs">Deposit {selectedAsset} to see your history here</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claim History */}
                  <div>
                    <Label className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">Withdraw History</Label>
                    <div className="mt-3">
                      {(historyData && historyData.claimHistory && historyData.claimHistory.length > 0) || (userInfo && userInfo.totalRewardsClaimed && userInfo.totalRewardsClaimed > BigInt(0)) ? (
                        <div className="space-y-2">
                          {/* Show blockchain claim history if available */}
                          {historyData && historyData.claimHistory && historyData.claimHistory.length > 0 ? (
                            historyData.claimHistory.map((claim, index) => (
                              <div key={index} className="border border-zinc-700 rounded-lg p-3 bg-green-500/5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs sm:text-sm">✓</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                                       {formatEther(claim.amount)} {selectedAsset}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        {formatTimestamp(claim.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-xs">
                                    Completed
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            /* Fallback to total claimed amount */
                            userInfo && userInfo.totalRewardsClaimed && userInfo.totalRewardsClaimed > BigInt(0) && (
                              <div className="border border-zinc-700 rounded-lg p-3 bg-green-500/5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs sm:text-sm">✓</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                                        Total Claimed: {formatEther(userInfo.totalRewardsClaimed)} {selectedAsset}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        Lifetime rewards claimed
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-xs">
                                    Completed
                                  </Badge>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-gray-500 mb-2">
                            <History className="w-8 h-8 sm:w-10 sm:h-10 mx-auto" />
                          </div>
                          <p className="text-gray-400 text-xs sm:text-sm">No withdraw history yet</p>
                          <p className="text-gray-500 text-xs">Withdraw {selectedAsset} profits to see your history here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Assets Restaked & Protocol Stats */}
        <div className="max-w-4xl mx-auto mt-8 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Restaked */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-6 py-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-white">Assets Restaked</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src="/eth.png" alt="ETH" width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-400 text-sm">ETH</span>
                  </div>
                  <span className="text-white font-semibold">
                    {ethTokensData ? `${((ethTokensData.eth || 0) / 1000).toFixed(2)}K` : '156.92K'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src="/wETH.png" alt="wETH" width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-400 text-sm">wETH</span>
                  </div>
                  <span className="text-white font-semibold">
                    {ethTokensData ? `${((ethTokensData.weth || 0) / 1000).toFixed(2)}K` : '156.92K'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src="/stETH.png" alt="stETH" width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-400 text-sm">stETH</span>
                  </div>
                  <span className="text-white font-semibold">
                    {ethTokensData ? `${((ethTokensData.steth || 0) / 1000).toFixed(2)}K` : '224.38K'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src="/ezETH.png" alt="ezETH" width={32} height={32} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-400 text-sm">ezETH</span>
                  </div>
                  <span className="text-white font-semibold">
                    {ethTokensData ? `${((ethTokensData.ezeth || 0) / 1000).toFixed(2)}K` : '0.00K'}
                  </span>
                </div>
              </div>
            </div>

            {/* Protocol Stats */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-6 py-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-white">Protocol Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">TVL</span>
                  <span className="text-white font-semibold text-lg">
                    {ethTokensData && ethPrice ? 
                      (() => {
                        const totalEth = (ethTokensData.eth || 0) + (ethTokensData.weth || 0) + (ethTokensData.steth || 0) + (ethTokensData.ezeth || 0);
                        const tvlUSD = totalEth * ethPrice;
                        
                        if (tvlUSD >= 1000000000) {
                          return `$${(tvlUSD / 1000000000).toFixed(2)}B`;
                        } else if (tvlUSD >= 1000000) {
                          return `$${(tvlUSD / 1000000).toFixed(2)}M`;
                        } else if (tvlUSD >= 1000) {
                          return `$${(tvlUSD / 1000).toFixed(2)}K`;
                        } else {
                          return `$${tvlUSD.toFixed(2)}`;
                        }
                      })()
                      : '$1.89B'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total Deposited ETH</span>
                  <span className="text-white font-semibold text-lg">
                    {ethTokensData ? 
                      `${(((ethTokensData.eth || 0) + (ethTokensData.weth || 0) + (ethTokensData.steth || 0) + (ethTokensData.ezeth || 0)) / 1000).toFixed(2)}K` 
                      : '38.22K'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* APR Performance & Strategies Tabs */}
        <div className="max-w-4xl mx-auto mt-8 mb-10">
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-6 py-6 shadow-xl">
            <Tabs value={performanceTab} onValueChange={setPerformanceTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800/60 border border-zinc-700 mb-6">
                <TabsTrigger 
                  value="performance" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  Performance
                </TabsTrigger>
                <TabsTrigger 
                  value="strategies" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-yellow-600/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-500/30"
                >
                  Strategies
                </TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">APR Performance</h3>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-yellow-400 text-2xl font-bold">
                          {(() => {
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(today.getDate() - 1);
                            const yesterdayStr = yesterday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                            // Find yesterday's APR from chart data
                            const yesterdayData = chartData?.find(item => item.date === yesterdayStr);
                            const aprValue = yesterdayData ? `${yesterdayData.totalAPR}%` : '12.5%';
                            return aprValue;
                          })()}
                        </span>
                        <p className="text-gray-400 text-sm">7 days trailing APR</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <span className="text-gray-400">Realized APR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-400">Accruing APR</span>
                    </div>
                  </div>
                </div>
                
                {/* Chart Container */}
                <div className="h-72 sm:h-64 rounded-xl">
                  <APRChart onDataGenerated={setChartData} />
                </div>

                {/* Strategy Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">Description</h4>
                    <p className="text-gray-400 text-sm">
                      Assets are deposited in AAVE, Compound, and other strategies to earn top rewards. 
                    </p>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-gray-400 text-xs">Contract:</span>
                      <a 
                        href={
                          selectedAsset === 'ETH' ? "https://etherscan.io/address/0x120FA5738751b275aed7F7b46B98beB38679e093" :
                          selectedAsset === 'WETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                          selectedAsset === 'stETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                          selectedAsset === 'ezETH' ? "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                          "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C"
                        }
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs font-mono flex items-center gap-1 break-all"
                      >
                        <span className="hidden sm:inline">
                          {selectedAsset === 'ETH' ? "0x120FA5738751b275aed7F7b46B98beB38679e093" :
                           selectedAsset === 'WETH' ? "0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                           selectedAsset === 'stETH' ? "0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                           selectedAsset === 'ezETH' ? "0xf0bb20865277aBd641a307eCe5Ee04E79073416C" :
                           "0xf0bb20865277aBd641a307eCe5Ee04E79073416C"}
                        </span>
                        <span className="sm:hidden">
                          {selectedAsset === 'ETH' ? "0x12...e093" :
                           selectedAsset === 'WETH' ? "0xf0...416C" :
                           selectedAsset === 'stETH' ? "0xf0...416C" :
                           selectedAsset === 'ezETH' ? "0xf0...416C" :
                           "0xf0...416C"}
                        </span>
                        <ArrowUpRight className="w-2 h-2 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Platform fee</span>
                      <span className="text-white font-medium">0.73%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Performance fee</span>
                      <span className="text-white font-medium">1.53%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Lock period</span>
                      <span className="text-white font-medium">30 days</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-gray-400 text-sm">Assets accepted</span>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 rounded-full border border-zinc-700">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                            <img src="/eth.svg" alt="ETH" className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                          <span className="text-xs text-gray-300 font-medium">ETH</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 rounded-full border border-zinc-700">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                            <img src="/wETH.png" alt="WETH" className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                          <span className="text-xs text-gray-300 font-medium">WETH</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 rounded-full border border-zinc-700">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                            <img src="/stETH.png" alt="stETH" className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                          <span className="text-xs text-gray-300 font-medium">stETH</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 rounded-full border border-zinc-700">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                            <img src="/ezETH.png" alt="ezETH" className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </div>
                          <span className="text-xs text-gray-300 font-medium">ezETH</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-zinc-700">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Note: By accessing Vault, you acknowledge and agree to the risks involved and agree to the Vault Disclaimers
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Strategies Tab */}
              <TabsContent value="strategies" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Vault Allocation</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                    {/* Vaults List */}
                    <div className="lg:col-span-2">
                      <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4 border-b border-zinc-700 bg-zinc-800/40">
                          <div className="text-gray-400 text-xs lg:text-sm font-medium">Vault</div>
                          <div className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-1">
                            %
                            <svg className="w-2 h-2 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-1 hidden sm:flex">
                            $
                            <svg className="w-2 h-2 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-1">
                            APY
                            <svg className="w-2 h-2 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        
                                                 {/* Vault Rows */}
                         <div className="divide-y divide-zinc-700">
                           {/* Active Vaults */}
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-yellow-400 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-white text-xs lg:text-sm font-medium truncate">Compound V3 WETH</span>
                             </div>
                             <div className="text-white text-xs lg:text-sm">52.49%</div>
                             <div className="text-white text-xs lg:text-sm hidden sm:block">$2,627,984</div>
                             <div className="text-yellow-400 text-xs lg:text-sm font-medium">4.44%</div>
                           </div>
                           
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-yellow-500 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-white text-xs lg:text-sm font-medium truncate">Morpho Gauntlet</span>
                             </div>
                             <div className="text-white text-xs lg:text-sm">44.23%</div>
                             <div className="text-white text-xs lg:text-sm hidden sm:block">$2,214,545</div>
                             <div className="text-yellow-400 text-xs lg:text-sm font-medium">3.56%</div>
                           </div>
                           
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-yellow-600 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-white text-xs lg:text-sm font-medium truncate">Aave V3 Lido</span>
                             </div>
                             <div className="text-white text-xs lg:text-sm">3.28%</div>
                             <div className="text-white text-xs lg:text-sm hidden sm:block">$164,262</div>
                             <div className="text-yellow-400 text-xs lg:text-sm font-medium">2.24%</div>
                           </div>
                          
                                                     {/* Inactive Vaults */}
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-500 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-gray-500 text-xs lg:text-sm font-medium truncate">Aave V3 WETH</span>
                             </div>
                             <div className="text-gray-500 text-xs lg:text-sm">0%</div>
                             <div className="text-gray-500 text-xs lg:text-sm hidden sm:block">$0.00</div>
                             <div className="text-gray-500 text-xs lg:text-sm">2.85%</div>
                           </div>
                           
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-500 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-gray-500 text-xs lg:text-sm font-medium truncate">stETH accumulator</span>
                             </div>
                             <div className="text-gray-500 text-xs lg:text-sm">0%</div>
                             <div className="text-gray-500 text-xs lg:text-sm hidden sm:block">$0.00</div>
                             <div className="text-gray-500 text-xs lg:text-sm">0.00%</div>
                           </div>
                           
                           <div className="grid grid-cols-4 gap-2 lg:gap-4 p-3 lg:p-4">
                             <div className="flex items-center gap-2 lg:gap-3">
                               <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-500 rounded-full"></div>
                               <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center">
                                 <img src="/eth.svg" alt="ETH" className="w-3 h-3 lg:w-4 lg:h-4" />
                               </div>
                               <span className="text-gray-500 text-xs lg:text-sm font-medium truncate">Spark WETH</span>
                             </div>
                             <div className="text-gray-500 text-xs lg:text-sm">0%</div>
                             <div className="text-gray-500 text-xs lg:text-sm hidden sm:block">$0.00</div>
                             <div className="text-gray-500 text-xs lg:text-sm">0.00%</div>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Donut Chart */}
                    <div className="lg:col-span-1">
                      <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 p-6 flex flex-col items-center justify-center h-full">
                        <div className="relative w-48 h-48">
                                                     {/* Donut Chart */}
                           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                             {/* Background Circle */}
                             <circle
                               cx="50"
                               cy="50"
                               r="40"
                               fill="none"
                               stroke="#374151"
                               strokeWidth="8"
                             />
                             {/* Yellow Segment (52.49%) */}
                             <circle
                               cx="50"
                               cy="50"
                               r="40"
                               fill="none"
                               stroke="#F7FF9B"
                               strokeWidth="8"
                               strokeDasharray={`${2 * Math.PI * 40 * 0.5249} ${2 * Math.PI * 40}`}
                               strokeDashoffset="0"
                             />
                             {/* Gold Segment (44.23%) */}
                             <circle
                               cx="50"
                               cy="50"
                               r="40"
                               fill="none"
                               stroke="#EAB308"
                               strokeWidth="8"
                               strokeDasharray={`${2 * Math.PI * 40 * 0.4423} ${2 * Math.PI * 40}`}
                               strokeDashoffset={`-${2 * Math.PI * 40 * 0.5249}`}
                             />
                             {/* Orange Segment (3.28%) */}
                             <circle
                               cx="50"
                               cy="50"
                               r="40"
                               fill="none"
                               stroke="#F59E0B"
                               strokeWidth="8"
                               strokeDasharray={`${2 * Math.PI * 40 * 0.0328} ${2 * Math.PI * 40}`}
                               strokeDashoffset={`-${2 * Math.PI * 40 * (0.5249 + 0.4423)}`}
                             />
                           </svg>
                          
                          {/* Center Text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-white text-lg font-semibold">allocation %</div>
                            </div>
                          </div>
                        </div>
                        
                                                 {/* Legend */}
                         <div className="mt-6 space-y-2 w-full">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 bg-[#F7FF9B] rounded-full"></div>
                               <span className="text-gray-300 text-xs">Compound V3</span>
                             </div>
                             <span className="text-white text-xs font-medium">52.49%</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 bg-[#EAB308] rounded-full"></div>
                               <span className="text-gray-300 text-xs">Morpho Gauntlet</span>
                             </div>
                             <span className="text-white text-xs font-medium">44.23%</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                               <span className="text-gray-300 text-xs">Aave V3 Lido</span>
                             </div>
                             <span className="text-white text-xs font-medium">3.28%</span>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
        
      <Particles
        quantityDesktop={150}
        quantityMobile={50}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
      
      {/* Wallet Modal */}
      <WalletModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </main>
  </>
  );
} 