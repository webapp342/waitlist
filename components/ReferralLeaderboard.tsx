'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Users, Sparkles, ArrowUp } from 'lucide-react';
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
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-900 via-zinc-900/50 to-zinc-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Global Leaderboard</h3>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs sm:text-sm text-gray-400">Total Prize Pool:</p>
                <p className="text-xs sm:text-sm font-semibold text-yellow-400">2,000 USDT</p>
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
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
                        {parseFloat(user.totalRewards).toLocaleString()}
                        <span className="text-xs sm:text-sm text-gray-400 ml-1">rBBLP</span>
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
                          {parseFloat(user.totalRewards).toLocaleString()}
                          <span className="text-xs sm:text-sm text-gray-400 ml-1">rBBLP</span>
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
                            <span className="bg-yellow-400/10 rounded px-1.5 py-0.5 flex items-center gap-1 text-xs sm:text-sm font-semibold text-yellow-400">
                              <Trophy className="w-3 h-3" />
                              {getUsdtReward(user.rank).toLocaleString()} USDT
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
                      {parseFloat(currentUserRank.totalRewards).toLocaleString()}
                      <span className="text-xs sm:text-sm text-gray-400 ml-1">rBBLP</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 mt-0.5 mb-0 w-full">
                  <span className="text-[11px] sm:text-xs text-gray-400 font-normal min-w-[60px]">
                    {currentUserRank.invitedCount > 0 ? `${currentUserRank.invitedCount} invited` : 'Invite Friends to be top and win 1,000 USDT in prizes'}
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
                 
                  </div>
                </div>
               
              </div>
            </>
          )}

          {/* No data state */}
          {topUsers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2">No Leaderboard Data Yet</h4>
              <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                Be the first to earn rBBLP through referrals and claim the top spot with 1,000 USDT in prizes!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 