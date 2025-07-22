"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check
} from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { referralService, userService } from '@/lib/supabase';
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
  
  // Combine data from both networks
  const combinedUserData = {
    ...bscUserData,
    stakedAmount: (parseFloat(bscUserData?.stakedAmount || '0') + parseFloat(ethUserData?.stakedAmount || '0')).toString(),
    pendingRewards: (parseFloat(bscUserData?.pendingRewards || '0') + parseFloat(ethUserData?.pendingRewards || '0')).toString(),
    stakes: [...(bscUserData?.stakes || []), ...(ethUserData?.stakes || [])]
  };
  
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

  // Sonsuz loading önleyici: kısa süre loading, sonra fallback
  const [showLoading, setShowLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
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

  // Toplam ödül bilgisini çek
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

  // Check all social connections
  const checkAllConnections = async () => {
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
            dailyReward: xData?.dailyReward || 0
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
  };

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

  // Start timer for a task
  const startTaskTimer = (taskId: number) => {
    if (taskTimers[taskId]) return; // already running
    setTaskTimers(prev => ({ ...prev, [taskId]: 60 }));
  };

  // Replace all separate connection fetches with a single fast fetch
  useEffect(() => {
    if (!isConnected || !address) return;
    checkAllConnections();
  }, [isConnected, address]);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/admin/dailytasks?user_id=${address}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setDailyTasks(data.tasks || []);
      });
    // No return value
  }, [address]);

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

  // Claim handler
  const handleClaimTask = async (task: DailyTask) => {
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
  };

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

  const getConnectedCount = () => {
    return Object.values(connections).filter(conn => conn.isConnected).length;
  };

  const getTotalRewards = () => {
    let total = 0;
    if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
      total += connections.telegram.stats?.dailyReward || 0;
    }
    if (connections.discord.isConnected && connections.discord.canClaimReward) {
      total += connections.discord.stats?.dailyReward || 0;
    }
    return total;
  };

  const getTotalXP = () => {
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
      totalXP
    });
    
    return totalXP;
  };

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

  const hasClaimableRewards = () => {
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
  };

  const claimAllRewards = async () => {
    if (!address || !hasClaimableRewards()) return;

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
        toast.success(`Başarıyla alındı: ${claimedRewards.join(', ')}`);
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
  };

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

  // Helper to get user's total daily reward (not just claimable)
  const getUserTotalDailyReward = () => {
    let total = 0;
    if (connections.telegram.isConnected) {
      total += connections.telegram.stats?.dailyReward || 0;
    }
    if (connections.discord.isConnected) {
      total += connections.discord.stats?.dailyReward || 0;
    }
    return total;
  };

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

  // Fetch claimed invite milestones
  useEffect(() => {
    const fetchClaimedMilestones = async () => {
      if (!address) return;
      try {
        const res = await fetch(`/api/invite-rewards/status?walletAddress=${address}`);
        const data = await res.json();
        if (data.claimed) setClaimedMilestones(data.claimed);
        else setClaimedMilestones([]);
      } catch {
        setClaimedMilestones([]);
      }
    };
    if (isConnected && address) {
      fetchClaimedMilestones();
    }
  }, [isConnected, address]);

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

  // Helper: check if all platforms are disconnected
  const allDisconnected = !connections.x.isConnected && !connections.telegram.isConnected && !connections.discord.isConnected;
  // Helper: check if all platforms are connected
  const allConnected = connections.x.isConnected && connections.telegram.isConnected && connections.discord.isConnected;

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

  // Fetch claimed staking tasks
  useEffect(() => {
    const fetchClaimedStakeTasks = async () => {
      if (!address) return;
      setStakingTasksLoading(true);
      try {
        const res = await fetch(`/api/staking-tasks/status?walletAddress=${address}`);
        const data = await res.json();
        if (data.success) {
          setClaimedStakeTasks(data.claimedTasks);
        }
      } catch (error) {
        console.error('Error fetching staking tasks:', error);
        setClaimedStakeTasks({});
      } finally {
        setStakingTasksLoading(false);
      }
    };
    if (isConnected && address) {
      fetchClaimedStakeTasks();
    }
  }, [isConnected, address]);

  // Invite your first friend tamam mı?
  const hasInvitedFirstFriend = claimedMilestones.includes(1);

  // Günlük ödül claim butonu aktif mi?
  const canClaimDailyReward = hasClaimableRewards() && hasInvitedFirstFriend;
  const shouldShowInviteWarning = hasClaimableRewards() && !hasInvitedFirstFriend;

  // --- MOBİLDE SADECE BUTONLAR ---
  // CSS'i head'e ekle
  if (typeof window !== 'undefined') {
    const styleId = 'social-connections-mobile-hide-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @media (max-width: 640px) {
          .hide-on-mobile-inner { display: none !important; }
          .only-mobile-flex { display: flex !important; flex-direction: column; align-items: center; gap: 8px; }
          .only-mobile-w-full { width: 100% !important; }
          .mobile-card-compact { padding: 12px !important; border-radius: 12px !important; margin-bottom: 10px !important; }
          .mobile-btn-compact { padding-top: 10px !important; padding-bottom: 10px !important; font-size: 1rem !important; border-radius: 8px !important; }
          .mobile-hero-compact { font-size: 1.1rem !important; margin-bottom: 0.5rem !important; margin-top: 1.5rem !important; text-align: center !important; font-weight: 700 !important; }
          .mobile-hero-desc { font-size: 0.95rem !important; color: #A1A1AA !important; margin-bottom: 1.2rem !important; text-align: center !important; font-weight: 400 !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Yeni: Sosyal bağlantıların yüklenip yüklenmediğini kontrol et
  const isConnectionsLoading = isLoading; // isLoading zaten bağlantı fetch edilirken true

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
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-md bg-[#181C23] border border-[#232A36] rounded-2xl shadow-2xl px-4 py-6 flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center mb-2">
              <div className="text-center text-lg sm:text-xl font-bold text-white mb-1">Connect Wallet </div>
              <div className="text-center text-sm text-[#A1A1AA] mb-0">
                Please connect your wallet 
              </div>
            </div>
            <div className="w-full flex flex-col items-center mt-2">
              <Button
                size="lg"
                variant="default"
                onClick={() => setShowWalletModal(true)}
                className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl px-6 font-medium shadow-md w-full max-w-[180px] mt-2"
              >
                Connect Wallet
              </Button>
              <WalletModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
            </div>
          </div>
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative" style={{ background: '#18181B' }}>
        {/* Overlay */}
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        {/* Motivational Explanation */}
        <div className="relative z-50 flex flex-col items-center justify-center w-full mb-8">
          <div className="text-2xl font-bold text-white text-center mb-2 px-4 mobile-hero-compact">Connect your accounts !</div>
          <div className="text-base text-[#A1A1AA] text-center px-4 mb-2 mobile-hero-desc">Connect X, Telegram, and Discord to unlock all features and maximize rewards.</div>
        </div>
        {/* Connect Cards */}
        <div className="relative z-50 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 px-4 only-mobile-flex">
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
              // Yeni: Küçük ikon ve kısa açıklama
              let compactIcon, compactTitle, compactDesc;
              if (platform === 'x') {
                compactIcon = <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#1DA1F2"><path d="M32 6.076a13.14 13.14 0 0 1-3.769 1.031A6.601 6.601 0 0 0 31.115 4.1a13.195 13.195 0 0 1-4.169 1.594A6.563 6.563 0 0 0 22.155 2c-3.626 0-6.563 2.938-6.563 6.563 0 .514.058 1.016.17 1.496C10.303 9.87 5.47 7.38 2.228 3.671a6.544 6.544 0 0 0-.888 3.3c0 2.277 1.159 4.287 2.924 5.464a6.533 6.533 0 0 1-2.975-.822v.083c0 3.18 2.263 5.833 5.267 6.437a6.575 6.575 0 0 1-2.968.112c.837 2.614 3.263 4.516 6.142 4.567A13.18 13.18 0 0 1 0 27.026 18.616 18.616 0 0 0 10.063 30c12.072 0 18.681-10.002 18.681-18.682 0-.285-.007-.568-.02-.85A13.354 13.354 0 0 0 32 6.076z"/></svg>;
                compactTitle = 'X (Twitter)';
                compactDesc = 'Connect your X account.';
              } else if (platform === 'telegram') {
                compactIcon = <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#229ED9"><path d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16zm6.406-21.406l-2.75 12.969c-.207.93-.75 1.156-1.519.72l-4.188-3.094-2.022 1.947c-.223.223-.41.41-.84.41l.299-4.23 7.688-6.938c.334-.299-.073-.465-.517-.166l-9.5 5.98-4.094-1.281c-.889-.277-.906-.889.186-1.316l16.031-6.188c.748-.277 1.406.166 1.166 1.314z"/></svg>;
                compactTitle = 'Telegram';
                compactDesc = 'Connect your Telegram account.';
              } else {
                compactIcon = <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#5865F2"><path d="M27.2 6.8A26.9 26.9 0 0 0 20.5 4a1 1 0 0 0-.5.1c-.2.1-.3.3-.3.5l-.3 1.2a24.2 24.2 0 0 0-7.8 0l-.3-1.2a.7.7 0 0 0-.3-.5A1 1 0 0 0 11.5 4a26.9 26.9 0 0 0-6.7 2.8c-.2.1-.3.3-.3.5C2.1 13.1 1.2 19.2 2.1 25.2c0 .2.2.4.4.5A27.2 27.2 0 0 0 11.5 28a1 1 0 0 0 .5-.1c.2-.1.3-.3.3-.5l.3-1.2a24.2 24.2 0 0 0 7.8 0l.3 1.2c.1.2.2.4.3.5a1 1 0 0 0 .5.1 27.2 27.2 0 0 0 8.9-2.3c.2-.1.4-.3.4-.5.9-6 .1-12.1-1.7-17.9a.7.7 0 0 0-.3-.5zM11.1 20.2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9.8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>;
                compactTitle = 'Discord';
                compactDesc = 'Connect your Discord account.';
              }
              return (
                <div
                  key={platform}
                  className="bg-[#23232A] border border-[#35353B] rounded-2xl shadow-xl p-8 flex flex-col items-center transition-transform duration-200 hover:scale-105 hover:shadow-2xl only-mobile-w-full mobile-card-compact"
                >
                  {/* Başlık ve ikon satırı */}
                  <div className="w-full flex items-center justify-center mb-1">
                    {compactIcon}
                    <span className="text-lg font-bold text-white">{compactTitle}</span>
                  </div>
                  {/* Açıklama */}
                  <div className="w-full text-center text-xs text-[#A1A1AA] mb-3">{compactDesc}</div>
                  {/* Buton */}
                  {isConnected ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-green-900/30 text-green-400 border border-green-700 mobile-btn-compact">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      Connected
                    </div>
                  ) : (
                    <Button
                      onClick={() => window.location.href = connectUrl}
                      className="w-full py-2 rounded-lg font-semibold transition  flex items-center justify-center gap-2 mobile-btn-compact"
                    >
                      Connect {compactTitle}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col items-center mt-8 hide-on-mobile-inner">
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs">
              <svg className="w-4 h-4" fill="none" stroke="#A1A1AA" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105.895-2 2-2s2 .895 2 2-.895 2-2 2-2-.895-2-2zm0 0V7m0 4v4m0 0c-4.418 0-8-1.79-8-4V7a2 2 0 012-2h2.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293h2.172a1 1 0 00.707-.293l1.414-1.414A1 1 0 0117.414 5H20a2 2 0 012 2v4c0 2.21-3.582 4-8 4z"/></svg>
              <span>Your data is safe</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen px-2 sm:px-4 md:px-0" style={{ color: '#F3F3F3', position: 'relative' }}>
        {/* Overview Başlık ve Açıklama */}
        <div className="w-full max-w-6xl mx-auto mt-20 mb-2">
          <h1 className="text-3xl font-bold text-white mb-2">Social Connections Overview</h1>
          <p className="text-base text-[#A1A1AA]">Being active in our community. The more you engage, the more you earn!</p>
        </div>
        {blurOverlay}
        <div className={allDisconnected ? 'pointer-events-none select-none filter blur-sm opacity-60' : ''}>
          {/* Referral Stats Card */}
         
         

          {/* Connection Overview - Responsive Grid: Estimated üstte tam genişlikte, altta iki kart yan yana */}
          <div className="w-full max-w-6xl mx-auto mb-10 grid mt-2 grid-cols-2 gap-2 md:px-0">
            {/* Estimated BBLP Reward Kartı */}
            <div className="col-span-2 text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                {totalSocialPointsLoading ? '...' : ((getTotalXP() + totalSocialPoints) * 0.02).toLocaleString(undefined, { maximumFractionDigits: 2 })} BBLP
              </div>
              <p className="text-[#A1A1AA] text-base">Estimated BBLP Reward </p>
            </div>
            <div className="text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-[#F3F3F3] mb-2">{getTotalXP()} XP</div>
              <p className="text-[#A1A1AA] text-base">Total XP</p>
            </div>
            <div className="text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-[#F3F3F3] mb-2">{totalSocialPointsLoading ? '...' : totalSocialPoints}</div>
              <p className="text-[#A1A1AA] text-base">Total Social Points</p>
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
                        <div className="absolute  top-full mt-2 z-50 w-[85vw] min-w-[200px] max-w-sm  p-4 rounded bg-[#23232A] border border-[#35353B] text-xs text-[#A1A1AA] shadow-lg break-words whitespace-normal">
                          Your daily earning is determined by your levels on connected social platforms.<br />The sum of your daily rewards from Telegram and Discord is shown here.
                        </div>
                      )}
                    </span>
                    <span className="text-xs mt-1">
                      <span className="px-2 py-0.5 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent">
                        {getUserTotalDailyReward()} BBLP
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
                      ) : (hasClaimableRewards() ? (
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
                  <div className="w-1.5 h-6 rounded bg-[#1DA1F2] mr-2" />
                  <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3]">X Tasks</h3>
                </div>
                <div className="text-xs text-[#1DA1F2] font-semibold mb-4 pl-6">Complete X tasks and claim your rewards!</div>
                <div className="space-y-2">
                  {/* Daily Tasks List */}
                  {dailyTasks.length > 0 && dailyTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer hover:bg-[#23232A]"
                      onClick={() => window.open(task.link, '_blank', 'noopener,noreferrer')}
                    >
                      {/* Left: Title and Reward */}
                      <div className="flex flex-col min-w-[120px]">
                        <span className="text-xs text-[#1DA1F2] mb-1 font-semibold">{task.title}</span>
                        <span className="px-2 py-0.5 -mb-1 border border-[#35353B] rounded-md text-[#A1A1AA] font-medium bg-transparent text-xs w-fit">
                          {task.reward} BBLP
                        </span>
                      </div>
                      {/* Right: Claimed Status or Timer/Claim */}
                      <div className="flex flex-col items-end gap-1 min-w-[120px]">
                        {taskClaimed[task.id] || task.claimed ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium  flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> 
                          </span>
                        ) : taskTimers[task.id] > 0 ? (
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
                  ))}
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
                          className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]"
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
                                onClick={() => handleClaimStakeTask(task.amount, task.points)}
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
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]`}
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
                                  onClick={() => claimExtraReward('telegram', task.levelName)}
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
                                  onClick={() => claimExtraReward('telegram', task.levelName)}
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
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A]`}
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
                                  onClick={() => claimExtraReward('discord', task.levelName)}
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
                                  onClick={() => claimExtraReward('discord', task.levelName)}
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
                        { count: 1, points: 50, label: 'Invite your first friend' },
                        { count: 3, points: 75, label: 'Invite 3 friends' },
                        { count: 5, points: 150, label: 'Invite 5 friends' },
                        { count: 10, points: 350, label: 'Invite 10 friends' },
                        { count: 50, points: 600, label: 'Invite 50 friends' },
                        { count: 100, points: 1200, label: 'Invite 100 friends' },
                        { count: 1000, points: 1500, label: 'Invite 1000 friends' },
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