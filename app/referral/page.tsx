'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, Gift, ArrowLeft, Trophy, Coins, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { referralService, ReferralCode, Referral } from '@/lib/supabase';
import { toast } from 'sonner';
import { userService } from '@/lib/supabase';
import Image from 'next/image';
import ReferralLeaderboard from '@/components/ReferralLeaderboard';

export default function ReferralPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralStats, setReferralStats] = useState({ 
    totalReferrals: 0, 
    totalRewards: '0',
    tier1Rewards: '0',
    tier2Rewards: '0', 
    tier3Rewards: '0',
    tier4Rewards: '0',
    tier5Rewards: '0'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    const loadReferralData = async () => {
      if (address) {
        try {
          setLoading(true);
          
          // Get user first
          const user = await userService.getUserByWallet(address);
          if (user) {
            // Get or generate referral code
            let code = await referralService.getReferralCodeByUserId(user.id);
            if (!code) {
              code = await referralService.generateReferralCode(address);
            }
            setReferralCode(code);

            // Get referrals list
            const referralsList = await referralService.getUserReferrals(address);
            setReferrals(referralsList);

            // Get referral stats
            const stats = await referralService.getUserReferralStats(address);
            setReferralStats({
              totalReferrals: stats.totalReferrals,
              totalRewards: stats.totalRewards,
              tier1Rewards: stats.tier1Rewards || '0',
              tier2Rewards: stats.tier2Rewards || '0',
              tier3Rewards: stats.tier3Rewards || '0',
              tier4Rewards: stats.tier4Rewards || '0',
              tier5Rewards: stats.tier5Rewards || '0'
            });
          }
          
        } catch (error) {
          console.error('Error loading referral data:', error);
          toast.error('Failed to load referral data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadReferralData();
  }, [isConnected, address, router]);

  const copyReferralLink = () => {
    if (referralCode) {
      const link = `https://waitlist-murex-nine.vercel.app/?ref=${referralCode.code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const shareReferralLink = () => {
    if (referralCode) {
      const link = `https://waitlist-murex-nine.vercel.app/?ref=${referralCode.code}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Join BBLP - Earn Crypto Rewards Together',
          text: 'Join BBLP and earn rewards when you stake! Use my referral link and we both earn bonus BBLP tokens.',
          url: link
        }).catch(() => {
          // User cancelled share
        });
      } else {
        navigator.clipboard.writeText(link);
        toast.success('Referral link copied to clipboard!');
      }
    }
  };

  if (!isConnected) {
    return null;
  }

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

  const highestTier = referralStats.tier5Rewards !== '0' ? '5' : 
                    referralStats.tier4Rewards !== '0' ? '4' :
                    referralStats.tier3Rewards !== '0' ? '3' :
                    referralStats.tier2Rewards !== '0' ? '2' :
                    referralStats.tier1Rewards !== '0' ? '1' : '0';

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
        <Header />

  

        {/* Hero Section */}
        <div className="w-full max-w-4xl mb-8 mt-20 pt-10 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
          
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400">
            Invite Friends, Earn Together

            </h1>
          </div>
          <p className="text-gray-400 text-base max-w-lg mx-auto">
          Share BBLP with your friends and earn rewards for every successful referral. The more friends join, the more rewards you get!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="w-full max-w-4xl mb-8">
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {/* Total Referrals */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-4 md:p-6 shadow-lg text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{referralStats.totalReferrals}</div>
              <div className="text-xs md:text-sm text-gray-400 font-medium">Total Referrals</div>
              <div className="text-xs text-gray-500 mt-1">Friends joined</div>
            </div>

            {/* Total Earned */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-4 md:p-6 shadow-lg text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-3">
                <Coins className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{parseFloat(referralStats.totalRewards).toFixed(0)}</div>
              <div className="text-xs md:text-sm text-gray-400 font-medium">BBLP Earned</div>
              <div className="text-xs text-gray-500 mt-1">Total rewards</div>
            </div>

            {/* Highest Tier */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-4 md:p-6 shadow-lg text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">Tier {highestTier}</div>
              <div className="text-xs md:text-sm text-gray-400 font-medium">Highest Level</div>
              <div className="text-xs text-gray-500 mt-1">Achieved</div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <ReferralLeaderboard />

        {/* Your Referral Link */}
        {referralCode && (
          <div className="w-full max-w-4xl mb-8">
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-lg">
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Your Referral Link</h2>
                <p className="text-gray-400 text-sm">Share this link with friends to earn rewards together</p>
              </div>

              <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-4 border border-zinc-700/50 mb-6">
                <p className="text-xs text-gray-400 mb-3 text-center">Your unique referral link</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-lg md:text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-500">
                    https://waitlist-murex-nine.vercel.app/?ref={referralCode.code}
                    </p>
                  </div>
                </div>
              
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={copyReferralLink}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20 transition-all duration-200 group"
                >
                  <Copy className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareReferralLink}
                  variant="outline"
                  className="flex-1 bg-zinc-800/50 border-yellow-400/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400/50 transition-all duration-200 group"
                >
                  <Share2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Share Link
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="w-full max-w-4xl mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">How It Works</h2>
              <p className="text-gray-400 text-sm">Simple steps to earn rewards together</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-7 h-7 text-yellow-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">1. Share</h3>
                <p className="text-sm text-gray-400">Send your referral link to friends</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">2. Join</h3>
                <p className="text-sm text-gray-400">They sign up using your link</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400/20 to-green-500/20 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">3. Earn</h3>
                <p className="text-sm text-gray-400">Both get rewards when they stake</p>
              </div>
            </div>

            <div className="bg-yellow-400/10 rounded-xl p-4 border border-yellow-400/20">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Win-Win System</h4>
                  <p className="text-sm text-gray-300">
                    The more your friend stakes, the more rewards you both earn!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Tiers */}
        <div className="w-full max-w-4xl mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800/50">
              <h3 className="text-xl md:text-2xl font-bold text-white">Reward Tiers</h3>
              <p className="text-sm text-gray-400 mt-1">Higher stakes = Higher rewards for both</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { tier: 1, stake: '100', you: '10', friend: '5', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
                  { tier: 2, stake: '500', you: '50', friend: '25', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
                  { tier: 3, stake: '1,000', you: '100', friend: '50', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
                  { tier: 4, stake: '2,500', you: '250', friend: '125', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
                  { tier: 5, stake: '3,500', you: '350', friend: '175', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
                ].map((tier) => (
                  <div key={tier.tier} className={cn("rounded-xl p-4 border", tier.color)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                          <span className="font-bold text-white">{tier.tier}</span>
                        </div>
                        <div>
                          <p className="font-bold text-white">Tier {tier.tier}</p>
                          <p className="text-sm text-gray-400">{tier.stake}+ BBLP stake</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">You</p>
                          <p className="font-bold text-white">+{tier.you}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Friend</p>
                          <p className="font-bold text-white">+{tier.friend}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Referrals or No Referrals State */}
        <div className="w-full max-w-4xl mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800/50">
              <h3 className="text-xl font-bold text-white">Your Referrals</h3>
              <p className="text-sm text-gray-400 mt-1">Friends who joined using your link</p>
            </div>
            
            <div className="p-6">
              {referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.slice(0, 5).map((referral, index) => (
                    <div 
                      key={referral.id} 
                      className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                            <span className="text-black font-bold text-sm">
                              {referral.id?.slice(0, 1).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              User #{referral.id?.slice(0, 8) || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400">
                              Joined {referral.created_at ? new Date(referral.created_at).toLocaleDateString() : 'recently'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400">Active</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">No Referrals Yet</h4>
                  <p className="text-gray-400 mb-6 text-sm">
                    Share your referral link and start earning together!
                  </p>
                  <Button 
                    onClick={shareReferralLink} 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Your Link
                  </Button>
                </div>
              )}
            </div>
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