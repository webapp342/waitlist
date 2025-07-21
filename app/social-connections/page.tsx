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

  // Check all social connections
  const checkAllConnections = async () => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    
    try {
      // Check X connection
      const xResponse = await fetch('/api/x/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      if (xResponse.ok) {
        const xData = await xResponse.json();
        setConnections(prev => ({
          ...prev,
          x: {
            isConnected: xData.connected,
            platform: 'x',
            username: xData.xUser?.username,
            avatarUrl: xData.xUser?.profile_image_url,
            verified: xData.xUser?.verified,
            stats: {
              followers: xData.xUser?.followers_count,
              messages: xData.xUser?.tweet_count
            }
          }
        }));
      }

      // Check Telegram connection
      const telegramResponse = await fetch(`/api/telegram/stats?walletAddress=${address}`);
      let telegramData: any;
      if (telegramResponse.ok) {
        telegramData = await telegramResponse.json();
        setConnections(prev => ({
          ...prev,
          telegram: {
            isConnected: telegramData.isConnected,
            platform: 'telegram',
            username: telegramData.username,
            canClaimReward: telegramData.canClaimReward,
            stats: {
              messages: telegramData.messageCount,
              xp: telegramData.totalXP,
              level: `Level ${telegramData.currentLevel}`,
              dailyReward: telegramData.dailyReward
            }
          }
        }));
      }

      // Check Discord connection
      const discordResponse = await fetch(`/api/discord/stats?walletAddress=${address}`);
      let discordData: any;
      if (discordResponse.ok) {
        discordData = await discordResponse.json();
        setConnections(prev => ({
          ...prev,
          discord: {
            isConnected: discordData.isConnected,
            platform: 'discord',
            username: discordData.username,
            avatarUrl: discordData.avatarUrl,
            verified: discordData.verified,
            canClaimReward: discordData.canClaimReward,
            discordId: discordData.discordId,
            stats: {
              messages: discordData.messageCount,
              xp: discordData.totalXP,
              level: discordData.currentLevel,
              dailyReward: discordData.dailyReward,
              lastClaimedAt: discordData.lastClaimedAt // add this
            }
          }
        }));

        // Check extra rewards for Discord
        if (discordData.isConnected) {
          await checkExtraRewards('discord', discordData.totalXP);
        }
      }

      // Telegram için extra reward kontrolü, yeni XP ile
      if (telegramData && telegramData.isConnected) {
        await checkExtraRewards('telegram', telegramData.totalXP);
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
    const fetchAllConnections = async () => {
      try {
        const res = await fetch(`/api/social-connections/status?walletAddress=${address}`);
        const data = await res.json();
        setConnections({
          x: {
            isConnected: !!data.x?.connected,
            platform: 'x',
            username: data.x?.username || undefined,
            stats: {
              xp: data.x?.xp || 0,
              level: data.x?.level || 0,
              dailyReward: data.x?.dailyReward || 0
            }
          },
          telegram: {
            isConnected: !!data.telegram?.connected,
            platform: 'telegram',
            username: data.telegram?.username || undefined,
            stats: {
              xp: data.telegram?.xp || 0,
              level: data.telegram?.level || 0,
              dailyReward: data.telegram?.dailyReward || 0
            }
          },
          discord: {
            isConnected: !!data.discord?.connected,
            platform: 'discord',
            username: data.discord?.username || undefined,
            stats: {
              xp: data.discord?.xp || 0,
              level: data.discord?.level || 0,
              dailyReward: data.discord?.dailyReward || 0
            }
          }
        });
      } catch (e) {
        setConnections({
          x: { isConnected: false, platform: 'x' },
          telegram: { isConnected: false, platform: 'telegram' },
          discord: { isConnected: false, platform: 'discord' }
        });
      }
    };
    fetchAllConnections();
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
    
    console.log('Claimable Rewards Debug:', {
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
      totalClaimable: telegramClaimable || discordClaimable
    });
    
    return telegramClaimable || discordClaimable;
  };

  const claimAllRewards = async () => {
    if (!address || !hasClaimableRewards()) return;

    setIsClaiming(true);
    const claimedRewards = [];

    try {
      // Claim Telegram reward if available
      if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
        try {
          const response = await fetch('/api/telegram/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address }),
          });

          if (response.ok) {
            const data = await response.json();
            claimedRewards.push(`Telegram: ${data.reward.amount} BBLP`);
          }
        } catch (error) {
          console.error('Error claiming Telegram reward:', error);
        }
      }

      // Claim Discord reward if available
      if (connections.discord.isConnected && connections.discord.canClaimReward) {
        try {
          const response = await fetch('/api/discord/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              discordId: connections.discord.discordId 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            claimedRewards.push(`Discord: ${data.rewardAmount} BBLP`);
          }
        } catch (error) {
          console.error('Error claiming Discord reward:', error);
        }
      }

      if (claimedRewards.length > 0) {
        toast.success(`Successfully claimed: ${claimedRewards.join(', ')}`);
        // Refresh connections to update claim status
        await checkAllConnections();
      } else {
        toast.error('No rewards available to claim');
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error('Failed to claim rewards');
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

  // Helper to get next claim time (24h after lastClaimedAt)
  const getNextClaimTime = () => {
    const last = connections.discord.stats?.lastClaimedAt;
    if (!last) return null;
    const lastDate = new Date(last);
    return new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
  };

  const getCountdown = () => {
    const next = getNextClaimTime();
    if (!next) return null;
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center">Connect Wallet First</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Please connect your wallet to manage social connections
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
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
          <div className="text-2xl font-bold text-white text-center mb-2">Connect all your social accounts to continue and start farming points!</div>
          <div className="text-base text-[#A1A1AA] text-center max-w-xl mb-8">You need to connect your X, Telegram, and Discord accounts to unlock all features and maximize your rewards. Please connect all platforms to proceed.</div>
        </div>
        {/* Connect Cards */}
        <div className="relative z-50 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 px-4">
            {[
              {
                platform: 'x',
                name: 'X (Twitter)',
                icon: <svg viewBox="0 0 32 32" className="w-12 h-12 mb-4" fill="#1DA1F2"><path d="M32 6.076a13.14 13.14 0 0 1-3.769 1.031A6.601 6.601 0 0 0 31.115 4.1a13.195 13.195 0 0 1-4.169 1.594A6.563 6.563 0 0 0 22.155 2c-3.626 0-6.563 2.938-6.563 6.563 0 .514.058 1.016.17 1.496C10.303 9.87 5.47 7.38 2.228 3.671a6.544 6.544 0 0 0-.888 3.3c0 2.277 1.159 4.287 2.924 5.464a6.533 6.533 0 0 1-2.975-.822v.083c0 3.18 2.263 5.833 5.267 6.437a6.575 6.575 0 0 1-2.968.112c.837 2.614 3.263 4.516 6.142 4.567A13.18 13.18 0 0 1 0 27.026 18.616 18.616 0 0 0 10.063 30c12.072 0 18.681-10.002 18.681-18.682 0-.285-.007-.568-.02-.85A13.354 13.354 0 0 0 32 6.076z"/></svg>,
                color: '#1DA1F2',
                connectUrl: '/x',
                desc: 'Connect your X account to earn social rewards.',
                isConnected: connections.x.isConnected
              },
              {
                platform: 'telegram',
                name: 'Telegram',
                icon: <svg viewBox="0 0 32 32" className="w-12 h-12 mb-4" fill="#229ED9"><path d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16zm6.406-21.406l-2.75 12.969c-.207.93-.75 1.156-1.519.72l-4.188-3.094-2.022 1.947c-.223.223-.41.41-.84.41l.299-4.23 7.688-6.938c.334-.299-.073-.465-.517-.166l-9.5 5.98-4.094-1.281c-.889-.277-.906-.889.186-1.316l16.031-6.188c.748-.277 1.406.166 1.166 1.314z"/></svg>,
                color: '#229ED9',
                connectUrl: '/telegram',
                desc: 'Connect your Telegram account to earn community rewards.',
                isConnected: connections.telegram.isConnected
              },
              {
                platform: 'discord',
                name: 'Discord',
                icon: <svg viewBox="0 0 32 32" className="w-12 h-12 mb-4" fill="#5865F2"><path d="M27.2 6.8A26.9 26.9 0 0 0 20.5 4a1 1 0 0 0-.5.1c-.2.1-.3.3-.3.5l-.3 1.2a24.2 24.2 0 0 0-7.8 0l-.3-1.2a.7.7 0 0 0-.3-.5A1 1 0 0 0 11.5 4a26.9 26.9 0 0 0-6.7 2.8c-.2.1-.3.3-.3.5C2.1 13.1 1.2 19.2 2.1 25.2c0 .2.2.4.4.5A27.2 27.2 0 0 0 11.5 28a1 1 0 0 0 .5-.1c.2-.1.3-.3.3-.5l.3-1.2a24.2 24.2 0 0 0 7.8 0l.3 1.2c.1.2.2.4.3.5a1 1 0 0 0 .5.1 27.2 27.2 0 0 0 8.9-2.3c.2-.1.4-.3.4-.5.9-6 .1-12.1-1.7-17.9a.7.7 0 0 0-.3-.5zM11.1 20.2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9.8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>,
                color: '#5865F2',
                connectUrl: '/discord',
                desc: 'Connect your Discord account to earn community rewards.',
                isConnected: connections.discord.isConnected
              }
            ].map(({ platform, name, icon, color, connectUrl, desc, isConnected }) => (
              <div
                key={platform}
                className="bg-[#23232A] border border-[#35353B] rounded-2xl shadow-xl p-8 flex flex-col items-center transition-transform duration-200 hover:scale-105 hover:shadow-2xl"
              >
                {icon}
                <div className="text-xl font-bold text-white mb-2">{name}</div>
                <div className="text-sm text-[#A1A1AA] mb-4 text-center">{desc}</div>
                {isConnected ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-green-900/30 text-green-400 border border-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Connected
                  </div>
                ) : (
                  <Button
                    onClick={() => window.location.href = connectUrl}
                    className="w-full py-2 rounded-lg font-semibold transition bg-[#28282D] hover:bg-[#35353B] flex items-center justify-center gap-2"
                  >
                    Connect {name}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center mt-8">
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
    <div className="min-h-screen" style={{ background: '#18181B', color: '#F3F3F3', position: 'relative' }}>
      {blurOverlay}
      <div className={allDisconnected ? 'pointer-events-none select-none filter blur-sm opacity-60' : ''}>
        {/* Referral Stats Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-[#222226] border-[#2A2A2E]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="w-6 h-6 text-yellow-400" />
                Referral Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralLoading ? (
                <div className="text-center py-6 text-gray-400">Loading referral info...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-[#23232A] rounded-lg">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {referralStats.totalReferrals}
                    </div>
                    <p className="text-[#A1A1AA]">Total Referrals</p>
                  </div>
                  <div className="text-center p-4 bg-[#23232A] rounded-lg">
                    <div className="text-base break-all font-mono font-bold text-yellow-400 mb-2">
                      {referralStats.referralCode?.code ? (
                        <span>https://bblip.io/?ref={referralStats.referralCode.code}</span>
                      ) : (
                        <span>No referral link</span>
                      )}
                    </div>
                    <p className="text-[#A1A1AA]">Your Referral Link</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: '#F3F3F3' }}>
            Social Connections
          </h1>
          <p className="text-xl" style={{ color: '#A1A1AA' }}>
            Connect your social media accounts to maximize your rewards and community engagement
          </p>
        </div>

        {/* Connection Overview */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-[#222226] border-[#2A2A2E]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#F3F3F3]" />
                Connection Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-[#23232A] rounded-lg">
                  <div className="text-3xl font-bold text-[#F3F3F3] mb-2">
                    {getTotalXP()} XP
                  </div>
                  <p className="text-[#A1A1AA]">Total XP</p>
                </div>
                <div className="text-center p-4 bg-[#23232A] rounded-lg">
                  <div className="text-3xl font-bold text-[#F3F3F3] mb-2">
                    {getConnectedCount()} / 3
                  </div>
                  <p className="text-[#A1A1AA]">Platforms Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['x', 'telegram', 'discord'] as const).map((platform) => {
            const connection = connections[platform];
            const platformInfo = getPlatformInfo(platform);
            const IconComponent = platformInfo.icon;

            return (
              <Card key={platform} className="bg-[#222226] border-[#2A2A2E]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <IconComponent className="w-6 h-6 text-[#F3F3F3]" />
                    {platformInfo.name}
                  </CardTitle>
                  <CardDescription className="text-[#A1A1AA]">
                    {platformInfo.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {connection.isConnected ? (
                    <div className="space-y-4">
                      {/* Connected Status */}
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-[#4ADE80]" />
                        <span className="font-semibold text-[#4ADE80]">Connected</span>
                      </div>
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-[#F3F3F3]">{connection.username}</p>
                          {connection.verified && (
                            <Badge className="bg-[#35353B] text-xs text-[#A1A1AA] border-none">Verified</Badge>
                          )}
                        </div>
                      </div>
                      {/* Stats */}
                      {connection.stats && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="text-center p-2 bg-[#23232A] rounded">
                            <p className="text-lg font-bold text-[#F3F3F3]">
                              {connection.stats.xp}
                            </p>
                            <p className="text-xs text-[#A1A1AA]">XP</p>
                          </div>
                          <div className="text-center p-2 bg-[#23232A] rounded">
                            <p className="text-lg font-bold text-[#F3F3F3]">
                              {connection.stats.level}
                            </p>
                            <p className="text-xs text-[#A1A1AA]">Level</p>
                          </div>
                          <div className="text-center p-2 bg-[#23232A] rounded col-span-2">
                            <p className="text-lg font-bold text-[#F3F3F3]">
                              {connection.stats.dailyReward}
                            </p>
                            <p className="text-xs text-[#A1A1AA]">Daily Reward</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Not Connected Status */}
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-[#F87171]" />
                        <span className="font-semibold text-[#F87171]">Not Connected</span>
                      </div>
                      <p className="text-[#A1A1AA] text-sm">
                        Connect your {platformInfo.name} account to start earning rewards
                      </p>
                      {/* Connect Button */}
                      <Button 
                        onClick={() => window.location.href = platformInfo.connectUrl}
                        className="w-full bg-[#28282D] border border-[#35353B] text-[#F3F3F3] hover:bg-[#35353B]"
                      >
                        <IconComponent className="w-4 h-4 mr-2 text-[#F3F3F3]" />
                        Connect {platformInfo.name}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

      

        {/* Level Tasks Section */}
        <div className="max-w-6xl mx-auto mt-12">
          <div className="space-y-6">
            {/* Daily Check In & Claim Box - moved here */}
        
            {/* Daily Tasks Section (like Telegram XP Journey) */}
            <div className="max-w-6xl mx-auto mt-12">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-6 rounded bg-[#F59E42] mr-2" />
                <h3 className="text-2xl font-extrabold tracking-tight text-[#F3F3F3]">Daily Tasks</h3>
              </div>
              <div className="text-xs text-[#F59E42] font-semibold mb-4 pl-6">Complete daily tasks and claim your rewards!</div>
              <div className="space-y-2">
                {/* Daily Check In as a card */}
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
                      disabled={!hasClaimableRewards() || isClaiming}
                      size="sm"
                      className={`bg-[#28282D] hover:bg-[#35353B] text-[#F3F3F3] px-3 py-1 rounded-full text-xs font-semibold shadow-none border border-[#35353B] ${!hasClaimableRewards() ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={{ boxShadow: 'none' }}
                    >
                      {isClaiming ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F3F3F3]"></div>
                          Claiming...
                        </div>
                      ) : hasClaimableRewards() ? (
                        <>
                          <Gift className="w-3 h-3 mr-1 text-[#F3F3F3]" />
                          Claim Daily Rewards
                        </>
                      ) : getCountdown() ? (
                        <>
                          <Clock className="w-4 h-4 mr-1 text-[#4ADE80]" />
                          Next claim in {getCountdown()}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1 text-[#4ADE80]" />
                          All Rewards Claimed
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {/* Daily Tasks List */}
                {dailyTasks.length > 0 && dailyTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] cursor-pointer hover:bg-[#23232A]"
                    onClick={() => window.open(task.link, '_blank', 'noopener,noreferrer')}
                  >
                    {/* Left: Title and Reward */}
                    <div className="flex flex-col min-w-[120px]">
                      <span className="text-xs text-[#F59E42] mb-1 font-semibold">{task.title}</span>
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
                  return [
                    ...unclaimed,
                    ...claimed
                  ].map((task, index) => (
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
                  return [
                    ...unclaimed,
                    ...claimed
                  ].map((task, index) => (
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
    </div>
  );
} 