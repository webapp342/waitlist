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
  Check
} from 'lucide-react';
import Image from 'next/image';
import { referralService, userService, cardService } from '@/lib/supabase';
import type { Card as CardType } from '@/lib/supabase';
import { useWallet } from '@/hooks/useWallet';
import Header from '@/components/header';
import WalletModal from '@/components/WalletModal';

interface OptimizedConnectionData {
  x: {
    connected: boolean;
    username?: string;
    avatarUrl?: string;
    verified?: boolean;
    stats: {
      followers?: number;
      messages?: number;
      xp: number;
      level: number;
      dailyReward: number;
    };
  };
  telegram: {
    connected: boolean;
    username?: string;
    stats: {
      messages?: number;
      xp: number;
      level: number;
      dailyReward: number;
      canClaimReward?: boolean;
    };
  };
  discord: {
    connected: boolean;
    username?: string;
    avatarUrl?: string;
    verified?: boolean;
    discordId?: string;
    stats: {
      messages?: number;
      xp: number;
      level: number;
      dailyReward: number;
      canClaimReward?: boolean;
      lastClaimedAt?: string;
    };
  };
  totalXP: number;
  totalSocialPoints: number;
  referralStats: {
    totalReferrals: number;
    totalRewards: string;
    referralCode?: { code: string };
  };
  stakingTasks: Record<string, any>;
  dailyTasks: any[];
  extraRewards: {
    telegram: any[];
    discord: any[];
  };
}

