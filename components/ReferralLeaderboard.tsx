'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Users, Sparkles, ArrowUp, Clock, CalendarDays, Target, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { referralService } from '@/lib/supabase';
import { useAccount } from 'wagmi';
import Image from 'next/image';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  walletAddress: string;
  totalRewards: string;
  isCurrentUser?: boolean;
  invitedCount: number;
}

const getUsdtReward = (rank: number): number => {
  switch (rank) {
    case 1:
      return 1000;
    case 2:
      return 500;
    case 3:
      return 250;
    case 4:
      return 150;
    case 5:
      return 100;
    default:
      return 0;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg">
          <Crown className="w-5 h-5 text-black" />
        </div>
      );
    case 2:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 shadow-lg">
          <Medal className="w-5 h-5 text-black" />
        </div>
      );
    case 3:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-lg">
          <Medal className="w-5 h-5 text-black" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-700/50">
          <span className="text-sm font-bold text-white">#{rank}</span>
        </div>
      );
  }
};

export default function ReferralLeaderboard() {
  const { address } = useAccount();
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Countdown to July 31, 2024
  useEffect(() => {
    const targetDate = new Date('2025-08-31T23:59:59Z');
    
    const updateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        const leaderboardData = await referralService.getLeaderboard(address);
        
        if (leaderboardData) {
          setTopUsers(leaderboardData.topUsers);
          setCurrentUserRank(leaderboardData.currentUserRank);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [address]);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/10 via-yellow-500/10 to-yellow-400/10 border-yellow-400/30 hover:border-yellow-400/50';
      case 2:
        return 'bg-gradient-to-r from-gray-300/10 via-gray-400/10 to-gray-300/10 border-gray-300/30 hover:border-gray-300/50';
      case 3:
        return 'bg-gradient-to-r from-orange-400/10 via-orange-500/10 to-orange-400/10 border-orange-400/30 hover:border-orange-400/50';
      default:
        return 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/50';
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mb-8">
        <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-lg">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mb-8 px-0 sm:px-0">
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="px-3 sm:px-6 py-4 sm:py-6 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950">
          <div className="flex flex-col gap-4">
            {/* Title and Season Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-white">Global Leaderboard</h3>
                  <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                    <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-0.5 rounded-full text-xs font-bold">Season 1</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">Competition Period</span>
                  </div>
                </div>
              </div>
              
              {/* Countdown */}
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span className="text-xs sm:text-sm font-semibold text-red-400">Season Ends In</span>
                </div>
                <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
                  <div className="bg-red-500/20 rounded-lg px-1 py-1 sm:px-2 sm:py-1">
                    <div className="text-base sm:text-xl font-bold text-white">{timeLeft.days}</div>
                    <div className="text-xs text-red-300">Days</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg px-1 py-1 sm:px-2 sm:py-1">
                    <div className="text-base sm:text-xl font-bold text-white">{timeLeft.hours}</div>
                    <div className="text-xs text-red-300">Hours</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg px-1 py-1 sm:px-2 sm:py-1">
                    <div className="text-base sm:text-xl font-bold text-white">{timeLeft.minutes}</div>
                    <div className="text-xs text-red-300">Min</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg px-1 py-1 sm:px-2 sm:py-1">
                    <div className="text-base sm:text-xl font-bold text-white">{timeLeft.seconds}</div>
                    <div className="text-xs text-red-300">Sec</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Call to Action */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white mb-1">Race to Top 5!</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Climb the leaderboard and secure your bonus rewards. <span className="text-green-400 font-semibold">These are additional prizes on top of your regular earnings!</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-300">
                    <CalendarDays className="w-3 h-3" />
                    <span>Competition ends July 31, 2025</span>
                    <span className="text-yellow-400 font-semibold ml-2">• 2,000 USDT Prize Pool</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-6">
          {/* Top 5 Users */}
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            {topUsers.map((user) => (
              <div
                key={user.userId}
                className={cn(
                  "rounded-xl p-2 sm:p-4 border backdrop-blur-sm hover:scale-[1.01] transition-all duration-200 flex flex-col gap-1 sm:gap-0 justify-between",
                  getRankStyle(user.rank)
                )}
              >
                {/* Current user card special layout */}
                {user.isCurrentUser ? (
                  <>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <p className="text-xs sm:text-base font-medium text-white">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </p>
                        <span className="text-xs bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">You</span>
                      </div>
                      <span className="text-xs sm:text-lg font-bold text-white whitespace-nowrap">
                        {((parseFloat(user.totalRewards) / 10) % 1 === 0) ? (parseFloat(user.totalRewards) / 10).toLocaleString() : (parseFloat(user.totalRewards) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        <span className="text-xs sm:text-sm text-gray-400 ml-1">USDT</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs text-yellow-400/80 font-normal">
                      Keep referring
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-row items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        {getRankBadge(user.rank)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <p className="text-xs sm:text-base font-medium text-white">
                              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <p className="text-sm sm:text-lg font-bold text-white whitespace-nowrap">
                          {((parseFloat(user.totalRewards) / 10) % 1 === 0) ? (parseFloat(user.totalRewards) / 10).toLocaleString() : (parseFloat(user.totalRewards) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          <span className="text-xs sm:text-sm text-gray-400 ml-1">USDT</span>
                        </p>
                      </div>
                    </div>
                    {(user.rank <= 5 && (user.rank <= 3 || getUsdtReward(user.rank) > 0)) && (
                      <div className="flex flex-row items-center justify-between gap-2 mt-0.5 mb-0 w-full">
                        <span className="text-[11px] sm:text-xs text-gray-400 font-normal min-w-[60px]">
                          {user.invitedCount > 0 ? `${user.invitedCount} invited` : 'No invites yet'}
                        </span>
                        <div className="flex flex-row items-center gap-2 ml-auto">
                          {user.rank <= 3 && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full font-medium",
                              user.rank === 1 ? "bg-yellow-400/20 text-yellow-400" :
                              user.rank === 2 ? "bg-gray-400/20 text-gray-400" :
                              "bg-orange-400/20 text-orange-400"
                            )}>
                              Top {user.rank}
                            </span>
                          )}
                          {getUsdtReward(user.rank) > 0 && (
                            <span className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-lg px-2 py-1 flex items-center gap-1 text-xs sm:text-sm font-bold text-yellow-400 shadow-lg">
                              <Trophy className="w-3 h-3" />
                              <span className="text-yellow-300">+</span>
                              <span className="text-yellow-400">Bonus</span>
                              <span className="text-white">{getUsdtReward(user.rank).toLocaleString()} USDT</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Current User Rank (if not in top 5) */}
          {currentUserRank && currentUserRank.rank > 5 && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700/50"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-zinc-900 px-4 text-sm text-gray-400 flex items-center gap-2">
                    <ArrowUp className="w-4 h-4" />
                    Your Position
                  </span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl p-2 sm:p-4 border backdrop-blur-sm transition-all duration-200 flex flex-col gap-1 sm:gap-0 justify-between",
                getRankStyle(currentUserRank.rank)
              )}>
                <div className="flex flex-row items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20">
                      <span className="text-sm font-bold text-yellow-400">#{currentUserRank.rank}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <p className="text-xs sm:text-base font-medium text-white">
                          {currentUserRank.walletAddress.slice(0, 6)}...{currentUserRank.walletAddress.slice(-4)}
                        </p>
                        <span className="text-xs bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">You</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <p className="text-sm sm:text-lg font-bold text-white whitespace-nowrap">
                      {((parseFloat(currentUserRank.totalRewards) / 10) % 1 === 0) ? (parseFloat(currentUserRank.totalRewards) / 10).toLocaleString() : (parseFloat(currentUserRank.totalRewards) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      <span className="text-xs sm:text-sm text-gray-400 ml-1">USDT</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 mt-0.5 mb-0 w-full">
                  <span className="text-[11px] sm:text-xs text-gray-400 font-normal min-w-[60px]">
                    {currentUserRank.invitedCount > 0 ? `${currentUserRank.invitedCount} invited` : 'Climb to Top 5 and win bonus USDT prizes!'}
                  </span>
                  <div className="flex flex-row items-center gap-2 ml-auto">
                    {currentUserRank.rank <= 3 && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full font-medium",
                        currentUserRank.rank === 1 ? "bg-yellow-400/20 text-yellow-400" :
                        currentUserRank.rank === 2 ? "bg-gray-400/20 text-gray-400" :
                        "bg-orange-400/20 text-orange-400"
                      )}>
                        Top {currentUserRank.rank}
                      </span>
                    )}
                    {currentUserRank.rank <= 5 && getUsdtReward(currentUserRank.rank) > 0 && (
                      <span className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-bold text-yellow-400 shadow-lg">
                        <Trophy className="w-3 h-3" />
                        <span className="text-yellow-300">+</span>
                        <span className="text-yellow-400">Bonus</span>
                        <span className="text-white">{getUsdtReward(currentUserRank.rank).toLocaleString()} USDT</span>
                      </span>
                    )}
                  </div>
                </div>
               
              </div>
            </>
          )}

          {/* No data state */}
          {topUsers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-400" />
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-3">Season 1 Competition</h4>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-4">
                Be the first to climb the leaderboard and claim your bonus rewards! These are additional prizes on top of your regular referral earnings.
              </p>
              <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">Bonus Prize Pool</span>
                </div>
                <p className="text-2xl font-bold text-white">2,000 USDT</p>
                <p className="text-xs text-gray-400 mt-1">Distributed to Top 5 referrers</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 