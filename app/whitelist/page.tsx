'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle, Mail, AlertTriangle } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { fetchCryptoPrices } from '@/lib/priceService';
// Remove direct service import - we'll use API routes instead

// Chain IDs
const BSC_MAINNET_CHAIN_ID = 56;
const ETH_MAINNET_CHAIN_ID = 1;

// Minimum balance requirements - $100 USD worth of tokens for verification

export default function WhitelistPage() {
  const { isConnected, address } = useAccount();
  const [email, setEmail] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'ETH' | 'BNB' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);
  const [whitelistStats, setWhitelistStats] = useState({
    current: 0,
    target: 85312,
    percentage: 0,
    usersPerMinute: 0,
    minutesRemaining: 0
  });

  // Get wallet data for balance checking
  const chainId = selectedNetwork === 'ETH' ? ETH_MAINNET_CHAIN_ID : BSC_MAINNET_CHAIN_ID;
  const { userData } = useWallet(chainId);
  
  // State for crypto prices
  const [cryptoPrices, setCryptoPrices] = useState({ bnb: 0, eth: 0 });

  // Check if user has sufficient balance for the selected network
  const checkSufficientBalance = () => {
    if (!selectedNetwork || !userData.bnbBalance) return { sufficient: true, message: '' };
    
    const currentBalance = parseFloat(userData.bnbBalance);
    const networkName = selectedNetwork === 'ETH' ? 'Ethereum' : 'BSC';
    const tokenSymbol = selectedNetwork === 'ETH' ? 'ETH' : 'BNB';
    
    // Calculate minimum balance required for $100 USD
    let minBalanceRequired = 0;
    if (selectedNetwork === 'ETH') {
      minBalanceRequired = cryptoPrices.eth > 0 ? 100 / cryptoPrices.eth : 0.0001; // $100 worth of ETH
    } else {
      minBalanceRequired = cryptoPrices.bnb > 0 ? 100 / cryptoPrices.bnb : 0.1; // $100 worth of BNB
    }
    
    if (currentBalance < minBalanceRequired) {
      return {
        sufficient: false,
        message: `To verify that you are a genuine user, your wallet must hold at least $100 worth of ${tokenSymbol} (${minBalanceRequired.toFixed(6)} ${tokenSymbol}) on ${networkName}.  This is a balance check only — no tokens will be charged or withdrawn.`
      };
    }
    
    return { sufficient: true, message: '' };
  };

  const balanceCheck = checkSufficientBalance();

  // Fetch crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const prices = await fetchCryptoPrices();
        setCryptoPrices(prices);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };
    
    fetchPrices();
  }, []);

  // Calculate whitelist growth rate and progress
  useEffect(() => {
    const updateWhitelistStats = () => {
      const now = new Date();
      const startDate = new Date('2025-07-28T16:00:00Z'); // Start from July 28th, 12:15 UTC
      const targetDate = new Date('2025-08-10T12:00:00Z'); // End on August 10th, 12:00 UTC
      
      const timeRemaining = targetDate.getTime() - now.getTime();
      const minutesRemaining = Math.max(Math.floor(timeRemaining / (1000 * 60)), 0);
      
      // Calculate total duration and elapsed time
      const totalDuration = targetDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const elapsedMinutes = Math.max(Math.floor(elapsed / (1000 * 60)), 0);
      
      // Calculate current users based on time progression (0 to 85,312)
      const totalUsersNeeded = whitelistStats.target; // 0 to 85,312
      const usersPerMinuteForTarget = totalUsersNeeded / (totalDuration / (1000 * 60)); // Spread over total duration
      const currentUsers = Math.min(
        Math.floor(elapsedMinutes * usersPerMinuteForTarget),
        whitelistStats.target
      );
      
      // Calculate required growth rate to reach target
      const usersNeeded = whitelistStats.target - currentUsers;
      const usersPerMinute = minutesRemaining > 0 ? Math.ceil(usersNeeded / minutesRemaining) : 0;
      
      // If we haven't reached the start date yet, show initial values
      if (elapsed < 0) {
        setWhitelistStats(prev => ({
          ...prev,
          current: 0,
          percentage: 0,
          usersPerMinute: Math.ceil(totalUsersNeeded / (totalDuration / (1000 * 60))),
          minutesRemaining: minutesRemaining
        }));
        return;
      }
      
      const percentage = (currentUsers / whitelistStats.target) * 100;
      
      setWhitelistStats(prev => ({
        ...prev,
        current: currentUsers,
        percentage: percentage,
        usersPerMinute: usersPerMinute,
        minutesRemaining: minutesRemaining
      }));
    };

    updateWhitelistStats();
    const interval = setInterval(updateWhitelistStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [whitelistStats.target]);

  // Check if user is already whitelisted
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (isConnected && address) {
        try {
          const response = await fetch(`/api/whitelist?walletAddress=${address}`);
          const data = await response.json();
          
          if (data.success) {
            setIsWhitelisted(data.registrationStatus.registration_count > 0);
            setUserRegistrations(data.registrations || []);
          }
        } catch (error) {
          console.error('Error checking whitelist status:', error);
        }
      }
    };

    checkWhitelistStatus();
  }, [isConnected, address]);

  const handleWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error('Connect wallet first');
      return;
    }

    if (!email) {
      toast.error('Email required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Valid email required');
      return;
    }

    if (!selectedNetwork) {
      toast.error('Please select your preferred network');
      return;
    }

    if (!balanceCheck.sufficient) {
      toast.error(balanceCheck.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit whitelist registration via API
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          email: email,
          networkPreference: selectedNetwork,
          walletBalance: userData.bnbBalance || '0'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrorMessage(data.error || 'Registration already exists for this network.');
          setShowErrorModal(true);
        } else {
          toast.error(data.error || 'Failed to join whitelist. Please try again.');
        }
        return;
      }

      setIsWhitelisted(true);
      toast.success('Welcome to Phase 3 whitelist!');
      
      // Refresh user registrations
      const statusResponse = await fetch(`/api/whitelist?walletAddress=${address}`);
      const statusData = await statusResponse.json();
      if (statusData.success) {
        setUserRegistrations(statusData.registrations || []);
      }
    } catch (error: any) {
      console.error('Error joining whitelist:', error);
      toast.error('Failed to join whitelist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-20 md:pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
                     <div className="text-center mb-8">
             <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
               Phase 3 Whitelist
             </h1>
             <p className="text-gray-400 text-sm md:text-base">
               Exclusive access to the final presale round
             </p>
             
             {/* Whitelist Counter */}
             <div className="mt-6 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-2xl p-4">
               <div className="flex items-center justify-center gap-3">
                 <div className="text-3xl font-bold text-yellow-400">
                   {whitelistStats.current.toLocaleString()}
                 </div>
                 <div className="text-sm text-gray-400">
                   users already whitelisted
                 </div>
               </div>
             </div>
           </div>

          {/* Whitelist Announcement */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-4 py-6 md:p-8 mb-6 shadow-xl">
            
            {/* Status */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Final Round Registration
              </h2>
              <p className="text-gray-400 text-sm">
                Phase 3 launches <span className="text-yellow-400 font-semibold">August 10th at 12:00 UTC</span>
              </p>
            </div>

          

            {/* Allocation Details */}
                          <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-800/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">$0.14</div>
                  <div className="text-sm text-gray-400">Token Price</div>
                  <div className="text-xs text-gray-500 mt-1">Final presale pricing</div>
                </div>
                <div className="bg-zinc-800/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">$100</div>
                  <div className="text-sm text-gray-400">Fixed Allocation</div>
                  <div className="text-xs text-gray-500 mt-1">Per wallet maximum</div>
                </div>
              </div>

            {/* Key Information */}
            <div className="bg-zinc-800/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Important Details</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>Whitelist spots allocated on <span className="text-yellow-400">FCFS</span> basis</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>Unsold tokens from Phase 3 will be added to the <span className="text-blue-400">staking reward pool</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>Registration closes 12 hours before Phase 3 launch on August 10th</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span>A user wallet must hold at least <span className="text-green-400">$100 </span> worth of <span className="text-green-400">ETH or BNB</span> to join the whitelist</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                  <span><span className="text-orange-400">Note:</span> Balance check is for spam prevention only - <span className="text-green-400">no payment required</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl mb-20 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
            <div className="px-4 py-8 md:p-8">
                              {!isConnected ? (
                  <div className="text-center space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Connect Wallet</h3>
                      <p className="text-gray-400">
                        to secure your spot in the Phase 3 whitelist
                      </p>
                    </div>

                   

                    <Button
                      className="w-full h-14 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-yellow-400/25 text-lg"
                      onClick={() => setShowWalletModal(true)}
                    >
                      Join Whitelist
                    </Button>
                  </div>
                              ) : isWhitelisted ? (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Registration Successful!</h3>
                      <p className="text-gray-400 text-sm">
                        You now registered for Phase 3 whitelist access
                      </p>
                    </div>

                                         {/* Registration Details */}
                     <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
                       <div className="flex items-center justify-between">
                         <span className="text-gray-400 text-sm">Wallet Address:</span>
                         <span className="text-green-400 font-medium">
                           {address?.slice(0, 6)}...{address?.slice(-4)}
                         </span>
                       </div> 
                       {userRegistrations.length > 0 && (
                         <>
                           {userRegistrations.map((registration, index) => (
                             <div key={registration.id} className="flex items-center justify-between">
                               <span className="text-gray-400 text-sm">
                                 {index === 0 ? 'Registered Networks:' : ''}
                               </span>
                               <div className="flex items-center gap-2">
                                 <img 
                                   src={registration.network_preference === 'ETH' ? '/eth.svg' : '/bnb.svg'} 
                                   alt={registration.network_preference} 
                                   className="w-4 h-4" 
                                 />
                                 <span className="text-white font-medium">
                                   {registration.network_preference === 'ETH' ? 'Ethereum' : 'BSC'}
                                 </span>
                               </div>
                             </div>
                           ))}
                         </>
                       )}
                       <div className="flex items-center justify-between">
                         <span className="text-gray-400 text-sm">Total Allocation:</span>
                         <span className="text-green-400 font-medium">${userRegistrations.length * 100} BBLP</span>
                       </div>
                     </div>

                    {/* Next Steps */}
                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
                      <h4 className="text-yellow-400 font-medium mb-2">What happens next?</h4>
                      <div className="text-gray-400 text-sm text-left space-y-1">
                        <div>• You will receive an email notification before Phase 3 launch</div>
                        <div>• Phase 3 starts August 10th at 12:00 UTC</div>
                        <div>• You will have guaranteed access to purchase $100 worth of BBLP</div>
                        <div>• Purchase will be available on your selected network</div>
                      </div>
                    </div>
                  </div>
                              ) : (
                  <div className="space-y-5">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">Complete Registration</h3>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                      </div>
                    </div>

                    <form onSubmit={handleWhitelistSubmit} className="space-y-4">
                      {/* Network Selection */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Network Preference</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedNetwork('ETH')}
                            className={cn(
                              "px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                              selectedNetwork === 'ETH'
                                ? "border-yellow-400 bg-yellow-400/10 text-white"
                                : "border-zinc-700 bg-zinc-800/30 text-gray-400 hover:border-zinc-600 hover:text-gray-300"
                            )}
                          >
                            <img src="/eth.svg" alt="ETH" className="w-4 h-4" />
                            <span>Ethereum</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedNetwork('BNB')}
                            className={cn(
                              "px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                              selectedNetwork === 'BNB'
                                ? "border-yellow-400 bg-yellow-400/10 text-white"
                                : "border-zinc-700 bg-zinc-800/30 text-gray-400 hover:border-zinc-600 hover:text-gray-300"
                            )}
                          >
                            <img src="/bnb.svg" alt="BSC" className="w-4 h-4" />
                            <span>BSC</span>
                          </button>
                        </div>
                      </div>

                      {/* Email Input */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11 bg-zinc-800/30 border-zinc-700 text-white placeholder:text-gray-500 rounded-lg focus:border-yellow-400 transition-colors"
                            required
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Launch notification will be sent to this email
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting || !email || !selectedNetwork || !balanceCheck.sufficient}
                        className={cn(
                          "w-full h-11 font-semibold transition-all duration-200 rounded-lg mt-6",
                          isSubmitting || !email || !selectedNetwork || !balanceCheck.sufficient
                            ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black"
                        )}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Registering...
                          </div>
                        ) : (
                          'Complete Registration'
                        )}
                      </Button>

                      {/* Balance Warning */}
                      {selectedNetwork && !balanceCheck.sufficient && (
                        <div className="mt-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm">
                              {balanceCheck.message}
                            </p>
                          </div>
                          <p className="text-red-300 text-xs mt-2 ml-6">
                            Current balance: {parseFloat(userData.bnbBalance || '0').toFixed(6)} {selectedNetwork} (≈ ${(parseFloat(userData.bnbBalance || '0') * (selectedNetwork === 'ETH' ? cryptoPrices.eth : cryptoPrices.bnb)).toFixed(2)})
                          </p>
                        </div>
                      )}
                    </form>
                  </div>
              )}
            </div>
          </div>



        </div>

        <Particles
          quantityDesktop={40}
          quantityMobile={20}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
        
      </main>
      
             {/* Wallet Connection Modal */}
       <WalletModal 
         open={showWalletModal} 
         onClose={() => setShowWalletModal(false)} 
       />

       {/* Error Modal */}
       {showErrorModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full p-6">
             <div className="text-center">
               <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                 <AlertTriangle className="w-8 h-8 text-red-400" />
               </div>
               
               <h3 className="text-xl font-bold text-white mb-3">Registration Already Exists</h3>
               
               <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                 {errorMessage}
               </p>
               
               <Button
                 onClick={() => setShowErrorModal(false)}
                 className="w-full h-11 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
               >
                 Understood
               </Button>
             </div>
           </div>
         </div>
       )}
     </>
   );
} 