export default function OptimizedSocialConnectionsPage() {
  const { address, isConnected } = useAccount();
  
  // Get staking data from both networks
  const { userData: bscUserData } = useWallet(56);
  const { userData: ethUserData } = useWallet(1);
  
  // Combine data from both networks
  const combinedUserData = useMemo(() => ({
    ...bscUserData,
    stakedAmount: (parseFloat(bscUserData?.stakedAmount || '0') + parseFloat(ethUserData?.stakedAmount || '0')).toString(),
    pendingRewards: (parseFloat(bscUserData?.pendingRewards || '0') + parseFloat(ethUserData?.pendingRewards || '0')).toString(),
    stakes: [...(bscUserData?.stakes || []), ...(ethUserData?.stakes || [])]
  }), [bscUserData, ethUserData]);
  
  // Single state for all data
  const [data, setData] = useState<OptimizedConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [userRegistering, setUserRegistering] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [userCards, setUserCards] = useState<CardType[]>([]);

  // Task timers
  const [taskTimers, setTaskTimers] = useState<{ [taskId: number]: number }>({});
  const [taskClaimed, setTaskClaimed] = useState<{ [taskId: number]: boolean }>({});

  // Invite milestone states
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  // Loading timeout
  const [showLoading, setShowLoading] = useState(true);

  // Fetch all data in one call
  const fetchAllData = useCallback(async () => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/social-connections/optimized?walletAddress=${address}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch optimized data');
        toast.error('Failed to load social connections');
      }
    } catch (error) {
      console.error('Error fetching optimized data:', error);
      toast.error('Failed to load social connections');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  // Initial data fetch
  useEffect(() => {
    if (isConnected && address) {
      fetchAllData();
    }
  }, [isConnected, address, fetchAllData]);

  // Loading timeout
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

  // Task timer effect
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

  // Fetch claimed milestones
  useEffect(() => {
    const fetchClaimedMilestones = async () => {
      if (!address) return;
      try {
        const res = await fetch(`/api/invite-rewards/status?walletAddress=${address}`);
        const result = await res.json();
        if (result.claimed) setClaimedMilestones(result.claimed);
        else setClaimedMilestones([]);
      } catch {
        setClaimedMilestones([]);
      }
    };
    if (isConnected && address) {
      fetchClaimedMilestones();
    }
  }, [isConnected, address]);

  // User registration
  useEffect(() => {
    const registerUserAndLoadCards = async () => {
      if (!isConnected || !address || userRegistering || userRegistered) return;
      setUserRegistering(true);
      try {
        const user = await userService.addUser(address);
        if (user) {
          setUserRegistered(true);
          toast.success('User registration successful!');
          const cards = await cardService.getUserCards(address);
          setUserCards(cards);
          if (cards && cards.length > 0) {
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
  }, [isConnected, address, userRegistering, userRegistered]);

  // Helper functions
  const startTaskTimer = useCallback((taskId: number) => {
    if (taskTimers[taskId]) return;
    setTaskTimers(prev => ({ ...prev, [taskId]: 60 }));
  }, [taskTimers]);

  const handleClaimTask = useCallback(async (task: any) => {
    const res = await fetch('/api/admin/dailytasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: address, task_id: task.id, reward: task.reward })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      setTaskClaimed(prev => ({ ...prev, [task.id]: true }));
    } else {
      toast.error(result.error || 'Failed to claim task');
    }
  }, [address]);

  const claimAllRewards = useCallback(async () => {
    if (!address || !data) return;

    const hasClaimable = (data.telegram.connected && data.telegram.stats.canClaimReward) ||
                        (data.discord.connected && data.discord.stats.canClaimReward);

    if (!hasClaimable) return;

    setIsClaiming(true);
    const claimedRewards = [];
    const errors = [];

    try {
      // Telegram claim
      if (data.telegram.connected && data.telegram.stats.canClaimReward) {
        try {
          const telegramRes = await fetch('/api/telegram/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address }),
          });

          if (telegramRes.ok) {
            const result = await telegramRes.json();
            claimedRewards.push(`Telegram: ${result.reward.amount} BBLP`);
          } else {
            const err = await telegramRes.json();
            errors.push(`Telegram: ${err.error || 'Failed to claim'}`);
          }
        } catch (error) {
          errors.push('Telegram: Network error');
        }
      }

      // Discord claim
      if (data.discord.connected && data.discord.stats.canClaimReward && data.discord.discordId) {
        try {
          const discordRes = await fetch('/api/discord/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              discordId: data.discord.discordId 
            }),
          });

          if (discordRes.ok) {
            const result = await discordRes.json();
            claimedRewards.push(`Discord: ${result.rewardAmount} BBLP`);
          } else {
            const err = await discordRes.json();
            errors.push(`Discord: ${err.error || 'Failed to claim'}`);
          }
        } catch (error) {
          errors.push('Discord: Network error');
        }
      }

      // Show results
      if (claimedRewards.length > 0) {
        toast.success(`Successfully claimed: ${claimedRewards.join(', ')}`);
      }
      if (errors.length > 0) {
        toast.error(errors.join(' | '));
      }

      // Refresh data
      setTimeout(() => {
        fetchAllData();
      }, 1000);

    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error('Ödüller alınırken hata oluştu');
    } finally {
      setIsClaiming(false);
    }
  }, [address, data, fetchAllData]);

  const handleClaimInviteMilestone = useCallback(async (milestoneCount: number, points: number) => {
    if (!address) return;
    setClaimingMilestone(milestoneCount);
    try {
      const res = await fetch('/api/invite-rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, milestoneCount, points })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(`Claimed ${points} points for inviting ${milestoneCount} friends!`);
        setClaimedMilestones(prev => [...prev, milestoneCount]);
      } else {
        toast.error(result.error || 'Failed to claim milestone');
      }
    } catch (e) {
      toast.error('Failed to claim milestone');
    } finally {
      setClaimingMilestone(null);
    }
  }, [address]);

  const handleClaimStakeTask = useCallback(async (amount: number, points: number) => {
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
        const result = await response.json();
        toast.success(`Successfully claimed ${points} points for staking ${amount} BBLP!`);
        // Update local state
        setData(prev => prev ? {
          ...prev,
          stakingTasks: {
            ...prev.stakingTasks,
            [amount]: {
              points: points,
              claimed: true,
              claimedAt: new Date().toISOString()
            }
          }
        } : null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to claim stake task');
      }
    } catch (error) {
      console.error('Error claiming stake task:', error);
      toast.error('Failed to claim stake task');
    }
  }, [address]);

  // Computed values
  const allConnected = useMemo(() => {
    if (!data) return false;
    return data.x.connected && data.telegram.connected && data.discord.connected;
  }, [data]);

  const allDisconnected = useMemo(() => {
    if (!data) return true;
    return !data.x.connected && !data.telegram.connected && !data.discord.connected;
  }, [data]);

  const hasClaimableRewards = useMemo(() => {
    if (!data) return false;
    return (data.telegram.connected && data.telegram.stats.canClaimReward) ||
           (data.discord.connected && data.discord.stats.canClaimReward);
  }, [data]);

  const hasInvitedFirstFriend = useMemo(() => {
    return claimedMilestones.includes(1);
  }, [claimedMilestones]);

  const canClaimDailyReward = useMemo(() => {
    return hasClaimableRewards && hasInvitedFirstFriend;
  }, [hasClaimableRewards, hasInvitedFirstFriend]);

  const shouldShowInviteWarning = useMemo(() => {
    return hasClaimableRewards && !hasInvitedFirstFriend;
  }, [hasClaimableRewards, hasInvitedFirstFriend]);

  const getUserTotalDailyReward = useCallback(() => {
    if (!data) return 0;
    let total = 0;
    if (data.telegram.connected) {
      total += data.telegram.stats.dailyReward || 0;
    }
    if (data.discord.connected) {
      total += data.discord.stats.dailyReward || 0;
    }
    return total;
  }, [data]);

  const getDiscordNextClaimCountdown = useCallback(() => {
    if (!data?.discord.connected || data.discord.stats.canClaimReward) return null;
    const lastClaimedAt = data.discord.stats.lastClaimedAt;
    if (!lastClaimedAt) return null;
    const lastDate = new Date(lastClaimedAt);
    const nextClaimDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = nextClaimDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [data]);

  // Loading states
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

  if (isLoading || !data) {
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
    // Show connect cards overlay
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative" style={{ background: '#18181B' }}>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <div className="relative z-50 flex flex-col items-center justify-center w-full mb-8">
          <div className="text-2xl font-bold text-white text-center mb-2 px-4">Connect your accounts !</div>
          <div className="text-base text-[#A1A1AA] text-center px-4 mb-2">Connect X, Telegram, and Discord to unlock all features and maximize rewards.</div>
        </div>
        <div className="relative z-50 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 px-4">
            {[
              {
                platform: 'x',
                name: 'X (Twitter)',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#1DA1F2"><path d="M32 6.076a13.14 13.14 0 0 1-3.769 1.031A6.601 6.601 0 0 0 31.115 4.1a13.195 13.195 0 0 1-4.169 1.594A6.563 6.563 0 0 0 22.155 2c-3.626 0-6.563 2.938-6.563 6.563 0 .514.058 1.016.17 1.496C10.303 9.87 5.47 7.38 2.228 3.671a6.544 6.544 0 0 0-.888 3.3c0 2.277 1.159 4.287 2.924 5.464a6.533 6.533 0 0 1-2.975-.822v.083c0 3.18 2.263 5.833 5.267 6.437a6.575 6.575 0 0 1-2.968.112c.837 2.614 3.263 4.516 6.142 4.567A13.18 13.18 0 0 1 0 27.026 18.616 18.616 0 0 0 10.063 30c12.072 0 18.681-10.002 18.681-18.682 0-.285-.007-.568-.02-.85A13.354 13.354 0 0 0 32 6.076z"/></svg>,
                color: '#1DA1F2',
                connectUrl: '/x',
                desc: 'Connect your X account.',
                isConnected: data.x.connected
              },
              {
                platform: 'telegram',
                name: 'Telegram',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#229ED9"><path d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16zm6.406-21.406l-2.75 12.969c-.207.93-.75 1.156-1.519.72l-4.188-3.094-2.022 1.947c-.223.223-.41.41-.84.41l.299-4.23 7.688-6.938c.334-.299-.073-.465-.517-.166l-9.5 5.98-4.094-1.281c-.889-.277-.906-.889.186-1.316l16.031-6.188c.748-.277 1.406.166 1.166 1.314z"/></svg>,
                color: '#229ED9',
                connectUrl: '/telegram',
                desc: 'Connect your Telegram account.',
                isConnected: data.telegram.connected
              },
              {
                platform: 'discord',
                name: 'Discord',
                icon: <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2" fill="#5865F2"><path d="M27.2 6.8A26.9 26.9 0 0 0 20.5 4a1 1 0 0 0-.5.1c-.2.1-.3.3-.3.5l-.3 1.2a24.2 24.2 0 0 0-7.8 0l-.3-1.2a.7.7 0 0 0-.3-.5A1 1 0 0 0 11.5 4a26.9 26.9 0 0 0-6.7 2.8c-.2.1-.3.3-.3.5C2.1 13.1 1.2 19.2 2.1 25.2c0 .2.2.4.4.5A27.2 27.2 0 0 0 11.5 28a1 1 0 0 0 .5-.1c.2-.1.3-.3.3-.5l.3-1.2a24.2 24.2 0 0 0 7.8 0l.3 1.2c.1.2.2.4.3.5a1 1 0 0 0 .5.1 27.2 27.2 0 0 0 8.9-2.3c.2-.1.4-.3.4-.5.9-6 .1-12.1-1.7-17.9a.7.7 0 0 0-.3-.5zM11.1 20.2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9.8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>,
                color: '#5865F2',
                connectUrl: '/discord',
                desc: 'Connect your Discord account.',
                isConnected: data.discord.connected
              }
            ].map(({ platform, name, icon, color, connectUrl, desc, isConnected }) => (
              <div
                key={platform}
                className="bg-[#23232A] border border-[#35353B] rounded-2xl shadow-xl p-8 flex flex-col items-center transition-transform duration-200 hover:scale-105 hover:shadow-2xl"
              >
                <div className="w-full flex items-center justify-center mb-1">
                  {icon}
                  <span className="text-lg font-bold text-white">{name}</span>
                </div>
                <div className="w-full text-center text-xs text-[#A1A1AA] mb-3">{desc}</div>
                {isConnected ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-green-900/30 text-green-400 border border-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Connected
                  </div>
                ) : (
                  <Button
                    onClick={() => window.location.href = connectUrl}
                    className="w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    Connect {name}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen px-2 sm:px-4 md:px-0" style={{ color: '#F3F3F3', position: 'relative' }}>
        {/* Overview Header */}
        <div className="w-full max-w-6xl mx-auto mt-40 mb-2">
          <h1 className="text-3xl font-bold text-white mb-2">Social Connections Overview</h1>
          <p className="text-base text-[#A1A1AA]">Being active in our community. The more you engage, the more you earn!</p>
        </div>

        {/* Stats Grid */}
        <div className="w-full max-w-6xl mx-auto mb-10 grid mt-2 grid-cols-2 gap-2 md:px-0">
          <div className="col-span-2 text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {((data.totalXP + data.totalSocialPoints) * 0.02).toLocaleString(undefined, { maximumFractionDigits: 2 })} BBLP
            </div>
            <p className="text-[#A1A1AA] text-base">Estimated BBLP Reward </p>
          </div>
          <div className="text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
            <div className="text-4xl font-bold text-[#F3F3F3] mb-2">{data.totalXP} XP</div>
            <p className="text-[#A1A1AA] text-base">Total XP</p>
          </div>
          <div className="text-center p-8 bg-[#23232A] rounded-2xl border border-[#2A2A2E] flex flex-col items-center justify-center shadow-lg">
            <div className="text-4xl font-bold text-[#F3F3F3] mb-2">{data.totalSocialPoints}</div>
            <p className="text-[#A1A1AA] text-base">Total Social Points</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Referral Link */}
          <div className="px-4 py-3 rounded-xl border transition-all duration-200 bg-[#18181B] border-[#23232A] flex flex-row items-stretch gap-2 mb-6">
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <div className="text-xs text-yellow-400 font-semibold mb-1">Your Referral Link</div>
              <div className="w-full bg-transparent text-[#F3F3F3] font-mono text-sm overflow-x-auto whitespace-nowrap">
                {data.referralStats.referralCode?.code ? (
                  `https://bblip.io/?ref=${data.referralStats.referralCode.code}`
                ) : (
                  'No referral link available'
                )}
              </div>
            </div>
            <button
              onClick={() => {
                if (data.referralStats.referralCode?.code) {
                  navigator.clipboard.writeText(`https://bblip.io/?ref=${data.referralStats.referralCode.code}`);
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

          {/* Daily Check In */}
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
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
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

          {/* Refresh Button */}
          <div className="text-center mt-8">
            <Button 
              onClick={fetchAllData}
              disabled={isLoading}
              variant="outline"
              className="border-[#35353B] text-[#F3F3F3] hover:bg-[#23232A]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F3F3F3]"></div>
                  Loading...
                </div>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2 text-[#F3F3F3]" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
} 