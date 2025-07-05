'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Users } from 'lucide-react';
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
}

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />;
      default:
        return <Award className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-yellow-400/30';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300/30';
      case 3:
        return 'bg-gradient-to-r from-orange-400/20 to-orange-500/20 border-orange-400/30';
      default:
        return 'bg-zinc-800/30 border-zinc-700/50';
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
    <div className="w-full max-w-4xl mb-8">
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white">Leaderboard</h3>
              <p className="text-sm text-gray-400 mt-1">Top referrers by BBLP earned</p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="p-6">
          {/* Top 5 Users */}
          <div className="space-y-3 mb-6">
            {topUsers.map((user) => (
              <div
                key={user.userId}
                className={cn(
                  "rounded-xl p-4 border backdrop-blur-sm hover:scale-[1.02] transition-all duration-200",
                  getRankStyle(user.rank)
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      {getRankIcon(user.rank)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{user.rank}</span>
                        <p className="text-white font-medium">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">Referrer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {parseFloat(user.totalRewards).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">BBLP earned</p>
                  </div>
                </div>
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
                  <span className="bg-zinc-900 px-4 text-sm text-gray-400">Your Position</span>
                </div>
              </div>

              <div className="rounded-xl p-4 border bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border-yellow-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yellow-400">#{currentUserRank.rank}</span>
                        <p className="text-white font-medium">
                          {currentUserRank.walletAddress.slice(0, 6)}...{currentUserRank.walletAddress.slice(-4)}
                        </p>
                        <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full">You</span>
                      </div>
                      <p className="text-xs text-gray-400">Your ranking</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {parseFloat(currentUserRank.totalRewards).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">BBLP earned</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No data state */}
          {topUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-zinc-600" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">No Leaderboard Data Yet</h4>
              <p className="text-gray-400 text-sm">
                Be the first to earn BBLP through referrals!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 