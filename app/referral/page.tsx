'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, Gift, ArrowLeft, ExternalLink, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { referralService, ReferralCode, Referral } from '@/lib/supabase';
import { toast } from 'sonner';
import { userService } from '@/lib/supabase';

export default function ReferralPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
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
      const link = `${window.location.origin}?ref=${referralCode.code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const shareReferralLink = () => {
    if (referralCode) {
      const link = `${window.location.origin}?ref=${referralCode.code}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Join BBLIP Card Program',
          text: 'Get your exclusive crypto cards with my referral link!',
          url: link
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

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
        <Header />

        {/* Back Button */}
        <div className="w-full max-w-6xl mt-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Referral Program</h1>
            <p className="text-gray-400 text-lg">Earn rewards by inviting friends to join BBLIP</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Referral Code Section */}
              {referralCode && (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your Referral Code</h2>
                    <p className="text-gray-400">Share this code with friends to earn rewards</p>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-2">Your Unique Code</p>
                      <p className="text-3xl font-mono font-bold text-white mb-4">{referralCode.code}</p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          onClick={copyReferralLink}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          onClick={shareReferralLink}
                          variant="outline"
                          className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700 text-center">
                      <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{referralCode.total_referrals}</p>
                      <p className="text-sm text-gray-400">Total Referrals</p>
                    </div>
                    
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700 text-center">
                      <Gift className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{parseFloat(referralCode.total_rewards_earned).toFixed(2)}</p>
                      <p className="text-sm text-gray-400">Total Rewards (BBLIP)</p>
                    </div>
                    
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700 text-center">
                      <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">Active</p>
                      <p className="text-sm text-gray-400">Status</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Referrals List */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6">Your Referrals</h3>
                
                {referrals.length > 0 ? (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">
                              Referral #{referral.id?.slice(0, 8) || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {referral.created_at ? `Joined ${new Date(referral.created_at).toLocaleDateString()}` : 'Recently joined'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">No Referrals Yet</h4>
                    <p className="text-gray-400 mb-6">Share your referral link to start earning rewards!</p>
                    <Button onClick={copyReferralLink} className="bg-purple-600 hover:bg-purple-700">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Referral Link
                    </Button>
                  </div>
                )}
              </div>

              {/* How it Works */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 p-8">
                <h3 className="text-xl font-bold text-white mb-6 text-center">How Referral Rewards Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-purple-400">1</span>
                    </div>
                    <h4 className="font-semibold text-white mb-2">Share Your Link</h4>
                    <p className="text-sm text-gray-300">Copy and share your unique referral link with friends</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-blue-400">2</span>
                    </div>
                    <h4 className="font-semibold text-white mb-2">Friends Join</h4>
                    <p className="text-sm text-gray-300">When they sign up using your link, they get their cards</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-green-400">3</span>
                    </div>
                    <h4 className="font-semibold text-white mb-2">Earn Rewards</h4>
                    <p className="text-sm text-gray-300">You both receive BBLIP tokens as referral rewards</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Particles
        quantityDesktop={100}
        quantityMobile={30}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
} 