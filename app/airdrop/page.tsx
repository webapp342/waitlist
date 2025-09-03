'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { referralService, userService, ReferralCode } from '@/lib/supabase';
import { useAccount } from 'wagmi';
import Header from "@/components/header";
import Particles from "@/components/ui/particles"; 
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from "@/lib/animation-variants";

interface ReferralLeaderboardEntry {
  rank: number;
  userId: number;
  walletAddress: string;
  invitedCount: number;
  totalRewards: string;
  isCurrentUser?: boolean;
}

// getRankBadge fonksiyonu kaldırıldı - sadece #rank formatı kullanılıyor

// getRankColor fonksiyonu kaldırıldı - kullanılmıyor

export default function ReferralLeaderboardPage() {
  const { address } = useAccount();
  const [topReferrers, setTopReferrers] = useState<ReferralLeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<ReferralLeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalReferrals: 0,
    averageReferrals: 0
  });
  const [activeTab, setActiveTab] = useState<'airdrop' | 'earn' | 'leaderboard'>('airdrop');
  const [xConnected, setXConnected] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Wallet bağlantısı olmadan da çalışsın
      const dummyAddress = '0x0000000000000000000000000000000000000000';
      const leaderboardData = await referralService.getLeaderboard(dummyAddress);
      
      // Eğer yeni bir kullanıcı bağlandıysa, onun için özel işlem yap
      if (address && address !== dummyAddress) {
        console.log('Loading leaderboard for connected wallet:', address);
      }
      
      // X bağlantısı localStorage'dan kontrol ediliyor, API çağrısına gerek yok
      // X connection status is controlled from localStorage, no API call needed
      
      console.log('Raw leaderboard data:', leaderboardData);
      
      // Top 100 kullanıcıyı direkt kullan (zaten sıralanmış geliyor)
      const top100 = leaderboardData.topUsers.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      setTopReferrers(top100);
      
      console.log('Top 100 for display:', top100);
      console.log('Leaderboard data:', leaderboardData);
      
      // Mevcut kullanıcının rank'ı backend'den geliyor, sadece set et
      if (leaderboardData.currentUserRank) {
        console.log('Setting currentUserRank from backend:', leaderboardData.currentUserRank);
        setCurrentUserRank(leaderboardData.currentUserRank);
      } else {
        console.log('No currentUserRank from backend, wallet address:', address);
        
        // Fallback: Eğer backend'den currentUserRank gelmiyorsa, frontend'de oluştur
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          console.log('Creating fallback currentUserRank for wallet:', address);
          
          // Top 100'de kullanıcı var mı kontrol et
          const userInTop100 = top100.find(
            entry => entry.walletAddress.toLowerCase() === address.toLowerCase()
          );
          
          if (userInTop100) {
            console.log('User found in top 100, using that data');
            setCurrentUserRank({ ...userInTop100, isCurrentUser: true });
          } else {
            console.log('User not in top 100, will create basic currentUserRank');
            // Bu durumda ensureUserExists useEffect'inde currentUserRank oluşturulacak
          }
        }
      }
      
      // İstatistikleri hesapla (sadece top 100'den)
      const totalRefs = top100.reduce((sum, entry) => sum + entry.invitedCount, 0);
      const avgRefs = top100.length > 0 ? totalRefs / top100.length : 0;
      
      setStats({
        totalParticipants: top100.length,
        totalReferrals: totalRefs,
        averageReferrals: Math.round(avgRefs * 100) / 100
      });
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sayfa yüklendiğinde ve address değiştiğinde çalıştır
    loadLeaderboard();
  }, [address]); // address dependency'sini ekledik

  // Countdown timer
  useEffect(() => {
    const targetDate = new Date('2025-09-29T12:00:00Z');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown('Available Now!');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Check localStorage for X task completion and ensure user exists in database
  useEffect(() => {
    const ensureUserExists = async () => {
      if (address) {
        // Check X task completion
        const xTaskCompleted = localStorage.getItem('xTaskCompleted');
        setXConnected(xTaskCompleted === 'true');
        
        // Check if user exists in database, if not create them
        try {
          let user = await userService.getUserByWallet(address);
          if (!user) {
            console.log('User not found, creating new user for wallet:', address);
            user = await userService.addUser(address);
            console.log('New user created:', user);
          }
          
          // Get referral code for the user
          if (user) {
            try {
              let code = await referralService.getReferralCodeByUserId(user.id);
              if (!code) {
                // Generate referral code if user doesn't have one
                code = await referralService.generateReferralCode(address);
              }
              setReferralCode(code);
              
              // Yeni kullanıcı oluşturulduktan sonra leaderboard'u güncelle
              if (user.created_at) {
                const now = new Date();
                const userCreatedAt = new Date(user.created_at);
                const timeDiff = now.getTime() - userCreatedAt.getTime();
                
                // Eğer kullanıcı son 5 saniyede oluşturulduysa, leaderboard'u güncelle
                if (timeDiff < 5000) {
                  console.log('New user detected, updating leaderboard...');
                  setTimeout(() => loadLeaderboard(), 1000); // 1 saniye sonra güncelle
                }
              }
              
              // Referral code oluşturulduktan sonra da leaderboard'u güncelle
              if (code && code.created_at) {
                const now = new Date();
                const codeCreatedAt = new Date(code.created_at);
                const timeDiff = now.getTime() - codeCreatedAt.getTime();
                
                // Eğer referral code son 5 saniyede oluşturulduysa, leaderboard'u güncelle
                if (timeDiff < 5000) {
                  console.log('New referral code detected, updating leaderboard...');
                  setTimeout(() => loadLeaderboard(), 1500); // 1.5 saniye sonra güncelle
                }
              }
              
              // Eğer currentUserRank yoksa, burada oluştur
              if (!currentUserRank && user) {
                console.log('Creating currentUserRank in ensureUserExists for user:', user.id);
                
                const referralCount = code?.total_referrals || 0;
                const userRank = referralCount > 0 ? 1000 : user.id; // Basit fallback
                
                const fallbackCurrentUserRank = {
                  rank: userRank,
                  userId: user.id,
                  walletAddress: address,
                  invitedCount: referralCount,
                  totalRewards: code?.total_rewards_earned || '0',
                  isCurrentUser: true
                };
                
                console.log('Setting fallback currentUserRank:', fallbackCurrentUserRank);
                setCurrentUserRank(fallbackCurrentUserRank);
              }
            } catch (error) {
              console.error('Error getting referral code:', error);
            }
          }
        } catch (error) {
          console.error('Error ensuring user exists:', error);
        }
      } else {
        setXConnected(false);
      }
    };

    ensureUserExists();
  }, [address]);

  const formatWalletAddress = (address: string) => {
    if (!address || address === 'Unknown' || address === '') return 'Unknown';
    if (address.length < 10) return address; // Kısa adresler için
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-10 md:pt-10">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
          <Header />
          <div className="flex items-center justify-center py-20 mt-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
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

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          
          {/* Hero Section */}
          <div className="text-center mb-8 mt-10">
            {/* 3D Coin Image */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mb-8 flex justify-center"
            >
              <img 
                src="/3D.png" 
                alt="Bblip Protocol 3D Coin" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
              />
            </motion.div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-6"
            >
              <motion.h1 
                variants={itemVariants}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-4"
              >
                Bblip Protocol Airdrop
              </motion.h1>
                             <motion.p 
                 variants={itemVariants}
                 className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-xl px-4"
               >
                 Join the revolution and claim your exclusive BBLP tokens. Early supporters get rewarded for their loyalty to the Bblip Protocol ecosystem.
               </motion.p>
            </motion.div>
          </div>

          {/* Tabs System */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            {/* Tab Headers */}
            <div className="flex border-b border-zinc-700 mb-6">
              <button
                onClick={() => setActiveTab('airdrop')}
                className={`px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'airdrop'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Airdrop
              </button>
              <button
                onClick={() => setActiveTab('earn')}
                className={`px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'earn'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Earn
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Leaderboard
              </button>
            </div>



            {/* Tab Content */}
            {activeTab === 'airdrop' && (
              <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/50 p-4">
                <div className="text-center">
                
                  
                  {/* Progress Steps - Mobile Responsive */}
                  <div className="mb-8">
                    {/* Desktop: Horizontal Steps */}
                    <div className="hidden md:flex items-center justify-center gap-6">
                      {/* Step 1: Connect Wallet */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${
                          address ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-800/50 border-zinc-700'
                        }`}>
                          {address ? (
                            <span className="text-xs text-zinc-200">✓</span>
                          ) : (
                            <span className="text-xs text-zinc-500">1</span>
                          )}
                        </div>
                        <div>
                          <h4 className={`font-medium text-left text-sm ${
                            address ? 'text-zinc-200' : 'text-zinc-400'
                          }`}>
                            Connect Wallet
                          </h4>
                          <p className="text-xs text-left text-zinc-500">Secure Web3 Connection</p>
                        </div>
                      </div>

                      {/* Step 2: Social Verification */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${
                          xConnected && address ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-800/50 border-zinc-700'
                        }`}>
                          {xConnected && address ? (
                            <span className="text-xs text-zinc-200">✓</span>
                          ) : (
                            <span className="text-xs text-zinc-500">2</span>
                          )}
                        </div>
                        <div>
                          <h4 className={`font-medium text-left text-sm ${
                            xConnected && address ? 'text-zinc-200' : 'text-zinc-400'
                          }`}>
                            Check Eligibility
                          </h4>
                          <p className="text-xs text-left text-zinc-500">Verify your allocation</p>
                        </div>
                      </div>

                      {/* Step 3: Claim Tokens */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-2 bg-zinc-800/50 border-zinc-700 flex items-center justify-center">
                          <span className="text-xs text-zinc-500">3</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-left text-sm text-zinc-400">Claim Tokens</h4>
                          <p className="text-xs text-left text-zinc-500">BBLP Token Distribution</p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Current Step Only */}
                    <div className="md:hidden text-left">
                      {!address ? (
                        // Step 1: Connect Wallet
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border-2 bg-zinc-800/50 border-zinc-700 flex items-center justify-center">
                            <span className="text-xs text-zinc-500">1</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-zinc-400">Connect Wallet</h4>
                            <p className="text-xs text-zinc-500">Secure Web3 Connection</p>
                          </div>
                        </div>
                      ) : !xConnected ? (
                        // Step 2: Check Eligibility
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border-2 bg-zinc-800/50 border-zinc-700 flex items-center justify-center">
                            <span className="text-xs text-zinc-500">2</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-zinc-400">Check Eligibility</h4>
                            <p className="text-xs text-zinc-500">Verify your allocation</p>
                          </div>
                        </div>
                      ) : (
                        // Step 3: Claim Tokens
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border-2 bg-zinc-700 border-zinc-600 flex items-center justify-center">
                            <span className="text-xs text-zinc-200">3</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-zinc-200">Claim Tokens</h4>
                            <p className="text-xs text-zinc-500">BBLP Token Distribution</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Connect Wallet Section - Show when wallet not connected */}
                  {!address && (
                    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 mb-6">
                      <div className="text-center mb-4">
                        <h4 className="text-white font-semibold text-lg mb-2">Wallet Connection Required</h4>
                      </div>
                      
                      <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700/50">
                        <p className="text-zinc-300 text-sm leading-relaxed">
                          To participate in the BBLP airdrop, you need to connect your Web3 wallet. 
                        </p>
                      </div>
                      
                     
                    </div>
                  )}

                  {/* X Task Section - Show when wallet connected but X not completed */}
                  {address && !xConnected && (
                    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 mb-6">
                    
                      
                      <ul className="text-zinc-400 text-sm space-y-2 mb-4 text-center">
                        <li className="flex items-center justify-center gap-2">
                          <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                          Visit the official BBLP X post
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                          Like and retweet 
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                          Return here to continue
                        </li>
                      </ul>
                      
                      <div className="text-center">
                        <button
                          onClick={() => {
                            window.open('https://x.com/BblipProtocol/status/1944492827678785944', '_blank');
                            localStorage.setItem('xTaskCompleted', 'true');
                            setXConnected(true);
                          }}
                          className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
                        >
                          Complete X Task
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Countdown Timer - Show when all steps are completed (Step 3) */}
                  {address && xConnected && (
                    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/50 p-4">
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-white mb-2">Token Launch Countdown</h3>
                        <p className="text-gray-400 text-sm">Get ready for the official launch</p>
                      </div>
                      
                      {/* Countdown Display */}
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400 mb-2 font-mono">
                          {countdown || 'Loading...'}
                        </div>
                        <div className="text-sm text-zinc-400">
                          Until BBLP tokens become available for claim
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'earn' && (
              <>
                {/* Wallet Not Connected Message */}
                {!address && (
                  <div className=" rounded-xl  mb-6 overflow-hidden">
                    <div className="p-8 text-center">
                    
                      <p className="text-zinc-400 mb-4">
                        Connect your wallet to see your referral link and start inviting friends to earn points.
                      </p>
                  
                    </div>
                  </div>
                )}

                {/* Referral Link Card - Professional Design */}
                {address && (
                  <div className="bg-gradient-to-r from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-700/50 mb-6 overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-zinc-800/40 px-4 py-3 border-b border-zinc-700/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <h4 className="text-white font-semibold text-sm">Invite & Earn</h4>
                        </div>
                        <div className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded-full">
                          Active
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-4">
                      {/* Link Display */}
                      <div className="mb-4">
                        <label className="block text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">
                          Your Referral Link
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-zinc-900/80 rounded-lg px-4 py-3 border border-zinc-700/50 min-w-0 backdrop-blur-sm">
                            <p className="text-sm text-zinc-200 font-mono truncate">
                              {referralCode ? 
                                `https://bblip.io?ref=${referralCode.code}` : 
                                `https://bblip.io?ref=${address.slice(0, 6)}...${address.slice(-4)}`
                              }
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const link = referralCode ? 
                                `https://bblip.io?ref=${referralCode.code}` : 
                                `https://bblip.io?ref=${address}`;
                              navigator.clipboard.writeText(link);
                              // Toast notification eklenebilir
                            }}
                            className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-zinc-900 font-semibold rounded-lg transition-all duration-200 flex-shrink-0 shadow-lg hover:shadow-yellow-500/25"
                            title="Copy referral link"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats & Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400 mb-1">1,200</div>
                            <div className="text-xs text-zinc-400 uppercase tracking-wider">Points per Referral</div>
                          </div>
                        </div>
                        <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30">
                          <div className="text-center">
                            <div className="text-lg font-bold text-zinc-200 mb-1">∞</div>
                            <div className="text-xs text-zinc-400 uppercase tracking-wider">Unlimited Referrals</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Call to Action */}
                      <div className="mt-4 text-center">
                        <p className="text-xs text-zinc-400">
                          Share your link and start earning <span className="font-semibold text-yellow-400">Points</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'leaderboard' && (
              <>
                {/* Current User Card */}
                {currentUserRank && (
                  <motion.div 
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-6 bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/50 p-4"
                  >
                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Rank */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-200">
                          #{currentUserRank.rank}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded">
                          You
                        </span>
                      </div>
                      
                      {/* User Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-200">
                            {formatWalletAddress(currentUserRank.walletAddress || address || '')}
                          </h3>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {currentUserRank.invitedCount} referrals
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="flex justify-end">
                        <div className="text-right">
                          <div className="text-sm font-bold text-zinc-200">
                            {(currentUserRank.invitedCount * 1200).toLocaleString()}
                          </div>
                          <div className="text-xs text-zinc-500">points</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Leaderboard Table */}
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700/50">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="text-left">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">RANK</h3>
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">USER</h3>
                      </div>
                      <div className="text-right">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">POINTS</h3>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard List */}
                  <div className="divide-y divide-zinc-800/50">
                    {topReferrers.map((entry, index) => (
                      <motion.div
                        key={entry.userId}
                        variants={itemVariants}
                        className="px-4 py-3 grid grid-cols-3 gap-4 items-center hover:bg-zinc-800/30"
                      >
                        {/* Rank Badge */}
                        <div className="flex justify-start">
                          <span className="text-sm font-bold text-zinc-200">
                            #{entry.rank}
                          </span>
                        </div>

                        {/* User Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-zinc-200">
                              {formatWalletAddress(entry.walletAddress || 'Unknown')}
                            </h3>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {entry.invitedCount} referrals
                          </div>
                        </div>

                        {/* Points */}
                        <div className="flex justify-end">
                          <div className="text-right">
                            <div className="text-sm font-bold text-zinc-200">
                              {(entry.invitedCount * 1200).toLocaleString()}
                            </div>
                            <div className="text-xs text-zinc-500">points</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
                </>
              )}
            </motion.div>




        </div>

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
    </>
  );
}
