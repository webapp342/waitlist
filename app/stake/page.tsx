'use client';

import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Zap, TrendingUp, Shield, Clock, DollarSign, History, ExternalLink, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { userService, cardService, stakeLogsService } from '@/lib/supabase';
import { useChainId } from 'wagmi';
import { StakeLog } from '@/lib/supabase';
import Image from 'next/image';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransactionStatus, type TransactionStatus as TxStatus } from "@/components/ui/transaction-status";
import { TransactionModal } from "@/components/ui/transaction-modal";

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

interface ErrorModalType {
  isOpen: boolean;
  title: string;
  message: string;
  showPurchaseButton?: boolean;
  purchaseAmount?: number;
}

interface StakeTransaction {
  status: TxStatus;
  message: string;
  type: 'stake' | 'unstake' | 'claim' | 'approve';
  stakedAmount?: string;
}

function StakeContent() {
  const { isConnected, address, chain } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stakeAmount, setStakeAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [stakeLogs, setStakeLogs] = useState<StakeLog[]>([]);
  const [showStakeLogs, setShowStakeLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<ErrorModalType>({
    isOpen: false,
    title: '',
    message: '',
    showPurchaseButton: false,
    purchaseAmount: 0
  });
  const [userInteracted, setUserInteracted] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<StakeTransaction | null>(null);
  
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

  // Check if user is on the correct network (BSC Testnet - Chain ID 97)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCTestnet = actualChainId === 97;

  // Initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Save user to database when wallet is connected to correct network
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address && isOnBSCTestnet) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully from stake page');
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, isOnBSCTestnet]);

  // Load stake logs when wallet is connected
  useEffect(() => {
    const loadStakeLogs = async () => {
      if (isConnected && address) {
        try {
          const logs = await stakeLogsService.getUserStakeLogs(address);
          setStakeLogs(logs);
          console.log('Stake logs loaded:', logs);
        } catch (error) {
          console.error('Error loading stake logs:', error);
        }
      }
    };

    loadStakeLogs();
  }, [isConnected, address, userData.stakes]); // Reload when stakes change

  // Remove wallet connection redirect - allow access without wallet

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

  // Helper function to format error messages
  const formatErrorMessage = (error: any) => {
    if (!error) return { title: 'Error', message: 'An unknown error occurred' };

    // Ignore provider initialization errors
    if (error.message?.includes('invalid EIP-1193 provider') || 
        error.message?.includes('window.ethereum is undefined')) {
      return null;
    }

    // Check for insufficient balance
    if (!hasEnoughBalance() && stakeAmount) {
      return {
        title: 'Insufficient BBLIP Balance',
        message: `You need ${parseFloat(stakeAmount).toFixed(2)} BBLIP for staking.\nYour current balance: ${formatTokenAmount(userData.tokenBalance)} BBLIP`,
        showPurchaseButton: true,
        purchaseAmount: parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))
      };
    }

    // Check for common error types
    if (error.code === 'CALL_EXCEPTION') {
      return {
        title: 'Transaction Failed',
        message: 'The transaction could not be completed. This might be due to:\n\n' +
                '• Insufficient gas fees\n' +
                '• Smart contract restrictions\n' +
                '• Network congestion\n\n' +
                'Please try again or contact support if the issue persists.'
      };
    }

    if (error.code === 'ACTION_REJECTED') {
      return {
        title: 'Transaction Rejected',
        message: 'You have rejected the transaction in your wallet.'
      };
    }

    // Check for specific error messages
    if (error.message?.includes('insufficient funds')) {
      return {
        title: 'Insufficient BNB Balance',
        message: 'You do not have enough BNB to cover the transaction fees. Please add more BNB to your wallet and try again.'
      };
    }

    if (error.message?.includes('user rejected')) {
      return {
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction in your wallet.'
      };
    }

    // Default error message
    return {
      title: 'Transaction Error',
      message: error.message || 'Something went wrong with your transaction. Please try again.'
    };
  };

  // Add function to handle transaction modal close
  const handleTransactionModalClose = () => {
    if (currentTransaction?.status === 'completed' || currentTransaction?.status === 'failed') {
      setCurrentTransaction(null);
    }
  };

  // Update handleUnstake
  const handleUnstake = async (stakeId: string) => {
    try {
      setUserInteracted(true);
      const stake = userData.stakes.find((s: any) => s.stakeId === stakeId);
      if (stake) {
        const stakeTimestamp = Number(stake.timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        const stakingPeriod = currentTime - stakeTimestamp;
        const minPeriod = Number(userData.minimumStakingPeriod);
        
        if (stakingPeriod < minPeriod) {
          const remainingTime = minPeriod - stakingPeriod;
          const remainingDays = Math.ceil(remainingTime / 86400);
          setErrorModal({
            isOpen: true,
            title: 'Cannot Unstake Yet',
            message: `You need to wait ${remainingDays} more days before unstaking. This helps maintain the stability of the staking pool.`
          });
          return;
        }
      }

      setCurrentTransaction({
        status: 'pending',
        message: 'Initiating unstake transaction...',
        type: 'unstake'
      });
      
      const success = await unstakeTokens(stakeId);
      
      if (!success) {
        throw new Error('Unstake transaction failed');
      }
      
      setCurrentTransaction({
        status: 'completed',
        message: 'Unstake successful!',
        type: 'unstake'
      });
      
    } catch (error: any) {
      console.error('Unstaking error:', error);
      setCurrentTransaction({
        status: 'failed',
        message: 'Unstake failed. Please try again.',
        type: 'unstake'
      });
      
      const formattedError = formatErrorMessage(error);
      if (formattedError) {
        setErrorModal({
          isOpen: true,
          ...formattedError
        });
      }
    }
  };

  // Update handleApproveAndStake
  const handleApproveAndStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setErrorModal({
        isOpen: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid staking amount'
      });
      return;
    }

    try {
      setUserInteracted(true);

      // Check balance before trying to stake
      if (!hasEnoughBalance()) {
        const error = {
          message: 'insufficient_balance',
          stakeAmount,
          currentBalance: userData.tokenBalance
        };
        throw error;
      }

      // Check allowance first
      setCurrentTransaction({
        status: 'pending',
        message: 'Checking allowance...',
        type: 'approve'
      });
      
      const allowance = await getAllowance();
      const amountInWei = ethers.parseEther(stakeAmount);
      const allowanceInWei = ethers.parseEther(allowance);
      
      // Approve if needed
      if (allowanceInWei < amountInWei) {
        setCurrentTransaction({
          status: 'pending',
          message: 'Approving tokens...',
          type: 'approve'
        });
        
        const approveSuccess = await approveTokens(stakeAmount);
        
        if (!approveSuccess) {
          throw new Error('Token approval failed');
        }
        
        setCurrentTransaction({
          status: 'completed',
          message: 'Token approval successful',
          type: 'approve'
        });

        // Short delay before starting stake transaction
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Stake tokens
      setCurrentTransaction({
        status: 'pending',
        message: 'Initiating staking transaction...',
        type: 'stake'
      });
      
      const stakeSuccess = await stakeTokens(stakeAmount);
      
      if (!stakeSuccess) {
        throw new Error('Staking transaction failed');
      }

      // Calculate new total staked amount
      const newTotalStaked = (parseFloat(userData.stakedAmount) + parseFloat(stakeAmount)).toString();
      
      setCurrentTransaction({
        status: 'completed',
        message: 'Staking successful!',
        type: 'stake',
        stakedAmount: newTotalStaked
      });
      
      // Clear input
      setStakeAmount('');
      
    } catch (error: any) {
      console.error('Staking error:', error);
      setCurrentTransaction({
        status: 'failed',
        message: 'Transaction failed. Please try again.',
        type: currentTransaction?.type || 'stake'
      });
      
      const formattedError = formatErrorMessage(error);
      if (formattedError) {
        setErrorModal({
          isOpen: true,
          ...formattedError
        });
      }
    }
  };

  // Update handleClaimRewards
  const handleClaimRewards = async () => {
    try {
      setCurrentTransaction({
        status: 'pending',
        message: 'Initiating claim transaction...',
        type: 'claim'
      });
      
      const success = await claimRewards();
      
      if (!success) {
        throw new Error('Claim transaction failed');
      }
      
      setCurrentTransaction({
        status: 'completed',
        message: 'Rewards claimed successfully!',
        type: 'claim'
      });
      
    } catch (error: any) {
      console.error('Claim error:', error);
      setCurrentTransaction({
        status: 'failed',
        message: 'Claim failed. Please try again.',
        type: 'claim'
      });
      
      const formattedError = formatErrorMessage(error);
      if (formattedError) {
        setErrorModal({
          isOpen: true,
          ...formattedError
        });
      }
    }
  };

  // Update error effect to only show errors after user interaction
  useEffect(() => {
    const handleError = async () => {
      if (userInteracted && walletState.error) {
        const formattedError = formatErrorMessage({ message: walletState.error });
        if (formattedError) {
          setErrorModal({
            isOpen: true,
            ...formattedError
          });
        }
      }
    };

    handleError();
  }, [walletState.error, userInteracted, formatErrorMessage]);

  // Reset userInteracted when component unmounts
  useEffect(() => {
    return () => {
      setUserInteracted(false);
    };
  }, []);

  // Handle presale button click
  const handlePresaleClick = () => {
    const requiredAmount = stakeAmount || '0';
    router.push(`/presale?amount=${requiredAmount}`);
  };

  // Check if user has enough balance
  const hasEnoughBalance = () => {
    if (!isConnected || !stakeAmount || !userData.tokenBalance) return true;
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
                alt="BBLIP" 
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
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 md:p-8 mb-6 shadow-xl">
            
            {/* Portfolio Overview Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Portfolio Overview</h2>
                <p className="text-xs text-gray-500">Your staking positions and rewards</p>
              </div>
            </div>

            {/* User Status Summary */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-white mb-1">{formatTokenAmount(userData.tokenBalance)}</p>
                <p className="text-xs md:text-sm text-gray-400">BBLIP Balance</p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-yellow-500/30 shadow-xl shadow-yellow-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <p className="text-xs text-gray-500">Staked</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-yellow-400 mb-1">{formatTokenAmount(userData.stakedAmount)}</p>
                <p className="text-xs md:text-sm text-gray-400">Total Staked</p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-green-500/30 shadow-xl shadow-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-green-400 mb-1">{formatTokenAmount(userData.pendingRewards)}</p>
                <p className="text-xs md:text-sm text-gray-400">Rewards</p>
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
                  inputMode="numeric"
                  pattern="[0-9]*"
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

              {/* Professional Insufficient Balance Design - Only show when wallet is connected */}
           
            </div>

            {/* Stake Button - Conditional Based on Wallet Connection */}
            {!isConnected ? (
              <Button
                className={cn(
                  "w-full h-12 md:h-14 font-semibold text-black mt-6",
                  "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400",
                  "hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300",
                  "shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40",
                  "transition-all duration-300 transform hover:scale-[1.02]"
                )}
                size="lg"
                onClick={() => setShowWalletModal(true)}
              >
                <div className="flex items-center justify-center w-full gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm md:text-base">Connect Wallet to Stake</span>
                </div>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleApproveAndStake}
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || walletState.loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                >
                  {walletState.loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Stake Now
                </Button>

                {stakeAmount && !hasEnoughBalance() && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full mt-3 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Link href={`/presale?amount=${parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))}`}>
                      Purchase {(parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))).toFixed(2)} BBLIP
                    </Link>
                  </Button>
                )}
              </>
            )}

            {/* Estimated Rewards Section - Show always for information */}
            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-400/10 border border-green-400/20">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Estimated Rewards</h3>
                    <p className="text-xs text-gray-500">10% APR calculated returns</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <p className="text-xs text-gray-400 font-medium">Daily</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-blue-400 mb-1">{estimatedRewards.daily.toFixed(4)}</p>
                    <p className="text-xs text-gray-500">~${estimatedRewards.dailyUSD.toFixed(2)} USD</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                      <p className="text-xs text-gray-400 font-medium">Yearly</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-green-400 mb-1">{estimatedRewards.yearly.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">~${estimatedRewards.yearlyUSD.toFixed(2)} USD</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rewards Available - Only show when wallet is connected */}
          {isConnected && userData.pendingRewards && parseFloat(formatTokenAmount(userData.pendingRewards)) > 0 && (
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-green-500/30 p-4 md:p-6 mb-6 shadow-xl shadow-green-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <h4 className="text-sm font-semibold text-white">Rewards Available</h4>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-green-400">{formatTokenAmount(userData.pendingRewards)}</p>
                      <p className="text-xs text-gray-500">BBLIP</p>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleClaimRewards}
                  disabled={walletState.loading}
                  className={cn(
                    "font-semibold text-black px-4 md:px-6",
                    "bg-gradient-to-r from-green-400 via-green-300 to-green-400",
                    "hover:from-green-300 hover:via-green-200 hover:to-green-300",
                    "shadow-lg shadow-green-400/25 hover:shadow-green-400/40",
                    "transition-all duration-300 transform hover:scale-105"
                  )}
                  size="sm"
                >
                  {walletState.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Claim</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Staking Details Accordion */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden mb-6 shadow-xl">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                  <Info className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Staking Details</h3>
                  <p className="text-xs text-gray-500">Terms and conditions • APR info</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden md:inline">
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
              <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-zinc-700">
                <div className="space-y-4 pt-4 md:pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-green-400/10 border border-green-400/20 mt-0.5">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Annual Percentage Rate</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Earn 10% APR on your staked tokens</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 mt-0.5">
                        <Shield className="w-3 h-3 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Minimum Stake</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">No minimum stake, stake how much you want</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-purple-400/10 border border-purple-400/20 mt-0.5">
                        <Clock className="w-3 h-3 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Staking Period</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">No lock-up period, unstake anytime</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-orange-400/10 border border-orange-400/20 mt-0.5">
                        <DollarSign className="w-3 h-3 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Staking Fee</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">No hidden fees</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Stakes List - Only show when wallet is connected */}
          {isConnected && userData.stakes && userData.stakes.length > 0 && (
            <div className=" py-5 rounded-3xl  p-0  shadow-xl">
              {/* Active Stakes Header */}
              <div className="flex items-center gap-3 mb-6">
            
                <div>
                  <h3 className="text-lg font-semibold text-white">Active Stakes</h3>
                  <p className="text-xs text-gray-500">Manage your staking positions</p>
                </div>
              </div>

              {/* Stakes List */}
              <div className="space-y-2">
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
                    <div key={index} className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 md:p-6 rounded-2xl border border-zinc-800 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-white font-bold text-xs md:text-sm">#{stake.stakeId}</span>
                          </div>
                          <div>
                            <p className="text-lg md:text-xl font-bold text-white">{stakeAmount} BBLIP</p>
                            <p className="text-xs md:text-sm text-gray-400">
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
                              canUnstake ? "bg-green-400 animate-pulse" : "bg-orange-400"
                            )}></div>
                            <span className={cn(
                              "text-sm font-semibold",
                              canUnstake ? "text-green-400" : "text-orange-400"
                            )}>
                              {canUnstake ? 'Ready' : 'Locked'}
                            </span>
                          </div>
                          {!canUnstake && (
                            <p className="text-xs text-gray-500">
                              {remainingDays} days remaining
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
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
                          disabled={walletState.loading || !canUnstake}
                          className={cn(
                            "font-semibold text-black px-4 md:px-6",
                            "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400",
                            "hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300", 
                            "shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40",
                            "transition-all duration-300 transform hover:scale-105",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          )}
                          size="sm"
                        >
                          {walletState.loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                              <span className="text-sm">Processing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ArrowLeft className="w-4 h-4" />
                              <span className="text-sm">Unstake</span>
                            </div>
                          )}
                        </Button>
                      </div>

                      {!canUnstake && (
                        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-start gap-3">
                            <div className="p-1 rounded bg-orange-400/20 mt-0.5">
                              <Info className="w-3 h-3 text-orange-400" />
                            </div>
                            <p className="text-sm text-orange-300 leading-relaxed">
                              This stake is still in the minimum lock period. You can unstake in {remainingDays} days.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stake Logs - Only show when wallet is connected */}
          {isConnected && stakeLogs.length > 0 && (
            <div className=" py-10 rounded-3xl  p-0  shadow-xl">
              {/* Stake Logs Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white">Transaction History</h3>
                    <p className="text-xs text-gray-500">Your staking activity logs</p>
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
                  {stakeLogs.map((log, index) => {
                    const logDate = new Date(log.created_at || '');
                    const isConfirmed = log.status === 'confirmed';
                    const isPending = log.status === 'pending';
                    const isFailed = log.status === 'failed';

                    const getActionIcon = (actionType: string) => {
                      switch (actionType) {
                        case 'stake': return <Zap className="w-4 h-4 text-green-400" />;
                        case 'unstake': return <ArrowLeft className="w-4 h-4 text-yellow-400" />;
                        case 'claim_rewards': return <TrendingUp className="w-4 h-4 text-blue-400" />;
                        case 'emergency_withdraw': return <Shield className="w-4 h-4 text-red-400" />;
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
                            <span>View on BSCScan</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {log.gas_used && log.gas_price && (
                          <div className="mt-3 pt-3 border-t border-zinc-700">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>Gas Used: {log.gas_used.toLocaleString()}</span>
                              <span>Gas Price: {ethers.formatUnits(log.gas_price, 'gwei')} Gwei</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

      {/* Error Modal with Purchase Button */}
      {errorModal.title && errorModal.message && (
        <Dialog open={errorModal.isOpen} onOpenChange={(isOpen: boolean) => setErrorModal(prev => ({ ...prev, isOpen }))}>
          <DialogContent className="bg-zinc-900 border border-red-500/20 p-6">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{errorModal.title}</h3>
                <p className="text-sm text-gray-400">Transaction Error Details</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-gray-300 whitespace-pre-line">
                {errorModal.message}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {errorModal.showPurchaseButton && errorModal.purchaseAmount && (
                <Button
                  asChild
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 hover:text-red-100 transition-all duration-200"
                >
                  <Link href={`/presale?amount=${errorModal.purchaseAmount.toFixed(2)}`}>
                    Purchase {errorModal.purchaseAmount.toFixed(2)} BBLIP
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Transaction Modal */}
      {currentTransaction && (
        <TransactionModal
          isOpen={true}
          onClose={handleTransactionModalClose}
          status={currentTransaction.status}
          message={currentTransaction.message}
          type={currentTransaction.type}
          stakedAmount={currentTransaction.stakedAmount}
        />
      )}
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