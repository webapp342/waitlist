'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, Coins, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { referralService, ReferralCode, Referral } from '@/lib/supabase';
import { toast } from 'sonner';
import { userService } from '@/lib/supabase';
import Image from 'next/image';
import ReferralLeaderboard from '@/components/ReferralLeaderboard';
import { format } from 'date-fns';

interface ClaimHistory {
  transaction_hash: string;
  amount_claimed: string;
  created_at: string;
  status: string;
}

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;

export default function ReferralPage() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
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
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimableAmount, setClaimableAmount] = useState('0');

  const refreshStats = async () => {
    if (address) {
      try {
        const user = await userService.getUserByWallet(address);
        if (user) {
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
        console.error('Error refreshing stats:', error);
      }
    }
  };

  // Check if user is on BSC Mainnet
  const isOnBSCMainnet = chainId === BSC_MAINNET_CHAIN_ID;

  // Handle BSC Mainnet switch
  const switchToBSCMainnet = async () => {
    if (!switchChain) return;
    
    try {
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
      toast.success('Switched to BSC Mainnet successfully!');
    } catch (error: any) {
      console.error('Failed to switch to BSC Mainnet:', error);
      if (error.code === 4001) {
        toast.error('Network switch was cancelled');
      } else {
        toast.error('Failed to switch to BSC Mainnet. Please switch manually.');
      }
    }
  };

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    const loadReferralData = async () => {
      if (address && isOnBSCMainnet) {
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
      } else if (!isOnBSCMainnet && isConnected) {
        // If not on BSC Mainnet, just stop loading
        setLoading(false);
      }
    };

    loadReferralData();
  }, [isConnected, address, router, isOnBSCMainnet]);

  const copyReferralLink = () => {
    if (referralCode) {
      const link = `https://bblip.io/?ref=${referralCode.code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const shareReferralLink = () => {
    if (referralCode) {
      const link = `https://bblip.io/?ref=${referralCode.code}`;
      
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

  const handleClaimUSDT = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isOnBSCMainnet) {
      toast.error('Please switch to BSC Mainnet to claim rewards');
      return;
    }

    const earnedUSDT = parseFloat(referralStats.totalRewards) / 10;
    if (earnedUSDT <= 0) {
      toast.error('No USDT available to claim');
      return;
    }

    setClaimLoading(true);
    try {
      // Step 1: Set claimable amount on contract
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set claimable amount');
      }

      // If amount was already set, proceed to claim
      if (data.message === 'Claimable amount already set') {
        toast.info('Claimable amount already set, proceeding to claim...');
      } else {
        toast.success('Claimable amount set successfully!');
      }

      // Step 2: Call smart contract claimUSDT function
      const { ethers } = await import('ethers');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // BSC Mainnet Claim Contract Address
      const contractAddress = "0xbfE9400203C02e7b6cD4c38c832EC170308E4fb1"; 
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      const contractABI = [
        "function claimUSDT() external",
        "function getClaimableAmount(address user) external view returns (uint256)"
      ];

      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // Execute claim transaction
      toast.info('Please confirm the transaction in your wallet...');
      const tx = await contract.claimUSDT();
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      // Step 3: Reset rewards in database after successful claim
      const resetResponse = await fetch('/api/claim/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: address,
          transactionHash: receipt.hash,
          amount: earnedUSDT.toString()
        }),
      });

      if (!resetResponse.ok) {
        console.error('Failed to reset rewards in database');
      }
      
      // Refresh stats after successful claim
      await refreshStats();
      
      toast.success('USDT claimed successfully! 🎉');

    } catch (error: any) {
      console.error('Error in claim process:', error);
      toast.error(error.message || 'Failed to claim USDT');
    } finally {
      setClaimLoading(false);
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

  

        {/* BSC Network Info Banner */}
        {isConnected && !isOnBSCMainnet && (
          <div className="w-full max-w-4xl mb-4 mt-20 pt-6">
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-orange-400 mb-1">BSC Network Required</h4>
                  <p className="text-sm text-orange-300">Switch to BSC Mainnet to claim your USDT rewards.</p>
                </div>
                <Button
                  onClick={switchToBSCMainnet}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white ml-auto"
                >
                  Switch Network
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className={cn(
          "w-full max-w-4xl mb-8 text-center",
          isConnected && !isOnBSCMainnet ? "mt-4 pt-4" : "mt-20 pt-10"
        )}>
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
        <div className="w-full max-w-4xl mb-2">
          <div className="grid grid-cols-2 gap-2 md:gap-6">
            {/* Total Referrals */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-4 md:p-6 shadow-lg text-center">
              
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{referralStats.totalReferrals}</div>
              <div className="text-xs md:text-sm text-gray-400 font-medium">Total Referrals</div>
            </div>

            {/* Total Earned with Claim Button */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-4 md:p-6 shadow-lg">
              <div className="text-center mb-3">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{((parseFloat(referralStats.totalRewards) / 10) % 1 === 0) ? (parseFloat(referralStats.totalRewards) / 10).toFixed(0) : (parseFloat(referralStats.totalRewards) / 10).toFixed(1)}</div>
                <div className="text-xs md:text-sm text-gray-400 font-medium">USDT Earned</div>
              </div>
              
              {/* Network Check & Claim Button */}
              {!isOnBSCMainnet ? (
                <Button
                  onClick={switchToBSCMainnet}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs md:text-sm py-2 px-3 rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all duration-200"
                >
                  <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Switch to BSC Mainnet 
                </Button>
              ) : parseFloat(referralStats.totalRewards) > 0 ? (
                <Button
                  onClick={handleClaimUSDT}
                  disabled={claimLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xs md:text-sm py-2 px-3 rounded-lg shadow-lg hover:shadow-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Coins className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Claim USDT Rewards
                    </>
                  )}
                </Button>
              ) : (
                <div className="w-full text-center text-xs md:text-sm text-gray-400 py-2">
                  No USDT available to claim yet
                </div>
              )}
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
                    <p className="text-base md:text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-500">
                    https://bblip.io/?ref={referralCode.code}
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
        <div className="w-full max-w-4xl mb-2">
        <div className="text-center mb-2">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">How It Works</h2>
              <p className="text-gray-400 text-sm">Simple steps to earn rewards together</p>
            </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 p-2 shadow-lg">
           
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
        <div className="w-full max-w-4xl mb-2">
        <div className="px-6 py-4 border-b text-center border-zinc-800/50">
              <h3 className="text-xl md:text-2xl font-bold text-white">Reward Tiers</h3>
              <p className="text-sm text-gray-400 mt-1">Higher stakes = Higher rewards for both</p>
            </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
          
            
            <div className="p-2">
              <div className="space-y-2">
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
                          <p className="font-bold text-white">+{((parseFloat(tier.you) / 10) % 1 === 0) ? (parseFloat(tier.you) / 10).toFixed(0) : (parseFloat(tier.you) / 10).toFixed(1)} USDT</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Friend</p>
                          <p className="font-bold text-white">+{((parseFloat(tier.friend) / 10) % 1 === 0) ? (parseFloat(tier.friend) / 10).toFixed(0) : (parseFloat(tier.friend) / 10).toFixed(1)} USDT</p>
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
        <div className="w-full max-w-4xl mb-2">
        <div className="px-6 py-4 border-b text-center border-zinc-800/50">
              <h3 className="text-xl font-bold text-white">Your Referrals</h3>
              <p className="text-sm text-gray-400 mt-1">Friends who joined using your link</p>
            </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
          
            
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

        {/* Claim History */}
        {address && <ClaimHistoryTable address={address} />}

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

function ClaimHistoryTable({ address }: { address: string }) {
  const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaimHistory = async () => {
      try {
        const response = await fetch(`/api/claim/history?wallet=${address}`);
        const data = await response.json();
        setClaimHistory(data.history || []);
      } catch (error) {
        console.error('Error fetching claim history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchClaimHistory();
    }
  }, [address]);

  if (!address) return null;
  if (loading) return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-8">
      <div className="text-center py-8 text-gray-400">Loading claim history...</div>
    </div>
  );
  if (claimHistory.length === 0) return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-8">
      <div className="text-center py-8 text-gray-400">No claim history found</div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-8">
      <div className="bg-black/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Claim History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount (USDT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {claimHistory.map((claim) => (
                <tr key={claim.transaction_hash} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {format(new Date(claim.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-yellow-400 font-medium">
                      {parseFloat(claim.amount_claimed).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={`https://testnet.bscscan.com/tx/${claim.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {claim.transaction_hash.slice(0, 8)}...{claim.transaction_hash.slice(-6)}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full",
                      claim.status === 'completed' 
                        ? "bg-green-400/10 text-green-400"
                        : claim.status === 'pending'
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-red-400/10 text-red-400"
                    )}>
                      {claim.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table> 
        </div>
      </div>
    </div>
  );
} 