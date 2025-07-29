"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Twitter, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Activity,
  Zap,
  Star,
  Trophy,
  Gift,
  Info,
  Clock10Icon,
  Clock,
  Repeat,
  Check,
  Calendar
} from 'lucide-react';
import Image from 'next/image';
import { referralService, userService, cardService, airdropService } from '@/lib/supabase';

import type { Card as CardType } from '@/lib/supabase';
import { useWallet } from '@/hooks/useWallet';
import Header from '@/components/header';
import WalletModal from '@/components/WalletModal';

interface ConnectionStatus {
  isConnected: boolean;
  platform: 'x' | 'telegram' | 'discord';
  username?: string;
  avatarUrl?: string;
  verified?: boolean;
  canClaimReward?: boolean;
  discordId?: string;
  stats?: {
    followers?: number;
    messages?: number;
    xp?: number;
    level?: string;
    dailyReward?: number;
    lastClaimedAt?: string; // Added for Discord
    isGrokTaskWinner?: boolean; // Added for Grok Task Winners
  };
}

interface SocialConnections {
  x: ConnectionStatus;
  telegram: ConnectionStatus;
  discord: ConnectionStatus;
}

// Add DailyTask type
interface DailyTask {
  id: number;
  title: string;
  link: string;
  reward: number;
  claimed: boolean;
  created_at: string;
}

