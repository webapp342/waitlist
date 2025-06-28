'use client';

import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Particles from "@/components/ui/particles";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Zap, TrendingUp, Shield, Clock, DollarSign } from 'lucide-react';

// Card stake requirements
const CARD_REQUIREMENTS = {
  BRONZE: 1000,
  SILVER: 2000,
  BLACK: 3500
};

// Enhanced styles
const glowStyles = `
  [&]:before:absolute [&]:before:inset-0 
  [&]:before:rounded-3xl
  [&]:before:bg-gradient-to-r [&]:before:from-blue-500/10 [&]:before:via-purple-500/10 [&]:before:to-blue-500/10
  [&]:before:animate-glow [&]:before:blur-xl
  relative overflow-hidden
`;

const shimmerStyles = `
  [&]:before:absolute [&]:before:inset-0 
  [&]:before:bg-gradient-to-r [&]:before:from-transparent [&]:before:via-white/10 [&]:before:to-transparent
  [&]:before:animate-[shimmer_2s_infinite] [&]:before:content-['']
  relative overflow-hidden
`;

// Rocket animation keyframes
const rocketKeyframes = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes colorFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const rocketStyles = `
  ${rocketKeyframes}
  [&]:animate-[float_3s_ease-in-out_infinite]
  [&_.rocket]:animate-[float_3s_ease-in-out_infinite]
  [&]:bg-gradient-to-r [&]:from-yellow-500 [&]:via-orange-500 [&]:to-yellow-500
  [&]:bg-[length:200%_auto]
  [&]:animate-[colorFlow_3s_ease-in-out_infinite]
  relative overflow-hidden
`;

// Metallic text animation
const metallicKeyframes = `
  @keyframes shine {
    to {
      background-position: 200% center;
    }
  }
`;

const metallicTextStyles = `
  background: linear-gradient(
    to right,
    #A78B6D 20%,
    #F8E4BE 30%,
    #F8E4BE 40%,
    #A78B6D 50%,
    #A78B6D 60%,
    #F8E4BE 70%,
    #F8E4BE 80%,
    #A78B6D 90%
  );
  background-size: 200% auto;
  background-clip: text;
  text-fill-color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
`;

