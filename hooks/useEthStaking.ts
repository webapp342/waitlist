'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useBlockNumber } from 'wagmi';
import { parseEther, formatEther, createPublicClient, http, parseAbiItem } from 'viem';
import { holesky, mainnet } from 'viem/chains';
import { ETH_STAKING_ABI, WETH_STAKING_ABI, WEETH_STAKING_ABI, STETH_STAKING_ABI, EZETH_STAKING_ABI, CONTRACT_INFO } from '@/ui-abi-exports';

// Types
interface UserInfo {
  totalStaked: bigint;
  totalRewardsClaimed: bigint;
  pendingRewards: bigint;
  activeStakes: bigint;
  stakes: Array<{
    amount: bigint;
    timestamp: bigint;
    lastRewardCalculation: bigint;
    isActive: boolean;
  }>;
  stakeHistory: Array<{
    amount: bigint;
    timestamp: bigint;
    stakeIndex: number;
    transactionHash: string;
  }>;
  claimHistory: Array<{
    amount: bigint;
    timestamp: bigint;
    transactionHash: string;
  }>;
}

// getUserInfo returns a tuple, so we need to handle it properly
type UserInfoTuple = [
  bigint, // totalStaked
  bigint, // totalRewardsClaimed
  bigint, // pendingRewards
  bigint, // activeStakes
  Array<{
    amount: bigint;
    timestamp: bigint;
    lastRewardCalculation: bigint;
    isActive: boolean;
  }> // stakes
];

interface TransactionResult {
  success: boolean;
  error?: string;
  hash?: string;
}