export default function SocialConnectionsPage() {
  const { address, isConnected } = useAccount();
  
  // Get staking data from both networks
  const { userData: bscUserData } = useWallet(56); // BSC Mainnet
  const { userData: ethUserData } = useWallet(1); // Ethereum Mainnet
  
  // Combine data from both networks - memoized to prevent recalculation
  const combinedUserData = useMemo(() => ({
    ...bscUserData,
    stakedAmount: (parseFloat(bscUserData?.stakedAmount || '0') + parseFloat(ethUserData?.stakedAmount || '0')).toString(),
    pendingRewards: (parseFloat(bscUserData?.pendingRewards || '0') + parseFloat(ethUserData?.pendingRewards || '0')).toString(),
    stakes: [...(bscUserData?.stakes || []), ...(ethUserData?.stakes || [])]
  }), [bscUserData, ethUserData]);
  
  const [connections, setConnections] = useState<SocialConnections>({
    x: { isConnected: false, platform: 'x' },
    telegram: { isConnected: false, platform: 'telegram' },
    discord: { isConnected: false, platform: 'discord' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [extraRewards, setExtraRewards] = useState<{[key: string]: any[]}>({
    telegram: [],
    discord: []
      });
    const [showInfo, setShowInfo] = useState(false);
    const [showXPInfo, setShowXPInfo] = useState(false);
    const [showPointsInfo, setShowPointsInfo] = useState(false);
    const [showUSDTInfo, setShowUSDTInfo] = useState(false);
 
    // Use DailyTask[] for dailyTasks state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);

  // Add timer/claim state for daily tasks
  const [taskTimers, setTaskTimers] = useState<{ [taskId: number]: number }>({});
  const [taskClaimed, setTaskClaimed] = useState<{ [taskId: number]: boolean }>({});

  // Referral states
  const [referralStats, setReferralStats] = useState<{ totalReferrals: number; totalRewards: string; referralCode?: any }>({ totalReferrals: 0, totalRewards: '0', referralCode: null });
  const [referralLoading, setReferralLoading] = useState(false);

  // Staking tasks states
  const [claimedStakeTasks, setClaimedStakeTasks] = useState<Record<number, any>>({});
  const [stakingTasksLoading, setStakingTasksLoading] = useState(false);

  // Toplam ödül state'i
  const [totalSocialPoints, setTotalSocialPoints] = useState<number>(0);
  const [totalSocialPointsLoading, setTotalSocialPointsLoading] = useState(false);

  // Airdrop XP state
  const [airdropXP, setAirdropXP] = useState<number>(0);
  const [airdropLoading, setAirdropLoading] = useState(false);

  // Reward type state for dynamic USDT/BBLP calculation
  const [rewardType, setRewardType] = useState<'usdt' | 'bblp'>('usdt');

  // Sonsuz loading önleyici: kısa süre loading, sonra fallback
  const [showLoading, setShowLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [userRegistering, setUserRegistering] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [userCards, setUserCards] = useState<CardType[]>([]);

  useEffect(() => {
    if (isConnected === false || !address) {
      setShowLoading(false);
      return;
    }
    const timeout = setTimeout(() => {
      setShowLoading(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [isConnected, address]);

  // Fetch airdrop XP for the user's wallet address
  useEffect(() => {
    const fetchAirdropXP = async () => {
      if (!address) return;
      setAirdropLoading(true);
      try {
        console.log('🔍 Fetching airdrop XP for address:', address);
        console.log('🔍 Address toLowerCase:', address.toLowerCase());
        const airdropData = await airdropService.getAirdropByAddress(address);
        console.log('✅ Airdrop data received:', airdropData);
        setAirdropXP(airdropData ? airdropData.xp_amount : 0);
      } catch (error) {
        console.error('❌ Error fetching airdrop XP:', error);
        setAirdropXP(0);
      } finally {
        setAirdropLoading(false);
      }
    };
    
    if (isConnected && address) {
      fetchAirdropXP();
    }
  }, [isConnected, address]);

  // Toplam ödül bilgisini çek - optimized to reduce API calls
  useEffect(() => {
    const fetchTotalSocialPoints = async () => {
      if (!address) return;
      setTotalSocialPointsLoading(true);
      try {
        const res = await fetch(`/api/social-connections/total-rewards?walletAddress=${address}`);
        const data = await res.json();
        if (data.success) {
          setTotalSocialPoints(data.totalPoints);
        }
      } catch (error) {
        setTotalSocialPoints(0);
      } finally {
        setTotalSocialPointsLoading(false);
      }
    };
    if (isConnected && address) {
      fetchTotalSocialPoints();
    }
  }, [isConnected, address]);

  // Check all social connections - memoized callback
  const checkAllConnections = useCallback(async () => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    
    try {
      // Paralel API çağrıları
      const [xResponse, telegramResponse, discordResponse] = await Promise.all([
        // X connection
        fetch('/api/x/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address }),
        }),
        // Telegram stats
        fetch(`/api/telegram/stats?walletAddress=${address}`),
        // Discord stats
        fetch(`/api/discord/stats?walletAddress=${address}`)
      ]);

      // X data
      let xData = null;
      if (xResponse.ok) {
        xData = await xResponse.json();
      }

      // Telegram data
      let telegramData = null;
      if (telegramResponse.ok) {
        telegramData = await telegramResponse.json();
      }

      // Discord data
      let discordData = null;
      if (discordResponse.ok) {
        discordData = await discordResponse.json();
      }

      // State'i güncelle
      setConnections(prev => ({
        x: {
          isConnected: xData?.connected || false,
          platform: 'x',
          username: xData?.xUser?.username,
          avatarUrl: xData?.xUser?.profile_image_url,
          verified: xData?.xUser?.verified,
          stats: {
            followers: xData?.xUser?.followers_count,
            messages: xData?.xUser?.tweet_count,
            xp: xData?.xp || 0,
            level: xData?.level || 0,
            dailyReward: xData?.dailyReward || 0,
            isGrokTaskWinner: xData?.xUser?.isGrokTaskWinner || false
          }
        },
        telegram: {
          isConnected: telegramData?.isConnected || false,
          platform: 'telegram',
          username: telegramData?.username,
          canClaimReward: telegramData?.canClaimReward || false,
          stats: {
            messages: telegramData?.messageCount,
            xp: telegramData?.totalXP,
            level: `Level ${telegramData?.currentLevel}`,
            dailyReward: telegramData?.dailyReward
          }
        },
        discord: {
          isConnected: discordData?.isConnected || false,
          platform: 'discord',
          username: discordData?.username,
          avatarUrl: discordData?.avatarUrl,
          verified: discordData?.verified,
          canClaimReward: discordData?.canClaimReward || false,
          discordId: discordData?.discordId,
          stats: {
            messages: discordData?.messageCount,
            xp: discordData?.totalXP,
            level: discordData?.currentLevel,
            dailyReward: discordData?.dailyReward,
            lastClaimedAt: discordData?.lastClaimedAt
          }
        }
      }));

      // Extra rewards kontrolü
      if (telegramData?.isConnected) {
        await checkExtraRewards('telegram', telegramData.totalXP);
      }
      if (discordData?.isConnected) {
        await checkExtraRewards('discord', discordData.totalXP);
      }

    } catch (error) {
      console.error('Error checking social connections:', error);
      toast.error('Failed to check social connections');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const checkExtraRewards = async (platform: 'telegram' | 'discord', currentXP: number) => {
    try {
      console.log(`🔍 Checking extra rewards for ${platform}, XP: ${currentXP}`);
      
      const response = await fetch('/api/extra-rewards/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          platform,
          currentXP 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Extra rewards response for ${platform}:`, data);
        
        setExtraRewards(prev => ({
          ...prev,
          [platform]: data.availableRewards || []
        }));
      } else {
        console.error(`❌ Extra rewards API error for ${platform}:`, response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error(`❌ Error checking extra rewards for ${platform}:`, error);
    }
  };

  const claimExtraReward = async (platform: 'telegram' | 'discord', levelName: string) => {
    try {
      const response = await fetch('/api/extra-rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          platform,
          levelName 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        // Update extra rewards state immediately
        setExtraRewards(prev => ({
          ...prev,
          [platform]: prev[platform].map(reward => 
            reward.level === levelName 
              ? { ...reward, claimed: true }
              : reward
          )
        }));
        
        // Also refresh from API to ensure consistency
        const currentXP = connections[platform].stats?.xp || 0;
        await checkExtraRewards(platform, currentXP);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to claim extra reward');
      }
    } catch (error) {
      console.error('Error claiming extra reward:', error);
      toast.error('Failed to claim extra reward');
    }
  };

  // Start timer for a task - memoized callback
  const startTaskTimer = useCallback((taskId: number) => {
    if (taskTimers[taskId]) return; // already running
    setTaskTimers(prev => ({ ...prev, [taskId]: 60 }));
  }, [taskTimers]);

  // Replace all separate connection fetches with a single fast fetch
  useEffect(() => {
    if (!isConnected || !address) return;
    checkAllConnections();
  }, [isConnected, address, checkAllConnections]);

  // Batch additional API calls with main connection check for better performance
  useEffect(() => {
    if (!address) return;
    
    // Batch multiple API calls together to reduce total requests
    const batchAPIcalls = async () => {
      setStakingTasksLoading(true);
      try {
        const [dailyTasksRes, milestonesRes, stakeTasksRes] = await Promise.all([
          fetch(`/api/admin/dailytasks?user_id=${address}`),
          fetch(`/api/invite-rewards/status?walletAddress=${address}`),
          fetch(`/api/staking-tasks/status?walletAddress=${address}`)
        ]);

        // Process daily tasks
        const dailyTasksData = await dailyTasksRes.json();
        if (dailyTasksData.success) setDailyTasks(dailyTasksData.tasks || []);

        // Process milestones  
        const milestonesData = await milestonesRes.json();
        if (milestonesData.claimed) setClaimedMilestones(milestonesData.claimed);
        else setClaimedMilestones([]);

        // Process stake tasks
        const stakeTasksData = await stakeTasksRes.json();
        if (stakeTasksData.success) setClaimedStakeTasks(stakeTasksData.claimedTasks);
        else setClaimedStakeTasks({});

      } catch (error) {
        console.error('Error in batch API calls:', error);
        // Set fallback states
        setDailyTasks([]);
        setClaimedMilestones([]);
        setClaimedStakeTasks({});
      } finally {
        setStakingTasksLoading(false);
      }
    };

    if (isConnected && address) {
      batchAPIcalls();
    }
  }, [isConnected, address]);

  // Start timer for a task
  useEffect(() => {
    const interval = setInterval(() => {
      setTaskTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[+id] > 0) updated[+id] = updated[+id] - 1;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Claim handler - memoized callback
  const handleClaimTask = useCallback(async (task: DailyTask) => {
    // Use wallet address as user_id (or change as needed)
    const user_id = address;
    const res = await fetch('/api/admin/dailytasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, task_id: task.id, reward: task.reward })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setTaskClaimed(prev => ({ ...prev, [task.id]: true }));
    } else {
      toast.error(data.error || 'Failed to claim task');
    }
  }, [address]);

  const getPlatformInfo = (platform: 'x' | 'telegram' | 'discord') => {
    switch (platform) {
      case 'x':
        return {
          name: 'X (Twitter)',
          icon: Twitter,
          color: 'text-blue-400',
          bgColor: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
          description: 'Connect your X account to earn social rewards',
          connectUrl: '/x'
        };
      case 'telegram':
        return {
          name: 'Telegram',
          icon: MessageSquare,
          color: 'text-blue-500',
          bgColor: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
          description: 'Connect your Telegram account to earn community rewards',
          connectUrl: '/telegram'
        };
      case 'discord':
        return {
          name: 'Discord',
          icon: Users,
          color: 'text-purple-400',
          bgColor: 'bg-purple-600',
          hoverColor: 'hover:bg-purple-700',
          description: 'Connect your Discord account to earn community rewards',
          connectUrl: '/discord'
        };
    }
  };

  // Memoized helper functions to prevent unnecessary recalculations
  const getConnectedCount = useMemo(() => {
    return Object.values(connections).filter(conn => conn.isConnected).length;
  }, [connections]);

  const getTotalRewards = useMemo(() => {
    let total = 0;
    if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
      total += connections.telegram.stats?.dailyReward || 0;
    }
    if (connections.discord.isConnected && connections.discord.canClaimReward) {
      total += connections.discord.stats?.dailyReward || 0;
    }
    return total;
  }, [connections]);

  const getTotalXP = useMemo(() => {
    let totalXP = 0;
    
    // Base XP from platforms
    if (connections.x.isConnected) {
      totalXP += connections.x.stats?.xp || 0;
    }
    if (connections.telegram.isConnected) {
      totalXP += connections.telegram.stats?.xp || 0;
    }
    if (connections.discord.isConnected) {
      totalXP += connections.discord.stats?.xp || 0;
    }
    
    // Add claimed extra rewards from state (for real-time updates)
    extraRewards.telegram.forEach(reward => {
      if (reward.claimed) {
        totalXP += reward.xpReward;
      }
    });
    
    extraRewards.discord.forEach(reward => {
      if (reward.claimed) {
        totalXP += reward.xpReward;
      }
    });
    
    // Add airdrop XP
    totalXP += airdropXP;
    
    console.log('📊 Total XP Calculation:', {
      baseXP: {
        x: connections.x.isConnected ? connections.x.stats?.xp || 0 : 0,
        telegram: connections.telegram.isConnected ? connections.telegram.stats?.xp || 0 : 0,
        discord: connections.discord.isConnected ? connections.discord.stats?.xp || 0 : 0
      },
      extraRewards: {
        telegram: extraRewards.telegram.filter(r => r.claimed).map(r => ({ level: r.level, xp: r.xpReward })),
        discord: extraRewards.discord.filter(r => r.claimed).map(r => ({ level: r.level, xp: r.xpReward }))
      },
      airdropXP,
      totalXP
    });
    
    return totalXP;
  }, [connections, extraRewards, airdropXP]);

  const getEstimatedReward = useMemo(() => {
    let xpContribution, pointsContribution, grokBonus = 0;
    
    if (rewardType === 'usdt') {
      xpContribution = getTotalXP * 0.00001; // XP'nin %0.001'i
      pointsContribution = totalSocialPoints * 0.00005; // Points'in %0.005'i
      
      // Grok Task Winner bonus - sadece USDT için
      if (connections.x?.stats?.isGrokTaskWinner) {
        grokBonus = 10;
      }
    } else { // bblp
      xpContribution = getTotalXP * 0.01; // XP'nin %1'i
      pointsContribution = totalSocialPoints * 0.025; // Points'in %2.5'i
    }
    
    const total = xpContribution + pointsContribution + grokBonus;
    return total.toFixed(rewardType === 'usdt' ? 2 : 0);
  }, [getTotalXP, totalSocialPoints, rewardType, connections.x?.stats?.isGrokTaskWinner]);

  const getLevelTasks = (platform: 'telegram' | 'discord') => {
    const levels = [
      { name: 'Bronze', minXP: 0, maxXP: 250, levelNumber: 1, reward: 1 },
      { name: 'Silver', minXP: 251, maxXP: 500, levelNumber: 2, reward: 2 },
      { name: 'Gold', minXP: 501, maxXP: 1000, levelNumber: 3, reward: 3 },
      { name: 'Platinum', minXP: 1001, maxXP: 2000, levelNumber: 4, reward: 4 },
      { name: 'Diamond', minXP: 2001, maxXP: 999999, levelNumber: 5, reward: 5 }
    ];

    const connection = connections[platform];
    const currentXP = connection.stats?.xp || 0;
    const platformExtraRewards = extraRewards[platform] || [];

    console.log(`🎯 Getting level tasks for ${platform}:`, {
      currentXP,
      platformExtraRewards,
      connection: connection.stats
    });

    // Show all levels except claimed ones
    return levels.map(level => {
      const completed = currentXP >= level.maxXP;
      const inProgress = currentXP >= level.minXP && currentXP < level.maxXP;
      const progress = inProgress ? ((currentXP - level.minXP) / (level.maxXP - level.minXP)) * 100 : 0;

      // Check if extra reward is available for this level
      const extraReward = platformExtraRewards.find(r => r.level === level.name);
      
      // If level is completed but no extra reward record exists, it means reward hasn't been created yet
      const hasExtraReward = extraReward && !extraReward.claimed;
      const rewardExists = extraReward !== undefined; // Extra reward record exists (claimed or not)
      const canClaim = completed && hasExtraReward;
      const isClaimed = extraReward && extraReward.claimed; // Reward is claimed

      console.log(`📊 Level ${level.name} (${platform}):`, {
        completed,
        hasExtraReward,
        rewardExists,
        canClaim,
        isClaimed,
        extraReward
      });

      return {
        levelName: level.name,
        levelNumber: level.levelNumber,
        xpRequired: level.maxXP,
        currentXP: currentXP,
        completed,
        inProgress,
        progress: Math.round(progress),
        hasExtraReward,
        extraRewardXP: extraReward?.xpReward || 0,
        canClaim,
        rewardExists,
        isClaimed // Whether reward is claimed
      };
    });
  };

  const hasClaimableRewards = useMemo(() => {
    const telegramClaimable = connections.telegram.isConnected && connections.telegram.canClaimReward;
    const discordClaimable = connections.discord.isConnected && connections.discord.canClaimReward;
    
    const hasClaimable = telegramClaimable || discordClaimable;
    
    console.log('🔍 Claimable Rewards Check:', {
      telegram: {
        isConnected: connections.telegram.isConnected,
        canClaimReward: connections.telegram.canClaimReward,
        claimable: telegramClaimable
      },
      discord: {
        isConnected: connections.discord.isConnected,
        canClaimReward: connections.discord.canClaimReward,
        claimable: discordClaimable
      },
      totalClaimable: hasClaimable
    });
    
    return hasClaimable;
  }, [connections]);

  const claimAllRewards = useCallback(async () => {
    if (!address || !hasClaimableRewards) return;

    setIsClaiming(true);
    
    // Optimistic update: Hemen butonları disable et
    setConnections(prev => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        canClaimReward: false
      },
      discord: {
        ...prev.discord,
        canClaimReward: false
      }
    }));

    const claimedRewards = [];
    const errors = [];

    try {
      // Telegram claim
      if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
        try {
          const telegramRes = await fetch('/api/telegram/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address }),
          });

          if (telegramRes.ok) {
            const data = await telegramRes.json();
            claimedRewards.push(`Telegram: ${data.reward.amount} BBLP`);
          } else {
            const err = await telegramRes.json();
            errors.push(`Telegram: ${err.error || 'Failed to claim'}`);
            // Hata durumunda optimistic update'i geri al
            setConnections(prev => ({
              ...prev,
              telegram: {
                ...prev.telegram,
                canClaimReward: true
              }
            }));
          }
        } catch (error) {
          errors.push('Telegram: Network error');
          setConnections(prev => ({
            ...prev,
            telegram: {
              ...prev.telegram,
              canClaimReward: true
            }
          }));
        }
      }

      // Discord claim
      if (connections.discord.isConnected && connections.discord.canClaimReward && connections.discord.discordId) {
        try {
          const discordRes = await fetch('/api/discord/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              discordId: connections.discord.discordId 
            }),
          });

          if (discordRes.ok) {
            const data = await discordRes.json();
            claimedRewards.push(`Discord: ${data.rewardAmount} BBLP`);
          } else {
            const err = await discordRes.json();
            errors.push(`Discord: ${err.error || 'Failed to claim'}`);
            // Hata durumunda optimistic update'i geri al
            setConnections(prev => ({
              ...prev,
              discord: {
                ...prev.discord,
                canClaimReward: true
              }
            }));
          }
        } catch (error) {
          errors.push('Discord: Network error');
          setConnections(prev => ({
            ...prev,
            discord: {
              ...prev.discord,
              canClaimReward: true
            }
          }));
        }
      }

      // Sonuçları göster
      if (claimedRewards.length > 0) {
        toast.success(`Successfully claimed: ${claimedRewards.join(', ')}`);
      }
      if (errors.length > 0) {
        toast.error(errors.join(' | '));
      }
      if (claimedRewards.length === 0 && errors.length === 0) {
        toast.error('Alınabilir ödül yok');
      }

      // State'i güncelle (background'da)
      setTimeout(() => {
        checkAllConnections();
      }, 1000);

    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error('Ödüller alınırken hata oluştu');
      
      // Hata durumunda optimistic update'i geri al
      setConnections(prev => ({
        ...prev,
        telegram: {
          ...prev.telegram,
          canClaimReward: connections.telegram.canClaimReward
        },
        discord: {
          ...prev.discord,
          canClaimReward: connections.discord.canClaimReward
        }
      }));
    } finally {
      setIsClaiming(false);
    }
  }, [address, hasClaimableRewards, connections]);

  function isValidImageUrl(url?: string) {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // LEVEL_META açıklamalarını platforma göre ayır
  const TELEGRAM_LEVEL_META: Record<string, { desc: string }> = {
    Bronze:   { desc: 'Start your Telegram journey!' },
    Silver:   { desc: 'Chat more, earn more XP.' },
    Gold:     { desc: 'You are a true Telegram regular.' },
    Platinum: { desc: 'Elite chatter, keep it up!' },
    Diamond:  { desc: 'Legend of the Telegram community.' }
  };
  const DISCORD_LEVEL_META: Record<string, { desc: string }> = {
    Bronze:   { desc: 'Join the Discord adventure.' },
    Silver:   { desc: 'Level up your Discord presence.' },
    Gold:     { desc: 'You are a Discord power user.' },
    Platinum: { desc: 'Top contributor, server star!' },
    Diamond:  { desc: 'Discord legend, lead the way!' }
  };

  // Helper to get user's total daily reward (not just claimable) - memoized
  const getUserTotalDailyReward = useMemo(() => {
    let total = 0;
    if (connections.telegram.isConnected) {
      total += connections.telegram.stats?.dailyReward || 0;
    }
    if (connections.discord.isConnected) {
      total += connections.discord.stats?.dailyReward || 0;
    }
    return total;
  }, [connections]);

  // --- Geri sayım için yardımcı fonksiyonlar ---
  // Discord için son claim zamanı ve kalan süre
  const getDiscordNextClaimCountdown = () => {
    // Varsayılan: null
    if (!connections.discord.isConnected || connections.discord.canClaimReward) return null;
    // Son claim zamanı yoksa null
    const lastClaimedAt = connections.discord.stats?.lastClaimedAt;
    if (!lastClaimedAt) return null;
    const lastDate = new Date(lastClaimedAt);
    const nextClaimDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = nextClaimDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Telegram için claim tablosunda lastClaimedAt yok, claim hakkı yoksa kalan süreyi gösteremeyiz (geliştirilebilir)
  // Şimdilik sadece Discord için gösterelim

  // Fetch referral stats when address changes
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!address) return;
      setReferralLoading(true);
      try {
        const stats = await referralService.getUserReferralStats(address);
        setReferralStats(stats);
      } catch (e) {
        setReferralStats({ totalReferrals: 0, totalRewards: '0', referralCode: null });
      } finally {
        setReferralLoading(false);
      }
    };
    if (isConnected && address) {
      fetchReferralStats();
    }
  }, [isConnected, address]);

  // Invite milestone claim state
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  // Fetch claimed invite milestones - moved to batched API calls above for better performance

  // Claim invite milestone
  const handleClaimInviteMilestone = async (milestoneCount: number, points: number) => {
    if (!address) return;
    setClaimingMilestone(milestoneCount);
    try {
      const res = await fetch('/api/invite-rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, milestoneCount, points })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Claimed ${points} points for inviting ${milestoneCount} friends!`);
        setClaimedMilestones(prev => [...prev, milestoneCount]);
      } else {
        toast.error(data.error || 'Failed to claim milestone');
      }
    } catch (e) {
      toast.error('Failed to claim milestone');
    } finally {
      setClaimingMilestone(null);
    }
  };

  // Helper: check if all platforms are disconnected - memoized
  const allDisconnected = useMemo(() => !connections.x.isConnected && !connections.telegram.isConnected && !connections.discord.isConnected, [connections]);
  // Helper: check if all platforms are connected - memoized
  const allConnected = useMemo(() => connections.x.isConnected && connections.telegram.isConnected && connections.discord.isConnected, [connections]);

  // Overlay/blur for main content if all disconnected
  const blurOverlay = allDisconnected ? (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm pointer-events-auto" />
  ) : null;

  // Claim stake task
  const handleClaimStakeTask = async (amount: number, points: number) => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/staking-tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          stakeAmount: amount,
          points: points
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully claimed ${points} points for staking ${amount} BBLP!`);
        // Update local state to mark as claimed
        setClaimedStakeTasks(prev => ({
          ...prev,
          [amount]: {
            points: points,
            claimed: true,
            claimedAt: new Date().toISOString()
          }
        }));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to claim stake task');
      }
    } catch (error) {
      console.error('Error claiming stake task:', error);
      toast.error('Failed to claim stake task');
    }
  };

  // Fetch claimed staking tasks - moved to batched API calls above for better performance

  // Invite your first friend tamam mı? - memoized
  const hasInvitedFirstFriend = useMemo(() => claimedMilestones.includes(1), [claimedMilestones]);

  // Günlük ödül claim butonu aktif mi? - memoized
  const canClaimDailyReward = useMemo(() => hasClaimableRewards && hasInvitedFirstFriend, [hasClaimableRewards, hasInvitedFirstFriend]);
  const shouldShowInviteWarning = useMemo(() => hasClaimableRewards && !hasInvitedFirstFriend, [hasClaimableRewards, hasInvitedFirstFriend]);

  // Responsive design handled by Tailwind classes - no dynamic CSS injection needed

  // Yeni: Sosyal bağlantıların yüklenip yüklenmediğini kontrol et
  const isConnectionsLoading = isLoading; // isLoading zaten bağlantı fetch edilirken true

  // Connect Wallet butonu ana sayfadaki gibi modal açacak
  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  // Cüzdan bağlandığında kullanıcı ekle ve kartları oluştur
  useEffect(() => {
    const registerUserAndLoadCards = async () => {
      if (!isConnected || !address || userRegistering || userRegistered) return;
      setUserRegistering(true);
      try {
        // Kullanıcıyı ekle
        const existingUser = await userService.checkUserExists(address);
        let user = existingUser;
        let isNew = false;
        if (!existingUser) {
          user = await userService.addUser(address);
          isNew = true;
        }
        if (user) {
          setUserRegistered(true);
          if (isNew) toast.success('User registration successful!');
          // Kartları yükle
          const cards = await cardService.getUserCards(address);
          setUserCards(cards);
          if (isNew && cards && cards.length > 0) {
            toast.success('Your cards have been created!');
          }
        } else {
          toast.error('Kullanıcı kaydı başarısız.');
        }
      } catch (error) {
        toast.error('Kullanıcı kaydı sırasında hata oluştu.');
        console.error(error);
      } finally {
        setUserRegistering(false);
      }
    };
    registerUserAndLoadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  if (showLoading && (isConnected === undefined || isConnected === null || address === undefined)) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
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
        </main>
      </>
    );
  }

  if (!showLoading && (isConnected === false || !address)) {
    return (
      <>
        <Header />
        <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #000000 100%)' }}>
          {/* Hero Section */}
          <div className="max-w-6xl mx-auto text-center mb-12 pt-16">
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-6">
              BBLIP Social Quests
            </h1>
            <p className="text-xl md:text-2xl text-[#A1A1AA] mb-8 max-w-3xl mx-auto">
              Connect your wallet to start earning rewards through social engagement
            </p>
            
            {/* Connect Wallet CTA */}
            <div className="bg-gradient-to-br from-yellow-200/10 to-yellow-100/5 border border-yellow-200/20 rounded-2xl p-8 max-w-md mx-auto mb-12">
              <div className="text-center mb-6">
                
                <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
                <p className="text-[#A1A1AA] text-sm mb-6">Connect your wallet to unlock all quest features and start earning rewards</p>
              </div>
              <Button
                size="lg"
                onClick={handleConnectWallet}
                className="bg-gradient-to-r from-yellow-200 to-yellow-300 text-black hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300 rounded-xl px-8 py-3 font-bold shadow-lg w-full text-lg"
              >
                Connect Wallet
              </Button>
            </div>
          </div>

          {/* Features Preview */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">What You Can Earn</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* XP Preview */}
              <div className="bg-[#23232A] border border-[#2A2A2E] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Experience Points</h3>
                <p className="text-[#A1A1AA] text-sm mb-4">Earn XP by completing social tasks and level up your profile</p>
              </div>

              {/* Points Preview */}
                             <div className="bg-[#23232A] border border-[#2A2A2E] rounded-2xl p-6 text-center">
                 <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Trophy className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Social Points</h3>
                 <p className="text-[#A1A1AA] text-sm mb-4">Collect points from daily tasks and social engagement</p>
               </div>

               {/* USDT Preview */}
               <div className="bg-gradient-to-br from-yellow-200/10 to-yellow-100/5 border border-yellow-200/20 rounded-2xl p-6 text-center">
                 <div className="w-12 h-12 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Gift className="w-6 h-6 text-black" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">USDT Rewards</h3>
                 <p className="text-[#A1A1AA] text-sm mb-4">Convert your activity into real USDT rewards</p>
               </div>
            </div>

        

            {/* Benefits Section */}
            <div className="mt-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Why Connect Your Wallet?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 <div className="bg-[#1A1A1A] border border-[#35353B] rounded-xl p-4">
                   <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                   <p className="text-white text-sm font-medium">Secure & Safe</p>
                   <p className="text-[#A1A1AA] text-xs">Your wallet, your control</p>
                 </div>
                 <div className="bg-[#1A1A1A] border border-[#35353B] rounded-xl p-4">
                   <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                   <p className="text-white text-sm font-medium">Instant Rewards</p>
                   <p className="text-[#A1A1AA] text-xs">Real-time point tracking</p>
                 </div>
                 <div className="bg-[#1A1A1A] border border-[#35353B] rounded-xl p-4">
                   <Star className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                   <p className="text-white text-sm font-medium">Level Up</p>
                   <p className="text-[#A1A1AA] text-xs">Unlock higher rewards</p>
                 </div>
                <div className="bg-[#1A1A1A] border border-[#35353B] rounded-xl p-4">
                  <Gift className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">Exclusive Access</p>
                  <p className="text-[#A1A1AA] text-xs">Special community perks</p>
                </div>
              </div>
            </div>
          </div>
          
          <WalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
        </div>
      </>
    );
  }

  // YENİ: Bağlantı bilgileri yükleniyorsa loading animasyonu göster
  if (isConnectionsLoading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
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
        </main>
      </>
    );
  }

  if (!allConnected) {
    // Redesigned connect cards overlay
    return (
      <>
        <Header />
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative px-4" style={{ background: '#18181B' }}>
        {/* Overlay */}
        <div className="fixed top-16 left-0 right-0 bottom-0 z-30 backdrop-blur-md" />
        
        {/* Minimal Header */}
        <div className="relative z-40 text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Connect Platforms</h1>
          <p className="text-sm text-[#A1A1AA] max-w-md">Connect your social accounts to start earning rewards</p>
        </div>
        
        {/* Compact Connect Cards */}
        <div className="relative z-40 w-full max-w-md space-y-3">
            {[
              {
                platform: 'x',
                name: 'X (Twitter)',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#1DA1F2"><path d="M32 6.076a13.14 13.14 0 0 1-3.769 1.031A6.601 6.601 0 0 0 31.115 4.1a13.195 13.195 0 0 1-4.169 1.594A6.563 6.563 0 0 0 22.155 2c-3.626 0-6.563 2.938-6.563 6.563 0 .514.058 1.016.17 1.496C10.303 9.87 5.47 7.38 2.228 3.671a6.544 6.544 0 0 0-.888 3.3c0 2.277 1.159 4.287 2.924 5.464a6.533 6.533 0 0 1-2.975-.822v.083c0 3.18 2.263 5.833 5.267 6.437a6.575 6.575 0 0 1-2.968.112c.837 2.614 3.263 4.516 6.142 4.567A13.18 13.18 0 0 1 0 27.026 18.616 18.616 0 0 0 10.063 30c12.072 0 18.681-10.002 18.681-18.682 0-.285-.007-.568-.02-.85A13.354 13.354 0 0 0 32 6.076z"/></svg>,
                color: '#1DA1F2',
                connectUrl: '/x',
                desc: 'Connect your X account.',
                isConnected: connections.x.isConnected
              },
              {
                platform: 'telegram',
                name: 'Telegram',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#229ED9"><path d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16zm6.406-21.406l-2.75 12.969c-.207.93-.75 1.156-1.519.72l-4.188-3.094-2.022 1.947c-.223.223-.41.41-.84.41l.299-4.23 7.688-6.938c.334-.299-.073-.465-.517-.166l-9.5 5.98-4.094-1.281c-.889-.277-.906-.889.186-1.316l16.031-6.188c.748-.277 1.406.166 1.166 1.314z"/></svg>,
                color: '#229ED9',
                connectUrl: '/telegram',
                desc: 'Connect your Telegram account.',
                isConnected: connections.telegram.isConnected
              },
              {
                platform: 'discord',
                name: 'Discord',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#5865F2"><path d="M27.2 6.8A26.9 26.9 0 0 0 20.5 4a1 1 0 0 0-.5.1c-.2.1-.3.3-.3.5l-.3 1.2a24.2 24.2 0 0 0-7.8 0l-.3-1.2a.7.7 0 0 0-.3-.5A1 1 0 0 0 11.5 4a26.9 26.9 0 0 0-6.7 2.8c-.2.1-.3.3-.3.5C2.1 13.1 1.2 19.2 2.1 25.2c0 .2.2.4.4.5A27.2 27.2 0 0 0 11.5 28a1 1 0 0 0 .5-.1c.2-.1.3-.3.3-.5l.3-1.2a24.2 24.2 0 0 0 7.8 0l.3 1.2c.1.2.2.4.3.5a1 1 0 0 0 .5.1 27.2 27.2 0 0 0 8.9-2.3c.2-.1.4-.3.4-.5.9-6 .1-12.1-1.7-17.9a.7.7 0 0 0-.3-.5zM11.1 20.2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9.8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>,
                color: '#5865F2',
                connectUrl: '/discord',
                desc: 'Connect your Discord account.',
                isConnected: connections.discord.isConnected
              }
            ].map(({ platform, name, icon, color, connectUrl, desc, isConnected }) => {
              // Platform information for this card
              return (
                <div
                  key={platform}
                  className="bg-[#23232A]/80 border border-[#35353B] rounded-xl p-4 flex items-center justify-between transition-all duration-200 hover:bg-[#2A2A2E]"
                >
                  {/* Left: Icon + Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {icon}
                    </div>
                    <span className="text-base font-medium text-white">{name}</span>
                  </div>
                  
                  {/* Right: Status/Button */}
                  {isConnected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 border border-green-700/50">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => window.location.href = connectUrl}
                      size="sm"
                      className="bg-[#F3F3F3] text-black hover:bg-white transition-colors px-4 py-2 text-sm font-medium rounded-lg"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Simple footer */}
          <div className="relative z-40 mt-8 text-center">
            <p className="text-xs text-[#6B7280] flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Your data is secure
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen px-2 sm:px-4 md:px-0" style={{ color: '#F3F3F3', position: 'relative' }}>
        {/* Overview Başlık ve Açıklama */}
        <div className="w-full max-w-6xl mx-auto mt-20 mb-2">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-4">BBLP Social Quests</h1>
            <p className="text-lg text-[#A1A1AA] mb-6 max-w-3xl mx-auto">
              Connect, engage, and earn exclusive rewards!
            </p>
          </div>
        </div>
        {blurOverlay}
        <div className={allDisconnected ? 'pointer-events-none select-none filter blur-sm opacity-60' : ''}>
          {/* Referral Stats Card */}
         
         

          {/* Connection Overview - Responsive Grid: Mobilde USDT üstte, XP+Points altta */}
          <div className="w-full max-w-6xl mx-auto -mb-5 mt-2 md:px-0">
            {/* Mobilde USDT üstte, Desktop'ta 3'ü yan yana */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-2">
              
              {/* USDT Card - Mobilde üstte, desktop'ta sonuncu */}
              <div className="order-1 lg:order-3 text-center p-4 bg-gradient-to-br from-yellow-200/10 to-yellow-100/5 rounded-2xl border border-yellow-200/20 flex flex-col items-center justify-center shadow-lg relative">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/5 to-transparent"></div>
                
                <div className="relative z-10">
                                  <div className="text-3xl lg:text-4xl font-bold mb-2 flex items-center justify-center gap-2">
                  <span className="text-yellow-200 text-2xl lg:text-3xl">{rewardType === 'usdt' ? '$' : ''}</span>
                  <span className="text-[#F3F3F3]">{getEstimatedReward}</span>
                  <span className="text-yellow-200 text-lg lg:text-xl ml-1">{rewardType === 'bblp' ? 'BBLP' : ''}</span>
                </div>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[#A1A1AA] text-sm lg:text-base font-medium">
                        Estimated {rewardType === 'usdt' ? 'USDT' : 'BBLP'} reward allocation
                      </p>
                      <span
                        className="ml-1 cursor-pointer relative"
                        onClick={() => setShowUSDTInfo((v) => !v)}
                        tabIndex={0}
                        onBlur={() => setShowUSDTInfo(false)}
                      >
                        <Info className="w-4 h-4 text-[#6B7280] hover:text-yellow-200 transition-colors" />
                        {showUSDTInfo && (
                          <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-[#23232A] border border-[#35353B] text-xs text-[#A1A1AA] shadow-lg break-words whitespace-normal right-0">
                            Estimated {rewardType === 'usdt' ? 'USDT' : 'BBLP'} allocation based on your activity: XP ({rewardType === 'usdt' ? '0.001' : '1'}%) + Points ({rewardType === 'usdt' ? '0.005' : '2.5'}%). Actual rewards may vary and are subject to platform terms.
                          </div>
                        )}
                      </span>
                    </div>
                    
                    {/* Toggle Buttons */}
                    <div className="flex gap-1 mt-2"> 
                      <button
                        onClick={() => setRewardType('usdt')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          rewardType === 'usdt'
                            ? 'bg-yellow-200 text-black'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        USDT
                      </button>
                      <button
                        onClick={() => setRewardType('bblp')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          rewardType === 'bblp'
                            ? 'bg-yellow-200 text-black'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        BBLP
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP ve Points container - Mobilde altta yan yana */}
              <div className="order-2 lg:order-1 lg:contents">
                <div className="grid grid-cols-2 lg:contents gap-2">
              {/* XP Card */}
              <div className="text-center p-2 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
                <div className="text-2xl font-bold text-[#F3F3F3] mb-2">{getTotalXP}</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <p className="text-[#A1A1AA] text-base">Your XP</p>
                  <span
                    className="ml-1 cursor-pointer relative"
                    onClick={() => setShowXPInfo((v) => !v)}
                    tabIndex={0}
                    onBlur={() => setShowXPInfo(false)}
                  >
                    <Info className="w-4 h-4 text-[#6B7280] hover:text-[#F3F3F3] transition-colors" />
                    {showXPInfo && (
                      <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-[#23232A] border border-[#35353B] text-xs text-[#A1A1AA] shadow-lg break-words whitespace-normal -left-20 ">
                        Experience Points unlock exclusive rewards, leaderboard rankings, mystery boxes with ETH/USDT/BNB, premium features, governance voting power, and future staking multipliers. Higher XP = Better rewards!
                      </div>
                    )}
                  </span>
                </div>
                {/* Show airdrop XP if available */}
                {airdropXP > 0 && (
                  <div className="text-xs text-yellow-400 border border-yellow-400/30 rounded px-2 py-1 bg-yellow-400/10">
                    +{airdropXP} Zealy.io XP
                  </div>
                )}
              </div>
              
                  {/* Points Card */}
                  <div className="text-center p-2 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
                    <div className="text-2xl font-bold text-[#F3F3F3] mb-2">{totalSocialPointsLoading ? '...' : totalSocialPoints}</div>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[#A1A1AA] text-base">Your Points</p>
                      <span
                        className="ml-1 cursor-pointer relative"
                        onClick={() => setShowPointsInfo((v) => !v)}
                        tabIndex={0}
                        onBlur={() => setShowPointsInfo(false)}
                      >
                        <Info className="w-4 h-4 text-[#6B7280] hover:text-[#F3F3F3] transition-colors" />
                        {showPointsInfo && (
                          <div className="absolute top-full mt-2 z-50 w-[80vw] sm:w-[200px] max-w-sm p-4 rounded bg-[#23232A] border border-[#35353B] text-xs text-[#A1A1AA] shadow-lg break-words whitespace-normal right-0 ">
                            Social Points are earned from completing daily quests and social tasks. 
                          </div>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Level Tasks Section */}
          <div className="max-w-6xl mx-auto mt-12 ">
            <div className="space-y-6">
              {/* Referral Links Section - NEW */}
              <div className="max-w-6xl mx-auto -mb-4">
                {/* Section Header */}
             
                
                
                
                {/* Referral Link Başlık ve Açıklama */}
               
                {/* Referral Link Card */}
                <div className="px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] flex flex-row items-stretch gap-2 mb-6">
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="text-xs text-yellow-400 font-semibold mb-1">Your Referral Link</div>
                    <div className="w-full bg-transparent text-[#F3F3F3] font-mono text-sm overflow-x-auto whitespace-nowrap">
                      {referralStats.referralCode?.code ? (
                        `https://bblip.io/?ref=${referralStats.referralCode.code}`
                      ) : (
                        'No referral link available'
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (referralStats.referralCode?.code) {
                        navigator.clipboard.writeText(`https://bblip.io/?ref=${referralStats.referralCode.code}`);
                        toast.success('Referral link copied to clipboard!');
                      } else {
                        toast.error('No referral link available');
                      }
                    }}
                    className="flex-shrink-0 bg-white text-black font-semibold rounded-lg px-4 py-2 ml-2 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 flex items-center justify-center h-full self-stretch"
                    style={{ minWidth: 44 }}
                  >
                    <span className="hidden md:inline">Copy Referral Link</span>
                    <svg className="w-5 h-5 md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Daily Check In Section */}
              <div className="max-w-6xl mx-auto">
                {/* Section Header */}
             
                
                {/* Daily Check In Card */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]">
                  <div className="flex flex-col min-w-[120px]">
                    <span className="text-xs text-[#F59E42] mb-1 font-semibold flex items-center gap-1 relative">
                      Daily Check In
                      <span
                        className="ml-1 cursor-pointer"
                        onClick={() => setShowInfo((v) => !v)}
                        tabIndex={0}
                        onBlur={() => setShowInfo(false)}
                      >
                        <Info className="w-3 h-3 text-[#F59E42]" />
                      </span>
                      {showInfo && (
                        <div className="absolute top-full mt-2 z-50 w-[85vw] min-w-[200px] max-w-sm p-4 rounded bg-[#23232A] border border-[#35353B] text-xs text-[#A1A1AA] shadow-lg break-words whitespace-normal">
                          Your daily earning is determined by your levels on connected social platforms.<br />The sum of your daily rewards from Telegram and Discord is shown here.
                        </div>
                      )}
                    </span>
                    <span className="text-xs mt-1">
                      <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent">
                        {getUserTotalDailyReward} Points
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    <Button
                      onClick={claimAllRewards}
                      disabled={!canClaimDailyReward || isClaiming}
                      size="sm"
                      className={`bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B] ${!canClaimDailyReward ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={{ boxShadow: 'none' }}
                    >
                      {isClaiming ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F3F3F3]"></div>
                          Claiming...
                        </div>
                      ) : (hasClaimableRewards ? (
                        <>
                          <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                          Claim Daily Rewards
                        </>
                      ) : getDiscordNextClaimCountdown() ? (
                        <>
                          <Clock className="w-4 h-4 mr-1 text-[#4ADE80]" />
                          Next claim in {getDiscordNextClaimCountdown()}
                        </>
                      ) : (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium  flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        </div>
                      ))}
                    </Button>
                    {shouldShowInviteWarning && (
                      <div className="text-xs text-red-400 mt-2">You need to invite at least one friend to claim your daily reward.</div>
                    )}
                  </div>
                </div>
              </div>
          
              {/* X Tasks Section (was Daily Tasks) */}
              <div className="max-w-6xl mx-auto mt-12">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 rounded bg-gradient-to-r from-[#1DA1F2] to-[#0EA5E9] mr-2" />
                  <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3] flex items-center gap-2">
                    Daily Tasks
                   
                  </h3>
                </div>
                <div className="text-sm text-[#A1A1AA] font-medium mb-4 pl-6 flex items-center gap-2">
                 Complete tasks to unlock bonus rewards and level up faster.
                </div>
                <div className="space-y-2">
                  {/* Daily Tasks List */}
                  {(() => {
                    // Filter out completed tasks
                    const incompleteTasks = dailyTasks.filter(task => !taskClaimed[task.id] && !task.claimed);
                    
                    // Check if all tasks are completed
                    const allTasksCompleted = dailyTasks.length > 0 && incompleteTasks.length === 0;
                    
                    if (allTasksCompleted) {
                      return (
                        <div className="flex items-center justify-center px-4 py-8 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]">
                          <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">All Daily Tasks Completed!</h3>
                            <p className="text-[#A1A1AA] text-sm">You have completed all available tasks for today. New tasks will be available soon!</p>
                          </div>
                        </div>
                      );
                    }
                    
                    return incompleteTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer hover:bg-[#23232A]"
                        onClick={() => window.open(task.link, '_blank', 'noopener,noreferrer')}
                      >
                        {/* Left: Title and Reward */}
                        <div className="flex flex-col min-w-[120px]">
                          <span className="text-xs text-[#1DA1F2] mb-1 font-semibold">{task.title}</span>
                          <span className="px-2 py-0.5 -mb-1 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent text-xs w-fit">
                            {task.reward} Points
                          </span>
                        </div>
                        {/* Right: Timer/Claim */}
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          {taskTimers[task.id] > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
                              {taskTimers[task.id]}s
                            </span>
                          ) : taskTimers[task.id] === 0 && !taskClaimed[task.id] && !task.claimed ? (
                            <button
                              className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-600 text-white hover:bg-orange-700"
                              onClick={e => { e.stopPropagation(); handleClaimTask(task); }}
                            >
                              Claim
                            </button>
                          ) : (
                            <button
                              className="px-2 py-0.5 text-xs font-medium text-zinc-400 flex items-center gap-1"
                              onClick={e => { e.stopPropagation(); startTaskTimer(task.id); window.open(task.link, '_blank', 'noopener,noreferrer'); }}
                              disabled={!!taskTimers[task.id]}
                              title="Start 60s timer"
                            >
                              <Repeat className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              {/* Onchain Tasks Section - NEW */}
              <div className="max-w-6xl mx-auto mt-12">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 rounded bg-[#10B981] mr-2" />
                  <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3]">Onchain Tasks</h3>
                  <Info className="w-4 h-4 text-[#A1A1AA]" />
                </div>
                <div className="text-xs text-[#10B981] font-semibold mb-4 pl-6">Stake BBLP tokens and earn rewards!</div>
                
                {/* Onchain Tasks List */}
                <div className="space-y-2">
                  {(() => {
                    const stakeTasks = [
                      { amount: 50, points: 50, label: 'Stake 50 BBLP' },
                      { amount: 100, points: 100, label: 'Stake 100 BBLP' },
                      { amount: 500, points: 500, label: 'Stake 500 BBLP' },
                      { amount: 1000, points: 1000, label: 'Stake 1000 BBLP' },
                      { amount: 2500, points: 2500, label: 'Stake 2500 BBLP' },
                      { amount: 3500, points: 3500, label: 'Stake 3500 BBLP' },
                    ];
                    
                    // Get total staked amount from wallet data
                    const totalStaked = parseFloat(combinedUserData?.stakedAmount || '0');
                    
                    return stakeTasks.map((task, index) => {
                      const isCompleted = totalStaked >= task.amount;
                      const isClaimed = claimedStakeTasks[task.amount]?.claimed || false;
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer"
                          onClick={() => window.location.href = '/stake'}
                        >
                          {/* Left: Task label and points */}
                          <div className="flex flex-col min-w-[120px]">
                            <span className="text-xs text-[#10B981] mb-1 font-semibold">{task.label}</span>
                            <span className="text-xs mt-1">
                              <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent">
                                {task.points} Points
                              </span>
                            </span>
                          </div>
                          {/* Center: Progress */}
                          <div className="flex-1 flex flex-col items-center justify-center px-2">
                            {isCompleted && (
                              <div className="w-full max-w-[160px] h-2 bg-[#23232A] rounded-full overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-[#10B981] transition-all duration-300"
                                  style={{ width: '100%' }}
                                ></div>
                              </div>
                            )}
                            {isCompleted && (
                              <span className="text-xs text-[#A1A1AA] mt-1">{task.amount}/{task.amount} BBLP</span>
                            )}
                          </div>
                          {/* Right: Status and claim button */}
                          <div className="flex flex-col items-end gap-1 min-w-[120px]">
                            {isClaimed ? (
                              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-[#4ADE80]">
                                <CheckCircle className="w-4 h-4 text-[#4ADE80]" />
                                Claimed
                              </span>
                            ) : isCompleted ? (
                              <Button
                                onClick={e => { e.stopPropagation(); handleClaimStakeTask(task.amount, task.points); }}
                                size="sm"
                                className="bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B]"
                              >
                                <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                                Claim {task.points} Points
                              </Button>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#23232A] text-[#A1A1AA]">
                                {totalStaked >= task.amount * 0.5 ? 'In Progress' : 'Stake requirement not met'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Telegram Level Tasks */}
              <div>
                {/* Telegram Level Tasks başlığı */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 rounded bg-[#60A5FA] mr-2" />
                  <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3]">Telegram XP Journey</h3>
                </div>
                <div className="text-xs text-[#60A5FA] font-semibold mb-4 pl-6">Level up your chat game and unlock exclusive rewards!</div>
                <div className="space-y-2">
                  {(() => {
                    const tasks = getLevelTasks('telegram');
                    const claimed = tasks.filter(t => t.isClaimed);
                    const unclaimed = tasks.filter(t => !t.isClaimed);
                    const allTasks = [...unclaimed, ...claimed];
                    return allTasks.map((task, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer`}
                        onClick={() => window.open('https://t.me/BblipProtocol_Annoucements', '_blank', 'noopener,noreferrer')}
                      >
                        {/* Sol: Seviye numarası ve adı */}
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex flex-col">
                            {/* Sadece açıklama */}
                            <span className="text-xs text-[#60A5FA] mb-1 font-semibold">{TELEGRAM_LEVEL_META[task.levelName]?.desc}</span>
                            {/* XP kutusu */}
                            <span className="text-xs mt-1">
                              <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent">
                                {task.xpRequired} XP
                              </span>
                            </span>
                          </div>
                        </div>
                        {/* Orta: Progress */}
                        <div className="flex-1 flex flex-col items-center justify-center px-2">
                          {task.inProgress && (
                            <div className="w-full max-w-[160px] h-2 bg-[#23232A] rounded-full overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-[#818CF8] transition-all duration-300"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          )}
                          {task.inProgress && (
                            <span className="text-xs text-[#A1A1AA] mt-1">{task.currentXP}/{task.xpRequired} XP</span>
                          )}
                        </div>
                        {/* Sağ: Durum ve buton */}
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          {task.isClaimed ? (
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold  text-[#4ADE80] ">
                              <CheckCircle className="w-4 h-4 text-[#4ADE80]" />
                            </span>
                          ) : task.completed ? (
                            <>
                              {task.canClaim && (
                                <Button
                                  onClick={e => { e.stopPropagation(); claimExtraReward('telegram', task.levelName); }}
                                  size="sm"
                                  className="bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B]"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                                  Claim {task.extraRewardXP} XP
                                </Button>
                              )}
                              {!task.canClaim && !task.rewardExists && (
                                <Button
                                  disabled
                                  size="sm"
                                  className="bg-[#35353B] text-[#A1A1AA] px-3 py-1 rounded-full text-xs font-semibold shadow-none cursor-not-allowed border-none"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#A1A1AA]" />
                                  Claim Reward
                                </Button>
                              )}
                            </>
                          ) :
                            <>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.inProgress
                                  ? 'bg-[#35353B] text-[#F3F3F3]'
                                  : 'bg-[#23232A] text-[#A1A1AA]'
                              }`}>
                                {task.inProgress ? 'In Progress' : 'Not Started'}
                              </span>
                              {task.inProgress && task.canClaim && (
                                <Button
                                  onClick={e => { e.stopPropagation(); claimExtraReward('telegram', task.levelName); }}
                                  size="sm"
                                  className="mt-1 bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B]"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                                  Claim {task.extraRewardXP} XP
                                </Button>
                              )}
                            </>
                          }
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              {/* Discord Level Tasks */}
              <div className="mt-8">
                {/* Discord Level Tasks başlığı */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 rounded bg-[#818CF8] mr-2" />
                  <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3]">Discord Power Levels</h3>
                </div>
                <div className="text-xs text-[#818CF8] font-semibold mb-4 pl-6">Boost your presence, climb the ranks, claim your perks!</div>
                <div className="space-y-2">
                  {(() => {
                    const tasks = getLevelTasks('discord');
                    const claimed = tasks.filter(t => t.isClaimed);
                    const unclaimed = tasks.filter(t => !t.isClaimed);
                    const allTasks = [...unclaimed, ...claimed];
                    return allTasks.map((task, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer`}
                        onClick={() => window.open('https://discord.gg/w982fWnhe9', '_blank', 'noopener,noreferrer')}
                      >
                        {/* Sol: Seviye numarası ve adı */}
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex flex-col">
                            {/* Sadece açıklama */}
                            <span className="text-xs text-[#818CF8] mb-1 font-semibold">{DISCORD_LEVEL_META[task.levelName]?.desc}</span>
                            {/* XP kutusu */}
                            <span className="text-xs mt-1">
                              <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent">
                                {task.xpRequired} XP
                              </span>
                            </span>
                          </div>
                        </div>
                        {/* Orta: Progress */}
                        <div className="flex-1 flex flex-col items-center justify-center px-2">
                          {task.inProgress && (
                            <div className="w-full max-w-[160px] h-2 bg-[#23232A] rounded-full overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-[#818CF8] transition-all duration-300"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          )}
                          {task.inProgress && (
                            <span className="text-xs text-[#A1A1AA] mt-1">{task.currentXP}/{task.xpRequired} XP</span>
                          )}
                        </div>
                        {/* Sağ: Durum ve buton */}
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          {task.isClaimed ? (
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold  text-[#4ADE80] ">
                              <CheckCircle className="w-4 h-4 text-[#4ADE80]" />
                            </span>
                          ) : task.completed ? (
                            <>
                              {task.canClaim && (
                                <Button
                                  onClick={e => { e.stopPropagation(); claimExtraReward('discord', task.levelName); }}
                                  size="sm"
                                  className="bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B]"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                                  Claim {task.extraRewardXP} XP
                                </Button>
                              )}
                              {!task.canClaim && !task.rewardExists && (
                                <Button
                                  disabled
                                  size="sm"
                                  className="bg-[#35353B] text-[#A1A1AA] px-3 py-1 rounded-full text-xs font-semibold shadow-none cursor-not-allowed border-none"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#A1A1AA]" />
                                  Claim Reward
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.inProgress
                                  ? 'bg-[#35353B] text-[#F3F3F3]'
                                  : 'bg-[#23232A] text-[#A1A1AA]'
                              }`}>
                                {task.inProgress ? 'In Progress' : 'Not Started'}
                              </span>
                              {task.inProgress && task.canClaim && (
                                <Button
                                  onClick={e => { e.stopPropagation(); claimExtraReward('discord', task.levelName); }}
                                  size="sm"
                                  className="mt-1 bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B]"
                                >
                                  <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                                  Claim {task.extraRewardXP} XP
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                {/* Invite Friends Milestones */}
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-6 rounded bg-yellow-400 mr-2" />
                    <h3 className="text-2xl font-extrabold tracking-tight text-white">Invite Friends Milestones</h3>
                  </div>
                  <div className="text-xs text-yellow-400 font-semibold mb-4 pl-6">Invite friends and earn points for each milestone!</div>
                  <div className="space-y-2">
                    {(() => {
                      const milestones = [
                        { count: 1, points: 5, label: 'Invite your first friend' },
                        { count: 3, points: 15, label: 'Invite 3 friends' },
                        { count: 5, points: 30, label: 'Invite 5 friends' },
                        { count: 10, points: 60, label: 'Invite 10 friends' },
                        { count: 50, points: 150, label: 'Invite 50 friends' },
                        { count: 100, points: 300, label: 'Invite 100 friends' },
                        { count: 250, points: 750, label: 'Invite 250 friends' },
                        { count: 500, points: 1500, label: 'Invite 500 friends' },
                        { count: 1000, points: 3000, label: 'Invite 1000 friends' },
                        { count: 2000, points: 6000, label: 'Invite 2000 friends' },
                        { count: 5000, points: 15000, label: 'Invite 5000 friends' },
                     
                      ];
                      const current = referralStats.totalReferrals || 0;
                      const claimed = (milestone: any) => claimedMilestones.includes(milestone.count);
                      // Split milestones into completed and not completed
                      const completedMilestones = milestones.filter(claimed);
                      const inProgressMilestones = milestones.filter(m => !claimed(m));
                      // Find the first in-progress or claimable milestone
                      let currentIndex = inProgressMilestones.findIndex(m => current < m.count || current === m.count);
                      if (currentIndex === -1 && inProgressMilestones.length > 0) currentIndex = 0;
                      // Show in-progress/claimable first, then completed
                      const ordered = [...inProgressMilestones, ...completedMilestones];
                      return ordered.map((milestone, idx) => {
                        const milestoneCompleted = current >= milestone.count;
                        const milestoneClaimed = claimed(milestone);
                        const isCurrent = idx === currentIndex && idx < inProgressMilestones.length;
                        const progress = Math.min((current / milestone.count) * 100, 100);
                        // Unified card style for all (no yellow bg/border)
                        let cardClass = 'flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]';
                        return (
                          <div
                            key={milestone.count}
                            className={cardClass}
                          >
                            {/* Left: Milestone label */}
                            <div className="flex flex-col min-w-[120px]">
                              <span className="text-xs text-yellow-400 mb-1 font-semibold">{milestone.label}</span>
                              <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent text-xs w-fit">
                                {milestone.points} Points
                              </span>
                            </div>
                            {/* Center: Progress bar only for current */}
                            <div className="flex-1 flex flex-col items-center justify-center px-2">
                              {isCurrent && !milestoneClaimed && (
                                <>
                                  <div className="w-full max-w-[160px] h-2 bg-[#23232A] rounded-full overflow-hidden">
                                    <div
                                      className="h-2 rounded-full bg-yellow-400 transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-[#A1A1AA] mt-1">{Math.min(current, milestone.count)}/{milestone.count}</span>
                                </>
                              )}
                            </div>
                            {/* Right: Status/Claim */}
                            <div className="flex flex-col items-end gap-1 min-w-[120px]">
                              {milestoneClaimed ? (
                                <span className="flex items-center gap-2 px-3 py-1  text-xs font-semibold ">
                                  <CheckCircle className="w-4 h-4 " /> 
                                </span>
                              ) : milestoneCompleted ? (
                                <Button
                                  size="sm"
                                  className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-yellow-400"
                                  disabled={claimingMilestone === milestone.count}
                                  onClick={() => handleClaimInviteMilestone(milestone.count, milestone.points)}
                                >
                                  {claimingMilestone === milestone.count ? 'Claiming...' : 'Claim'}
                                </Button>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#23232A] text-[#A1A1AA]">
                                  In Progress
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Refresh Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={checkAllConnections}
            disabled={isLoading}
            variant="outline"
            className="border-[#35353B] text-[#F3F3F3] hover:bg-[#23232A]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F3F3F3]"></div>
                Checking...
              </div>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2 text-[#F3F3F3]" />
                Refresh Connections
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
} 