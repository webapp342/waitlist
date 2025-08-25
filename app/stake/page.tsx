'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Zap, TrendingUp, Shield, Clock, DollarSign, History, ExternalLink, XCircle, AlertCircle, Loader2, Network } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { userService, cardService, stakeLogsService } from '@/lib/supabase';
import { useChainId } from 'wagmi';
import { StakeLog } from '@/lib/supabase';
import Image from 'next/image';
import {   TransactionStatus, type TransactionStatus as TxStatus } from "@/components/ui/transaction-status";
import { TransactionModal } from "@/components/ui/transaction-modal";



// Card stake requirements
const CARD_REQUIREMENTS = {
  BRONZE: 1000,
  SILVER: 2000,
  BLACK: 3500
};

// Chain IDs
const BSC_MAINNET_CHAIN_ID = 56;
const ETH_MAINNET_CHAIN_ID = 1;

// Staking Networks Configuration
const STAKING_NETWORKS = [
  { 
    id: 'bsc', 
    name: 'BSC Mainnet', 
    icon: '/bnb.svg', 
    color: 'from-black to-black', 
    chainId: BSC_MAINNET_CHAIN_ID,
    tokenSymbol: 'BBLP',
    nativeToken: 'BNB'
  },
  { 
    id: 'eth', 
    name: 'ETH Mainnet', 
    icon: '/eth.png', 
    color: 'from-white to-white', 
    chainId: ETH_MAINNET_CHAIN_ID,
    tokenSymbol: 'WBBLP',
    nativeToken: 'ETH'
  }
];

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
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('eth'); // Default to Ethereum
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
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [switchChainError, setSwitchChainError] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<{ [key: string]: { days: number; hours: number; minutes: number; seconds: number } }>({});
  
  // Get selected network details
  const selectedNetworkDetails = STAKING_NETWORKS.find(network => network.id === selectedNetwork);
  const requiredChainId = selectedNetworkDetails?.chainId || BSC_MAINNET_CHAIN_ID;
  

  

  
  const { 
    walletState, 
    userData, 
    approveTokens,
    stakeTokens,
    claimRewards,
    unstakeTokens,
    emergencyWithdraw,
    getAllowance
  } = useWallet(requiredChainId);



  // Countdown timer for unstake lock period (30 days)
  useEffect(() => {
    const updateCountdowns = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const newCountdowns: { [key: string]: { days: number; hours: number; minutes: number; seconds: number } } = {};
      
      userData.stakes.forEach((stake: any) => {
        const stakeTimestamp = Number(stake.timestamp);
        const lockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
        const endTime = stakeTimestamp + lockPeriod;
        const remainingTime = endTime - currentTime;
        
        if (remainingTime > 0) {
          const days = Math.floor(remainingTime / (24 * 60 * 60));
          const hours = Math.floor((remainingTime % (24 * 60 * 60)) / (60 * 60));
          const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
          const seconds = remainingTime % 60;
          
          newCountdowns[stake.stakeId] = { days, hours, minutes, seconds };
        }
      });
      
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    
    return () => clearInterval(interval);
  }, [userData.stakes]);

  // Check if unstake is allowed (30 days passed)
  const canUnstake = (stakeTimestamp: number) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const lockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
    return (currentTime - stakeTimestamp) >= lockPeriod;
  };

  // Set stake amount from URL parameter
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam))) {
      setStakeAmount(amountParam);
    }
  }, [searchParams]);

  // Reset stake amount when network changes
  useEffect(() => {
    setStakeAmount('');
  }, [selectedNetwork, requiredChainId]);

  // Check if user is on the correct network
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnCorrectNetwork = actualChainId === requiredChainId;
  const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;
  const isOnEthMainnet = actualChainId === ETH_MAINNET_CHAIN_ID;

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return;
    
    try {
      setIsSwitchingChain(true);
      setSwitchChainError(null);
      const targetNetworkName = selectedNetworkDetails?.name || 'BSC Mainnet';
      await switchChain({ chainId: requiredChainId as any });
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      if (err.code === 4001) {
        setSwitchChainError('Chain switch was cancelled by user');
      } else {
        const targetNetworkName = selectedNetworkDetails?.name || 'BSC Mainnet';
        setSwitchChainError(`Failed to switch to ${targetNetworkName}. Please switch manually in your wallet.`);
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
      if (isConnected && address && isOnCorrectNetwork) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully from stake page');
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, isOnCorrectNetwork]);

  // Load stake logs when wallet is connected
  useEffect(() => {
    const loadStakeLogs = async () => {
      if (isConnected && address && isOnCorrectNetwork) {
        try {
          const logs = await stakeLogsService.getUserStakeLogs(address);
          setStakeLogs(logs);
          console.log('\ud83d\udcca Database stake logs loaded:', logs);
          console.log('\ud83d\udcca Database logs count:', logs.length);
          console.log('\ud83d\udcca Current userData.stakedAmount:', userData.stakedAmount);
          console.log('\ud83d\udcca Current userData.stakes count:', userData.stakes.length);
          // Check transaction status for each log
          logs.forEach((log, index) => {
            console.log(`\ud83d\udcca Log ${index + 1}:`, {
              transaction_hash: log.transaction_hash,
              amount: log.amount,
              action_type: log.action_type,
              status: log.status,
              block_number: log.block_number
            });
          });
        } catch (error) {
          console.error('Error loading stake logs:', error);
        }
      }
    };
    loadStakeLogs();
  }, [isConnected, address, userData.stakes, isOnCorrectNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  // Format token amounts from wei to ether without rounding
  const formatTokenAmount = useCallback((amount: string, decimals: number = 8) => {
    try {
      if (!amount || amount === '0') return '0.00';
      if (amount.includes('.')) {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0.00';
        
        // Convert to string and limit decimal places without rounding
        const numStr = num.toString();
        if (numStr.includes('.')) {
          const parts = numStr.split('.');
          const integerPart = parts[0];
          const decimalPart = parts[1].substring(0, decimals);
          return `${integerPart}.${decimalPart.padEnd(decimals, '0')}`;
        } else {
          return `${numStr}.${'0'.repeat(decimals)}`;
        }
      }
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      if (isNaN(num)) return '0.00';
      
      // Convert to string and limit decimal places without rounding
      const numStr = num.toString();
      if (numStr.includes('.')) {
        const parts = numStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1].substring(0, decimals);
        return `${integerPart}.${decimalPart.padEnd(decimals, '0')}`;
      } else {
        return `${numStr}.${'0'.repeat(decimals)}`;
      }
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0.00';
    }
  }, []);

  // Format fee amounts (BNB or ETH)
  const formatFeeAmount = (amount: string) => {
    try {
      if (!amount || amount === '0') return '0.00';
      const formatted = ethers.formatEther(amount);
      const num = parseFloat(formatted);
      return isNaN(num) ? '0.00' : num.toFixed(6);
    } catch (error) {
      console.error('Error formatting fee amount:', error);
      return '0.00';
    }
  };

  // Get fee token symbol based on network
  const getFeeTokenSymbol = () => {
    return selectedNetworkDetails?.nativeToken || 'BNB';
  };

  // Check if user has enough balance for staking
  const hasEnoughBalance = useCallback(() => {
    if (!stakeAmount || !userData.tokenBalance) return false;
    const amount = parseFloat(stakeAmount);
    const balance = parseFloat(formatTokenAmount(userData.tokenBalance));
    return !isNaN(amount) && !isNaN(balance) && balance >= amount;
  }, [stakeAmount, userData.tokenBalance, formatTokenAmount, selectedNetworkDetails?.nativeToken]);

  // Helper function to format error messages
  const formatErrorMessage = useCallback((error: any) => {
    if (!error) return { title: 'Error', message: 'An unknown error occurred' };

    // Ignore provider initialization errors
    if (error.message?.includes('invalid EIP-1193 provider') || 
        error.message?.includes('window.ethereum is undefined')) {
      return null;
    }

    // Check for insufficient balance
    if (!hasEnoughBalance() && stakeAmount) {
      const tokenSymbol = selectedNetworkDetails?.tokenSymbol || 'BBLP';
      return {
        title: `Insufficient ${tokenSymbol} Balance`,
        message: `You need ${parseFloat(stakeAmount).toFixed(2)} ${tokenSymbol} for staking.\nYour current balance: ${formatTokenAmount(userData.tokenBalance)} ${tokenSymbol}`,
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
      const nativeToken = selectedNetworkDetails?.nativeToken || 'BNB';
      return {
        title: `Insufficient ${nativeToken} Balance`,
        message: `You do not have enough ${nativeToken} to cover the transaction fees. Please add more ${nativeToken} to your wallet and try again.`
      };
    }

    if (error.message?.includes('user rejected')) {
      return {
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction in your wallet.'
      };
    }

    // Default error message
    const nativeToken = selectedNetworkDetails?.nativeToken || 'BNB';
    return {
      title: `Insufficient ${nativeToken} Balance`,
      message: `You do not have enough ${nativeToken} to cover the transaction fees. Please add more ${nativeToken} to your wallet and try again.`
    };
  }, [hasEnoughBalance, stakeAmount, userData.tokenBalance, formatTokenAmount, selectedNetworkDetails?.tokenSymbol]);

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
        const lockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
        const stakingPeriod = currentTime - stakeTimestamp;
        
        if (stakingPeriod < lockPeriod) {
          const remainingTime = lockPeriod - stakingPeriod;
          const remainingDays = Math.ceil(remainingTime / 86400);
          const remainingHours = Math.ceil((remainingTime % 86400) / 3600);
          setErrorModal({
            isOpen: true,
            title: 'Cannot Unstake Yet',
            message: `You need to wait ${remainingDays} days and ${remainingHours} hours before unstaking. This 30-day lock period helps maintain the stability of the staking pool.`
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
        message: 'Insufficient BNB for gas fee. Required: 0.012 BNB',
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

  // Calculate estimated rewards
  const calculateEstimatedRewards = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return { daily: 0, yearly: 0, dailyUSD: 0, yearlyUSD: 0 };
    }

    const stakeAmountNum = parseFloat(stakeAmount);
    const apr = 32;
    
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
      return `Insufficient balance. You need ${difference.toFixed(2)} more BBLP to activate your ${targetCard} card (min. ${CARD_REQUIREMENTS[targetCard]} BBLP stake required).`;
    }
      
    return `Insufficient balance. You need ${difference.toFixed(2)} more BBLP.`;
  };

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
    <>
      <style jsx global>{`
        ${rocketKeyframes}
        ${metallicKeyframes}
      `}</style>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-20 md:pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              Stake {selectedNetworkDetails?.tokenSymbol || 'BBLP'}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Earn <span className="text-yellow-200 font-semibold">32% APR</span> by staking your tokens on {selectedNetworkDetails?.name || 'BSC Mainnet'}
            </p>
          </div>

          {/* Network Warning - Show when connected but not on correct network */}
          {isConnected && !isOnCorrectNetwork && (
            <div className="w-full max-w-5xl mt-1 mb-10 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Network className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-orange-200">Wrong Network</h3>
                  <p className="text-xs text-orange-300/80">
                    You&apos;re connected to {chain?.name || 'Unknown Network'}. Please switch to {selectedNetworkDetails?.name || 'BSC Mainnet'} to stake your tokens.
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
                    Switch to {selectedNetworkDetails?.name || 'BSC Mainnet'}
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Switch Chain Error Message */}
          {switchChainError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-300">{switchChainError}</p>
              </div>
            </div>
          )}

          {/* Network Selection - Always Active */}
          <div className="mb-6">
            
            <div className="grid grid-cols-2 gap-3">
              {STAKING_NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => setSelectedNetwork(network.id)}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300 text-left relative overflow-hidden group",
                    selectedNetwork === network.id
                      ? "bg-gradient-to-br from-zinc-800 to-zinc-900 border-yellow-400/50 shadow-lg shadow-yellow-400/20 scale-[1.02]"
                      : "bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50 hover:border-zinc-600 hover:scale-[1.01]"
                  )}
                >
                  {/* Selection indicator overlay */}
                  {selectedNetwork === network.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-yellow-400/10 rounded-xl"></div>
                  )}
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center transition-all duration-300",
                      network.color,
                      selectedNetwork === network.id && "scale-110 shadow-lg shadow-yellow-400/20"
                    )}>
                      <Image 
                        src={network.icon} 
                        alt={network.name} 
                        width={network.id === 'bsc' ? 32 : 24} 
                        height={network.id === 'bsc' ? 32 : 24}
                        className={cn(
                          network.id === 'eth' ? "rounded-full" : ""
                        )}
                      />
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        selectedNetwork === network.id ? "text-yellow-200" : "text-white"
                      )}>
                        {network.name}
                      </p>
                      <p className="text-xs text-gray-400">{network.tokenSymbol} Staking</p>
                    </div>
                  </div>
                  

                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Staking Card */}
          <div className={cn(
            "bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-4 py-6 md:p-8 mb-6 shadow-xl transition-all duration-300",
            !isOnCorrectNetwork && isConnected && "opacity-50 pointer-events-none"
          )}>
            
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
                <p className="text-lg md:text-2xl font-bold text-white mb-1">{formatTokenAmount(userData.tokenBalance, 2)}</p>
                <p className="text-xs md:text-sm text-gray-400">{selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-yellow-500/30 shadow-xl shadow-yellow-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <p className="text-xs text-gray-500">Staked</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-yellow-400 mb-1">{formatTokenAmount(userData.stakedAmount, 2)}</p>
                <p className="text-xs md:text-sm text-gray-400">{selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-green-500/30 shadow-xl shadow-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <p className="text-lg md:text-2xl font-bold text-green-400 mb-1">{
                  Number(formatTokenAmount(userData.pendingRewards, 8)) >= 0.000001
                    ? formatTokenAmount(userData.pendingRewards, 8)
                    : '0'
                }</p>
                <p className="text-xs md:text-sm text-gray-400">{selectedNetworkDetails?.tokenSymbol || 'BBLP'} Rewards</p>
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
                  disabled={walletState.loading || !isOnCorrectNetwork}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {selectedNetworkDetails?.tokenSymbol || 'BBLP'}
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
                  <span className="text-sm md:text-base">Connect Wallet</span>
                </div>
              </Button>
            ) : !isOnCorrectNetwork ? (
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                className={cn(
                  "w-full h-12 md:h-14 font-semibold text-white mt-6",
                  "bg-gradient-to-r from-orange-500 to-red-500",
                  "hover:from-orange-600 hover:to-red-600",
                  "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
                  "transition-all duration-300 transform hover:scale-[1.02]"
                )}
                size="lg"
              >
                {isSwitchingChain ? (
                  <div className="flex items-center justify-center w-full gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm md:text-base">Switching Network...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full gap-2">
                    <Network className="w-4 h-4" />
                    <span className="text-sm md:text-base">Switch to {selectedNetworkDetails?.name || 'BSC Mainnet'}</span>
                  </div>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleApproveAndStake}
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || walletState.loading || !hasEnoughBalance()}
                  className={cn(
                    "w-full transition-all duration-200",
                    hasEnoughBalance() 
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black"
                      : "bg-zinc-800 text-zinc-400 cursor-not-allowed hover:bg-zinc-800"
                  )}
                >
                  {walletState.loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : !stakeAmount || parseFloat(stakeAmount) <= 0 ? (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  ) : !hasEnoughBalance() ? (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {!stakeAmount || parseFloat(stakeAmount) <= 0 ? 'Enter Amount' : !hasEnoughBalance() ? 'Insufficient Balance' : 'Stake Now'}
                </Button>

                {stakeAmount && !hasEnoughBalance() && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full mt-3 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Link href={`/presale?amount=${parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))}`}>
                      Purchase {(parseFloat(stakeAmount) - parseFloat(formatTokenAmount(userData.tokenBalance))).toFixed(2)} {selectedNetworkDetails?.tokenSymbol || 'BBLP'}
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
                    <p className="text-xs text-gray-500">32% APR calculated returns</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <p className="text-xs text-gray-400 font-medium">Daily</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-blue-400 mb-1">{estimatedRewards.daily.toFixed(4)} {selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                      <p className="text-xs text-gray-400 font-medium">Yearly</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-green-400 mb-1">{estimatedRewards.yearly.toFixed(2)} {selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>



          <div className="flex text-center justify-center items-center gap-2 mt-2 mb-8">
  <span className="text-xs text-gray-400">Secured by</span>
  <Image src="/idhiQehyPF_logos.svg" alt="Fireblocks Logo" width={120} height={14} className="h-4 w-auto" />
</div>

          {/* Rewards Available - Only show when wallet is connected */}
          {isConnected && userData.pendingRewards && Number(userData.pendingRewards) > 0 && (
            <div className={cn(
              "bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-green-500/30 p-4 md:p-6 mb-6 shadow-xl shadow-green-500/10 transition-all duration-300",
              !isOnCorrectNetwork && "opacity-50 pointer-events-none"
            )}>
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
                      <p className="text-lg font-bold text-green-400">{parseFloat(formatTokenAmount(userData.pendingRewards, 8)) % 1 === 0 ? parseFloat(formatTokenAmount(userData.pendingRewards, 8)).toFixed(0) : formatTokenAmount(userData.pendingRewards, 8)}</p>
                      <p className="text-xs text-gray-500">{selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleClaimRewards}
                  disabled={walletState.loading || !isOnCorrectNetwork || Number(userData.pendingRewards) <= 0}
                  title={`Debug: loading=${walletState.loading}, correctNetwork=${isOnCorrectNetwork}, pendingRewards=${userData.pendingRewards}`}
                  className={cn(
                    "font-semibold text-black px-4 md:px-6",
                    "bg-gradient-to-r from-green-400 via-green-300 to-green-400",
                    "hover:from-green-300 hover:via-green-200 hover:to-green-300",
                    "shadow-lg shadow-green-400/25 hover:shadow-green-400/40",
                    "transition-all duration-300 transform hover:scale-105",
                    (walletState.loading || !isOnCorrectNetwork || Number(userData.pendingRewards) <= 0) && "opacity-50 cursor-not-allowed"
                  )}
                  size="sm"
                >
                  {walletState.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : Number(userData.pendingRewards) <= 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">No Rewards</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
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
                        <p className="text-xs text-gray-400 leading-relaxed">Earn 32% APR on your staked tokens</p>
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
                        <p className="text-xs text-gray-400 leading-relaxed">Fixed 30 days lockup period</p>
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
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-red-400/10 border border-red-400/20 mt-0.5">
                        <Network className="w-3 h-3 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Network Requirement</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Staking is available on BSC Mainnet only</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Stakes List - Only show when wallet is connected */}
          {isConnected && userData.stakes && userData.stakes.length > 0 && (
            <div className={cn(
              "py-5 rounded-3xl p-0 shadow-xl transition-all duration-300",
              !isOnCorrectNetwork && "opacity-50 pointer-events-none"
            )}>
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
                  const lockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
                  const stakingPeriod = currentTime - Number(stake.timestamp);
                  const canUnstakeNow = canUnstake(Number(stake.timestamp));
                  const countdown = countdowns[stake.stakeId];
                  const remainingTime = lockPeriod - stakingPeriod;
                  const remainingDays = Math.ceil(remainingTime / 86400);

                  return (
                    <div key={index} className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 md:p-6 rounded-2xl border border-zinc-800 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-white font-bold text-xs md:text-sm">#{stake.stakeId}</span>
                          </div>
                          <div>
                            <p className="text-lg md:text-xl font-bold text-white">{parseFloat(formatTokenAmount(stake.amount, 2)) % 1 === 0 ? parseFloat(formatTokenAmount(stake.amount, 2)).toFixed(0) : formatTokenAmount(stake.amount, 2)} {selectedNetworkDetails?.tokenSymbol || 'BBLP'}</p>
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
                              canUnstakeNow ? "bg-green-400 animate-pulse" : "bg-orange-400"
                            )}></div>
                            <span className={cn(
                              "text-sm font-semibold",
                              canUnstakeNow ? "text-green-400" : "text-orange-400"
                            )}>
                              {canUnstakeNow ? 'Ready' : 'Locked'}
                            </span>
                          </div>
                          {!canUnstakeNow && countdown && (
                            <p className="text-xs text-gray-500">
                              {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {canUnstakeNow 
                              ? `Staked for ${Math.floor(stakingPeriod / 86400)} days`
                              : `30-day lock period active`
                            }
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => handleUnstake(stake.stakeId)}
                          disabled={walletState.loading || !canUnstakeNow || !isOnCorrectNetwork}
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

                      {!canUnstakeNow && (
                        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-start gap-3">
                            <div className="p-1 rounded bg-orange-400/20 mt-0.5">
                              <Info className="w-3 h-3 text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-orange-300 leading-relaxed mb-2">
                                You can unstake after the lock period ends.
                              </p>
                              {countdown && (
                                <div className="flex items-center gap-4 text-xs text-orange-200">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">{countdown.days}</span>
                                    <span>days</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">{countdown.hours}</span>
                                    <span>hours</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">{countdown.minutes}</span>
                                    <span>min</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">{countdown.seconds}</span>
                                    <span>sec</span>
                                  </div>
                                </div>
                              )}
                            </div>
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
                                <p className="font-semibold text-white">{parseFloat(log.amount).toFixed(2)} BBLP</p>
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