function StakeContent() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stakeAmount, setStakeAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { 
    walletState, 
    userData, 
    approveTokens,
    stakeTokens,
    claimRewards,
    unstakeTokens,
    emergencyWithdraw,
    getAllowance
  } = useWallet();

  // Set stake amount from URL parameter
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam))) {
      setStakeAmount(amountParam);
    }
  }, [searchParams]);

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  // Format token amounts from wei to ether
  const formatTokenAmount = (amount: string) => {
    try {
      if (!amount || amount === '0') return '0.00';
      if (amount.includes('.')) {
        const num = parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toFixed(2);
      }
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0.00';
    }
  };

  // Format BNB fee amounts
  const formatBNBAmount = (amount: string) => {
    try {
      if (!amount || amount === '0') return '0.00';
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      return isNaN(num) ? '0.00' : num.toFixed(6);
    } catch (error) {
      console.error('Error formatting BNB amount:', error);
      return '0.00';
    }
  };

  // Handle approve and stake process
  const handleApproveAndStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return;
    }

    try {
      const approveSuccess = await approveTokens(stakeAmount);
      if (approveSuccess) {
        await stakeTokens(stakeAmount);
        setStakeAmount('');
      }
    } catch (error) {
      console.error('Approve and stake error:', error);
    }
  };

  // Handle presale button click
  const handlePresaleClick = () => {
    const requiredAmount = stakeAmount || '0';
    window.location.href = `/presale?amount=${requiredAmount}`;
  };

  // Check if user has enough balance
  const hasEnoughBalance = () => {
    if (!stakeAmount || !userData.tokenBalance) return true;
    const stakeAmountNum = parseFloat(stakeAmount);
    const balanceNum = parseFloat(formatTokenAmount(userData.tokenBalance));
    return balanceNum >= stakeAmountNum;
  };

  // Calculate estimated rewards
  const calculateEstimatedRewards = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return { daily: 0, yearly: 0, dailyUSD: 0, yearlyUSD: 0 };
    }

    const stakeAmountNum = parseFloat(stakeAmount);
    const apr = 10;
    
    const yearlyReward = (stakeAmountNum * apr) / 100;
    const dailyReward = yearlyReward / 365;

    return {
      daily: dailyReward,
      yearly: yearlyReward,
      dailyUSD: dailyReward * 0.1,
      yearlyUSD: yearlyReward * 0.1
    };
  };

  const estimatedRewards = calculateEstimatedRewards();

  // Handle unstake
  const handleUnstake = async (stakeId: string) => {
    try {
      const stake = userData.stakes.find((s: any) => s.stakeId === stakeId);
      if (stake) {
        const stakeTimestamp = Number(stake.timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        const stakingPeriod = currentTime - stakeTimestamp;
        const minPeriod = Number(userData.minimumStakingPeriod);
        
        if (stakingPeriod < minPeriod) {
          const remainingTime = minPeriod - stakingPeriod;
          const remainingDays = Math.ceil(remainingTime / 86400);
          console.warn(`Cannot unstake yet. Need to wait ${remainingDays} more days`);
        }
      }
      
      const stakeIdNumber = parseInt(stakeId);
      const result = await unstakeTokens(stakeIdNumber.toString());
      console.log('Unstake result:', result);
    } catch (error: any) {
      console.error('Unstake error:', error);
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async (stakeId: string) => {
    try {
      const result = await emergencyWithdraw(stakeId);
      console.log('Emergency withdraw result:', result);
    } catch (error) {
      console.error('Emergency withdraw error:', error);
    }
  };

  // Calculate user's staking status
  const totalStaked = parseFloat(formatTokenAmount(userData.stakedAmount));
  const totalPending = parseFloat(formatTokenAmount(userData.pendingRewards));
  const availableBalance = parseFloat(formatTokenAmount(userData.tokenBalance));

  // Get card type based on stake amount
  const getCardTypeForAmount = (amount: number) => {
    if (amount >= CARD_REQUIREMENTS.BLACK) return 'BLACK';
    if (amount >= CARD_REQUIREMENTS.SILVER) return 'SILVER';
    if (amount >= CARD_REQUIREMENTS.BRONZE) return 'BRONZE';
    return null;
  };

  // Get minimum required amount for next card tier
  const getRequiredAmountForNextTier = (currentAmount: number) => {
    if (currentAmount < CARD_REQUIREMENTS.BRONZE) return CARD_REQUIREMENTS.BRONZE;
    if (currentAmount < CARD_REQUIREMENTS.SILVER) return CARD_REQUIREMENTS.SILVER;
    if (currentAmount < CARD_REQUIREMENTS.BLACK) return CARD_REQUIREMENTS.BLACK;
    return CARD_REQUIREMENTS.BLACK;
  };

  // Format insufficient balance message
  const getInsufficientBalanceMessage = () => {
    if (!stakeAmount) return '';
    
    const stakeAmountNum = parseFloat(stakeAmount);
    const balanceNum = parseFloat(formatTokenAmount(userData.tokenBalance));
    const difference = stakeAmountNum - balanceNum;
    
    if (difference <= 0) return '';

    const targetCard = getCardTypeForAmount(stakeAmountNum);
    if (targetCard) {
      return `Insufficient balance. You need ${difference.toFixed(2)} more BBLIP to activate your ${targetCard} card (min. ${CARD_REQUIREMENTS[targetCard]} BBLIP stake required).`;
    }
    
    return `Insufficient balance. You need ${difference.toFixed(2)} more BBLIP.`;
  };

  return (
    <>
      <style jsx global>{`
        ${rocketKeyframes}
        ${metallicKeyframes}
      `}</style>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-32 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              Stake BBLIP
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Earn <span className="text-yellow-200 font-semibold">10% APR</span> by staking your tokens
            </p>
          </div>

          {/* Main Staking Card */}
          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-3xl border border-yellow-400/10 p-6 md:p-8 mb-6 shadow-[0_0_50px_-12px] shadow-yellow-400/10">
            
            {/* Portfolio Overview Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-yellow-200" />
              </div>
              <h2 className="text-lg font-semibold text-white">Portfolio Overview</h2>
            </div>

            {/* User Status Summary */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
              <div className="bg-gradient-to-br from-black/80 to-black/60 p-3 md:p-6 rounded-xl md:rounded-2xl border border-yellow-400/10 shadow-lg">
                <p className="text-lg md:text-2xl font-bold text-white mb-1">{formatTokenAmount(userData.tokenBalance)}</p>
                <p className="text-xs md:text-sm text-gray-400">BBLIP Balance</p>
              </div>

              <div className="bg-gradient-to-br from-black/80 to-black/60 p-3 md:p-6 rounded-xl md:rounded-2xl border border-yellow-400/20 shadow-lg shadow-yellow-400/5">
                <p className="text-lg md:text-2xl font-bold text-yellow-200 mb-1">{formatTokenAmount(userData.stakedAmount)}</p>
                <p className="text-xs md:text-sm text-gray-400">Total Staked</p>
              </div>

              <div className="bg-gradient-to-br from-black/80 to-black/60 p-3 md:p-6 rounded-xl md:rounded-2xl border border-green-400/10 shadow-lg">
                <p className="text-lg md:text-2xl font-bold text-green-200 mb-1">{formatTokenAmount(userData.pendingRewards)}</p>
                <p className="text-xs md:text-sm text-gray-400">P.Rewards</p>
              </div>
            </div>

            {/* Stake Input Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Amount to Stake</label>
                <button
                  onClick={() => setStakeAmount(formatTokenAmount(userData.tokenBalance))}
                  className="text-xs text-yellow-200 hover:text-yellow-300 transition-colors"
                  disabled={walletState.loading}
                >
                  Use Max
                </button>
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  placeholder="1000"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="h-12 md:h-14 text-lg font-semibold bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 pr-16 rounded-xl"
                  disabled={walletState.loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  BBLIP
                </div>
              </div>

              {/* Professional Insufficient Balance Design */}
              {stakeAmount && !hasEnoughBalance() && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-400/20">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Info className="w-3 h-3 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-orange-200 mb-2">Insufficient Balance</h4>
                      <p className="text-xs text-orange-300/80 mb-3 leading-relaxed">
                        You need <span className="font-semibold text-orange-200">{(parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))).toFixed(2)} more BBLIP</span> to complete this stake.
                        {getCardTypeForAmount(parseFloat(stakeAmount)) && (
                          <span className="block mt-1">
                            This will activate your <span className="font-semibold text-yellow-200">{getCardTypeForAmount(parseFloat(stakeAmount))}</span> card tier.
                          </span>
                        )}
                      </p>
                      
                      <Link 
                        href={`/presale?amount=${parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-200 hover:text-orange-100 transition-all duration-200 text-sm font-medium"
                      >
                        <DollarSign className="w-4 h-4" />
                        Buy {(parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))).toFixed(2)} BBLIP
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Rewards Section - Compact for Mobile */}
            <div className="p-3 md:p-4 rounded-xl bg-black/60 border border-yellow-400/10 mb-6">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <TrendingUp className="w-4 h-4 text-yellow-200" />
                <h3 className="text-sm font-medium text-white">Estimated Rewards</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Daily</p>
                  <p className="text-base md:text-lg font-bold text-yellow-200">{estimatedRewards.daily.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">~${estimatedRewards.dailyUSD.toFixed(2)} USD</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Yearly</p>
                  <p className="text-base md:text-lg font-bold text-yellow-200">{estimatedRewards.yearly.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">~${estimatedRewards.yearlyUSD.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            {/* Stake Button */}
            <Button
              className={cn(
                "w-full bg-yellow-200 hover:bg-yellow-300 text-black font-medium shadow-lg h-12 md:h-14",
                "transition-all duration-300"
              )}
              size="lg"
              disabled={!hasEnoughBalance() || walletState.loading}
              onClick={handleApproveAndStake}
            >
              {walletState.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Approve & Stake
                </div>
              )}
            </Button>
          </div>

          {/* Rewards Available - Compact Design */}
          {userData.pendingRewards && parseFloat(formatTokenAmount(userData.pendingRewards)) > 0 && (
            <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-xl border border-green-400/20 p-4 mb-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Rewards Available</h4>
                    <p className="text-xs text-gray-400">{formatTokenAmount(userData.pendingRewards)} BBLIP</p>
                  </div>
                </div>
                
                <Button
                  onClick={claimRewards}
                  disabled={walletState.loading}
                  className={cn(
                    "bg-green-400 hover:bg-green-500 text-black font-medium px-4",
                    "transition-all duration-300"
                  )}
                  size="sm"
                >
                  {walletState.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Claim
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Staking Details Accordion */}
          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl rounded-xl border border-yellow-400/10 overflow-hidden mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-yellow-200" />
                <div>
                  <h3 className="text-sm font-medium text-white">Staking Details</h3>
                  <p className="text-xs text-gray-400">Terms and conditions</p>
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
                      <h4 className="text-sm font-medium text-white">Annual Percentage Rate</h4>
                      <p className="text-xs text-gray-400">Earn 10% APR on your staked tokens</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Minimum Stake</h4>
                      <p className="text-xs text-gray-400">1,000 BBLIP minimum required for Bronze card activation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Staking Period</h4>
                      <p className="text-xs text-gray-400">No lock-up period, unstake anytime</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-yellow-200" />
                    <div>
                      <h4 className="text-sm font-medium text-white">Staking Fee</h4>
                      <p className="text-xs text-gray-400">No fees for staking or unstaking</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Stakes List */}
          {userData.stakes && userData.stakes.length > 0 && (
            <>
              {/* Active Stakes Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Active Stakes</h3>
                <p className="text-sm text-gray-400">Manage your staking positions</p>
              </div>

              {/* Stakes List */}
              <div className="space-y-4 mb-6">
                {userData.stakes.map((stake: any, index: number) => {
                  const stakeAmount = formatTokenAmount(stake.amount);
                  const stakeDate = new Date(Number(stake.timestamp) * 1000);
                  const currentTime = Math.floor(Date.now() / 1000);
                  const stakingPeriod = currentTime - Number(stake.timestamp);
                  const minPeriod = Number(userData.minimumStakingPeriod);
                  const canUnstake = stakingPeriod >= minPeriod;
                  const remainingTime = minPeriod - stakingPeriod;
                  const remainingDays = Math.ceil(remainingTime / 86400);

                  return (
                    <div key={index} className="bg-gradient-to-br from-black/80 to-black/60 p-6 rounded-2xl border border-yellow-400/10 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                            <span className="text-yellow-200 font-bold text-sm">#{stake.stakeId}</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{stakeAmount} BBLIP</p>
                            <p className="text-sm text-gray-400">
                              Staked on {stakeDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              canUnstake ? "bg-green-400" : "bg-orange-400"
                            )}></div>
                            <span className={cn(
                              "text-sm font-medium",
                              canUnstake ? "text-green-300" : "text-orange-300"
                            )}>
                              {canUnstake ? 'Ready' : 'Locked'}
                            </span>
                          </div>
                          {!canUnstake && (
                            <p className="text-xs text-gray-400">
                              {remainingDays} days remaining
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-yellow-400/10">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {canUnstake 
                              ? `Staked for ${Math.floor(stakingPeriod / 86400)} days`
                              : `${remainingDays} days until unlock`
                            }
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => handleUnstake(stake.stakeId)}
                          disabled={walletState.loading}
                          className={cn(
                            "bg-yellow-200 hover:bg-yellow-300 text-black font-medium px-6",
                            "transition-all duration-300",
                            !canUnstake && "opacity-50 cursor-not-allowed"
                          )}
                          size="sm"
                        >
                          {walletState.loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ArrowLeft className="w-4 h-4" />
                              Unstake
                            </div>
                          )}
                        </Button>
                      </div>

                      {!canUnstake && (
                        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-orange-300" />
                            <p className="text-sm text-orange-300">
                              This stake is still in the minimum lock period. You can unstake in {remainingDays} days.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
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

export default function StakePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <StakeContent />
    </Suspense>
  );
} 