export const useEthStaking = (selectedAsset: 'ETH' | 'WETH' | 'stETH' | 'ezETH' | 'wstETH' | 'rsETH' | 'weETH' | 'eETH' | 'ETHx' | 'pufETH' = 'ETH') => {
  const { address, isConnected } = useAccount();
  const { data: currentBlock } = useBlockNumber();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract address based on selected asset
  const contractAddress = selectedAsset === 'ETH' 
    ? CONTRACT_INFO.ETH_STAKING.address as `0x${string}`
    : selectedAsset === 'weETH'
    ? CONTRACT_INFO.WEETH_STAKING.address as `0x${string}`
    : selectedAsset === 'stETH'
    ? CONTRACT_INFO.STETH_STAKING.address as `0x${string}`
    : selectedAsset === 'ezETH'
    ? CONTRACT_INFO.EZETH_STAKING.address as `0x${string}`
    : CONTRACT_INFO.WETH_STAKING.address as `0x${string}`;
  
  // Contract ABI based on selected asset
  const contractABI = selectedAsset === 'ETH' 
    ? ETH_STAKING_ABI 
    : selectedAsset === 'weETH'
    ? WEETH_STAKING_ABI
    : selectedAsset === 'stETH'
    ? STETH_STAKING_ABI
    : selectedAsset === 'ezETH'
    ? EZETH_STAKING_ABI
    : WETH_STAKING_ABI;

  // Create public client for event logs
  const publicClient = createPublicClient({
    chain: (selectedAsset === 'ETH' || selectedAsset === 'WETH' || selectedAsset === 'stETH' || selectedAsset === 'ezETH') ? mainnet : holesky,
    transport: http((selectedAsset === 'ETH' || selectedAsset === 'WETH' || selectedAsset === 'stETH' || selectedAsset === 'ezETH') ? 'https://ethereum.publicnode.com' : 'https://ethereum-holesky.publicnode.com'),
  });

  // Contract reads
  const { data: contractBalance } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getContractBalance',
  });

  const { data: totalStaked } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalStaked',
  });

  const { data: totalStakers } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalStakers',
  });

  const { data: totalRewardsPaid } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalRewardsPaid',
  });

  const { data: apyRate } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'APY_RATE',
  });

  const { data: lockPeriod } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'LOCK_PERIOD',
  });

  // User-specific reads
  const { data: userInfoTuple } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Convert tuple to UserInfo object
  const userInfo: UserInfo | undefined = userInfoTuple ? {
    totalStaked: (userInfoTuple as UserInfoTuple)[0],
    totalRewardsClaimed: (userInfoTuple as UserInfoTuple)[1],
    pendingRewards: (userInfoTuple as UserInfoTuple)[2],
    activeStakes: (userInfoTuple as UserInfoTuple)[3],
    stakes: (userInfoTuple as UserInfoTuple)[4],
    // Convert current stakes to history format
    stakeHistory: (userInfoTuple as UserInfoTuple)[4].map((stake, index) => ({
      amount: stake.amount,
      timestamp: stake.timestamp,
      stakeIndex: index,
      transactionHash: '0x...', // Placeholder - would need event logs for real tx hash
    })),
    // Placeholder for claim history - would need event logs
    claimHistory: [],
  } : undefined;

  // Fetch detailed history from blockchain directly
  const [historyData, setHistoryData] = useState<{
    stakeHistory: Array<{
      amount: bigint;
      timestamp: bigint;
      stakeIndex: number;
      transactionHash: string;
      blockNumber: bigint;
    }>;
    claimHistory: Array<{
      amount: bigint;
      timestamp: bigint;
      transactionHash: string;
      blockNumber: bigint;
    }>;
  } | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!address || !currentBlock) return;

      try {
        console.log('Fetching history for address:', address, 'asset:', selectedAsset);
        
        // Calculate block range (last 50,000 blocks to avoid RPC limits)
        const fromBlock = currentBlock - BigInt(50000);
        const toBlock = currentBlock;

        // Get stake events - Staked event
        const stakeEvents = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event Staked(address indexed user, uint256 amount, uint256 timestamp)'),
          args: {
            user: address,
          },
          fromBlock,
          toBlock,
        });

        console.log('Stake events found:', stakeEvents.length);

        // Get claim events - RewardClaimed event
        const claimEvents = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event RewardClaimed(address indexed user, uint256 reward, uint256 timestamp)'),
          args: {
            user: address,
          },
          fromBlock,
          toBlock,
        });

        console.log('Claim events found:', claimEvents.length);

        // Format stake history
        const stakeHistory = stakeEvents.map((event, index) => ({
          amount: event.args.amount!,
          timestamp: event.args.timestamp!,
          stakeIndex: index,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        }));

        // Format claim history
        const claimHistory = claimEvents.map((event) => ({
          amount: event.args.reward!,
          timestamp: event.args.timestamp!,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        }));

        console.log('Returning history:', { stakeHistory, claimHistory });

        setHistoryData({
          stakeHistory,
          claimHistory,
        });
      } catch (err) {
        console.error('Error fetching history:', err);
        setHistoryData({
          stakeHistory: [],
          claimHistory: []
        });
      }
    };

    fetchHistory();
  }, [address, selectedAsset, currentBlock, contractAddress, publicClient]);

  // Wallet balance - ETH or WETH based on selected asset
  // For now, stETH and ezETH also use WETH token address
  const { data: walletBalanceData } = useBalance({
    address,
    token: selectedAsset === 'weETH' 
      ? '0xab84b489Bd360B7926ba6aeDe1a49A094ee6c739' as `0x${string}`
      : selectedAsset === 'WETH'
      ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
      : selectedAsset === 'stETH'
      ? '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`
      : selectedAsset !== 'ETH' 
      ? '0x60893d1a2Be3df2d98EEB277dE18535DbDF0aC9F' as `0x${string}` 
      : undefined,
  });

  // Contract writes
  const { writeContractAsync: stakeWrite, data: stakeData } = useWriteContract();

  const { writeContractAsync: claimWrite, data: claimData } = useWriteContract();

  const { writeContractAsync: withdrawWrite, data: withdrawData } = useWriteContract();

  // Transaction watchers
  const { isLoading: stakeLoading } = useWaitForTransactionReceipt({
    hash: stakeData,
  });

  const { isLoading: claimLoading } = useWaitForTransactionReceipt({
    hash: claimData,
  });

  const { isLoading: withdrawLoading } = useWaitForTransactionReceipt({
    hash: withdrawData,
  });

  // Loading state
  useEffect(() => {
    setLoading(stakeLoading || claimLoading || withdrawLoading);
  }, [stakeLoading, claimLoading, withdrawLoading]);

  // Error handling
  useEffect(() => {
    // In wagmi v2, errors are handled differently
    // We'll rely on the try-catch in the functions
    setError(null);
  }, []);

  // Token approve function
  const approveWETH = useCallback(async (amount: string): Promise<TransactionResult> => {
    try {
      setLoading(true);
      setError(null);

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }

      const parsedAmount = parseEther(amount);
      
      // Get token address based on selected asset
      const tokenAddress = selectedAsset === 'weETH' 
        ? '0xab84b489Bd360B7926ba6aeDe1a49A094ee6c739' as `0x${string}`
        : selectedAsset === 'WETH'
        ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
        : selectedAsset === 'stETH'
        ? '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`
        : selectedAsset === 'ezETH'
        ? '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110' as `0x${string}`
        : '0x60893d1a2Be3df2d98EEB277dE18535DbDF0aC9F' as `0x${string}`;
      
      const hash = await stakeWrite({
        address: tokenAddress,
        abi: [
          {
            "inputs": [
              {
                "internalType": "address",
                "name": "spender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "name": "approve",
            "outputs": [
              {
                "internalType": "bool",
                "name": "",
                "type": "bool"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'approve',
        args: [contractAddress, parsedAmount],
      });

      return {
        success: true,
        hash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve token';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [stakeWrite, contractAddress]);

  // Stake function
  const stake = useCallback(async (amount: string): Promise<TransactionResult> => {
    try {
      setLoading(true);
      setError(null);

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }

      const parsedAmount = parseEther(amount);
      
      const hash = await stakeWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'stake',
        value: selectedAsset === 'ETH' ? parsedAmount : undefined,
        args: selectedAsset !== 'ETH' ? [parsedAmount] : undefined,
      });

      return {
        success: true,
        hash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [stakeWrite, contractAddress]);

  // Claim rewards function
  const claimRewards = useCallback(async (): Promise<TransactionResult> => {
    try {
      setLoading(true);
      setError(null);

      const hash = await claimWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'claimRewards',
      });

      return {
        success: true,
        hash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [claimWrite, contractAddress]);

  // Withdraw function
  const withdraw = useCallback(async (stakeIndex: number): Promise<TransactionResult> => {
    try {
      setLoading(true);
      setError(null);

      const hash = await withdrawWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'withdraw',
        args: [BigInt(stakeIndex)],
      });

      return {
        success: true,
        hash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [withdrawWrite, contractAddress]);

  // Calculate reward function
  const calculateReward = useCallback(async (userAddress?: string): Promise<string> => {
    try {
      const targetAddress = userAddress || address;
      if (!targetAddress) return '0';

      // This would need to be implemented with a contract read
      // For now, returning a placeholder
      return '0';
    } catch (err) {
      console.error('Error calculating reward:', err);
      return '0';
    }
  }, [address]);

  // Format values for display - no rounding, show exact values
  const formatContractBalance = contractBalance && typeof contractBalance === 'bigint' ? formatEther(contractBalance) : '0';
  const formatTotalStaked = totalStaked && typeof totalStaked === 'bigint' ? formatEther(totalStaked) : '0';
  const formatTotalRewardsPaid = totalRewardsPaid && typeof totalRewardsPaid === 'bigint' ? formatEther(totalRewardsPaid) : '0';
  const formatWalletBalance = walletBalanceData && walletBalanceData.value ? formatEther(walletBalanceData.value) : '0';
  const formatApyRate = apyRate && typeof apyRate === 'bigint' ? apyRate.toString() : '0';
  const formatLockPeriod = lockPeriod && typeof lockPeriod === 'bigint' ? lockPeriod.toString() : '0';

  return {
    // Connection state
    isConnected,
    address,
    loading,
    error,

    // Contract data
    contractBalance: formatContractBalance,
    totalStaked: formatTotalStaked,
    totalStakers: totalStakers?.toString() || '0',
    totalRewardsPaid: formatTotalRewardsPaid,
    userInfo: userInfo as UserInfo | undefined,
    apyRate: formatApyRate,
    lockPeriod: formatLockPeriod,
    walletBalance: formatWalletBalance,

    // History data
    historyData,

    // Selected asset
    selectedAsset,

    // Functions
    stake,
    approveWETH,
    claimRewards,
    withdraw,
    calculateReward,
  };
}; 