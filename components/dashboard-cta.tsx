'use client'

import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import TextBlur from "@/components/ui/text-blur";
import AnimatedShinyText from "@/components/ui/shimmer-text";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useChainId, useSwitchChain, useChains, useBalance } from 'wagmi';
import { FaTriangleExclamation, FaCreditCard, FaRegCopy, FaCheck } from "react-icons/fa6";
import { Info, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from 'react';
import { userService, cardService, Card } from '@/lib/supabase';
import { UserData } from '@/types';
import { ethers } from 'ethers';
import CreditCard from './CreditCard';
import CardPrioritiesModal from "./ui/card-priorities-modal";

interface DashboardCTAProps {
  userData: UserData;
  totalUsd: number;
}

export default function DashboardCTA({ userData, totalUsd }: DashboardCTAProps) {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'features'>('details');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Animation controls
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.3, 0.5, 1, 0.5, 0.3]);
  const scale = useTransform(x, [-200, -150, 0, 150, 200], [0.8, 0.9, 1, 0.9, 0.8]);

  // Get user's BNB balance
  const { data: balance } = useBalance({
    address: address,
    chainId: 97, // BSC Testnet
  });

  // Debug logging
  useEffect(() => {
    console.log('Debug Info:', {
      chainId,
      chainType: typeof chainId,
      chain,
      isConnected,
      chains: chains.map(c => ({ id: c.id, name: c.name }))
    });
  }, [chainId, chain, isConnected, chains]);

  // Check if user is on the correct network (BSC Testnet - Chain ID 97)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCTestnet = actualChainId === 97; // BSC Testnet Chain ID
        
  // Save user to database when wallet is connected to correct network
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address && isOnBSCTestnet) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully');
          
          // Load user cards after saving user
          loadUserCards(address);
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, isOnBSCTestnet]);

  // Load user cards
  const loadUserCards = async (walletAddress: string) => {
    setIsLoadingCards(true);
    try {
      const cards = await cardService.getUserCards(walletAddress);
      setUserCards(cards);
      console.log('User cards loaded:', cards);
    } catch (error) {
      console.error('Error loading user cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  // Calculate staked amount and determine card reservation status
  const getStakedAmount = () => {
    try {
      if (!userData.stakedAmount) return 0;
      // Convert from wei if needed, or parse directly if already formatted
      if (userData.stakedAmount.includes('.')) {
        return parseFloat(userData.stakedAmount);
      }
      return parseFloat(ethers.formatEther(userData.stakedAmount));
    } catch {
      return 0;
    }
  };

  const stakedAmount = getStakedAmount();

  // Determine if card should be reserved based on staking amount
  const isCardReserved = (cardType: string) => {
    switch (cardType) {
      case 'bronze':
        return stakedAmount >= 1000;
      case 'silver':
        return stakedAmount >= 2000;
      case 'black':
        return stakedAmount >= 3500;
      default:
        return false;
    }
  };

  const handleNetworkSwitch = async () => {
    try {
      // Try wagmi first
      try {
        await switchChain({ chainId: 97 }); // BSC Testnet Chain ID
        return;
      } catch (wagmiError: any) {
        console.log('Wagmi switch failed, trying manual method:', wagmiError);
        
        // Manual network addition/switch using window.ethereum
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          try {
            // Try to switch first
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x61' }], // 97 in hex
            });
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                  chainId: '0x61',
                  chainName: 'BSC Testnet',
                  nativeCurrency: {
                    name: 'BNB',
                    symbol: 'tBNB',
                    decimals: 18
                  },
                  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
                  blockExplorerUrls: ['https://testnet.bscscan.com']
                }],
                });
              } catch (addError) {
                throw addError;
              }
            } else {
              throw switchError;
            }
          }
        } else {
          throw new Error('MetaMask not found');
        }
      }
    } catch (error: any) {
      console.error('Network switch failed:', error);
      toast.error('Network switch failed: ' + error.message);
    }
  };

  // Copy handler with feedback
  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handlePrevCard = () => {
    controls.start({
      x: [0, 150, 0],
      transition: { type: "spring", stiffness: 300, damping: 30 }
    });
    setCurrentCardIndex((prev) => (prev === 0 ? userCards.length - 1 : prev - 1));
  };

  const handleNextCard = () => {
    controls.start({
      x: [0, -150, 0],
      transition: { type: "spring", stiffness: 300, damping: 30 }
    });
    setCurrentCardIndex((prev) => (prev === userCards.length - 1 ? 0 : prev + 1));
  };
  
  // Handle drag gestures for card swiping
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      handlePrevCard();
    } else if (info.offset.x < -threshold) {
      handleNextCard();
    } else {
      // Reset to center if not past threshold
      controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 500, damping: 30 }
      });
    }
    
    setIsDragging(false);
  };

  // Calculate required stake amount for current active card
  const getRequiredStakeAmount = () => {
    if (userCards.length === 0) return 0;
    
    const currentCard = userCards[currentCardIndex];
    if (!currentCard) return 0;

    const currentStaked = stakedAmount;
    let requiredAmount = 0;

    switch (currentCard.card_type) {
      case 'bronze':
        requiredAmount = Math.max(0, 1000 - currentStaked);
        break;
      case 'silver':
        requiredAmount = Math.max(0, 2000 - currentStaked);
        break;
      case 'black':
        requiredAmount = Math.max(0, 3500 - currentStaked);
        break;
      default:
        requiredAmount = 0;
    }

    return requiredAmount;
  };

  // Handle stake button click
  const handleStakeClick = () => {
    const requiredAmount = getRequiredStakeAmount();
    // Always send the required amount, even if it's 0
    window.location.href = `/stake?amount=${requiredAmount}`;
  };

  // Card carousel component with touch/drag support
  const CardCarousel = () => {
    return (
      <div className="relative w-full mt-10 max-w-[800px] mx-auto">
        <div 
          className="relative h-[280px] sm:h-[300px] md:h-[340px] lg:h-[380px] flex items-center justify-center"
          style={{ perspective: "1200px" }}
        >
          {/* Cards Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {userCards.map((card, index) => {
              const isCenter = index === currentCardIndex;
              const isLeft = index === (currentCardIndex === 0 ? userCards.length - 1 : currentCardIndex - 1);
              const isRight = index === (currentCardIndex === userCards.length - 1 ? 0 : currentCardIndex + 1);
              
              if (!isCenter && !isLeft && !isRight) return null;

              return (
                <motion.div
                  key={card.id}
                  className={`absolute cursor-pointer`}
                  initial={false}
                  animate={isCenter ? {
                    x: 0,
                    rotateY: 0,
                    scale: 1,
                    opacity: 1,
                    zIndex: 10
                  } : isLeft ? {
                    x: -150,
                    rotateY: 15,
                    scale: 0.85,
                    opacity: 0.6,
                    zIndex: 5
                  } : {
                    x: 150,
                    rotateY: -15,
                    scale: 0.85,
                    opacity: 0.6,
                    zIndex: 5
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                  }}
                  onClick={() => {
                    if (!isDragging) {
                      if (!isCenter) {
                        isLeft ? handlePrevCard() : handleNextCard();
                      } else {
                        setModalTab('details');
                        setShowCardModal(true);
                      }
                    }
                  }}
                  style={isCenter ? {
                    x,
                    rotateY: rotate,
                    scale,
                    opacity,
                    transformStyle: "preserve-3d",
                  } : {
                    transformStyle: "preserve-3d",
                  }}
                  drag={isCenter ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.1}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  whileTap={isCenter ? { cursor: "grabbing" } : undefined}
                >
                  <div className={`w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px] transition-shadow duration-300 ${isCenter ? 'shadow-xl' : 'shadow-md'}`}>
                    <CreditCard
                      cardType={card.card_type as 'bronze' | 'silver' | 'black'}
                      cardNumber={card.card_number}
                      cvv={card.cvv}
                      expirationDate={card.expiration_date}
                      isReserved={isCardReserved(card.card_type)}
                      balance={`$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      onClick={() => {}}
                    />
                  </div>
                  
                  {/* Add reflection effect for premium look */}
                  {isCenter && (
                    <div 
                      className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none"
                      style={{ transform: "translateZ(1px)" }}
                    />
                  )}

                  {/* Card Features Button & Dots - Hemen kartın altına, çok az boşlukla */}
                  {isCenter && (
                    <div className="flex items-center justify-center gap-2 mt-2 -mb-5">
                      <button
                        onClick={() => {
                          setModalTab('features');
                          setTimeout(() => setShowCardModal(true), 0);
                        }}
                        className="text-yellow-200 font-semibold text-sm underline underline-offset-4 hover:text-yellow-300 transition-colors"
                        aria-label="See card features and limits"
                      >
                        See Card Features & Limits
                      </button>
                      <div className="flex gap-1 ml-2">
                        {userCards.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentCardIndex(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === currentCardIndex
                                ? "w-8 bg-yellow-200 shadow-lg"
                                : "w-2 bg-zinc-600 hover:bg-zinc-500"
                            }`}
                            aria-label={`Go to card ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          
        </div>
      </div>
    );
  };

  const getCardFeatures = (cardType: string) => {
    switch (cardType) {
      case 'bronze':
        return {
          title: '',
          features: [
            'Digital subscriptions only',
            '2% BBLIP rewards on subscriptions',
            '$200 monthly subscription limit',
            'Virtual card only',
            'Subscription management dashboard'
          ],
          featuresDetailed: [
            { title: 'Digital Subscriptions', desc: 'Digital subscriptions only' },
            { title: 'BBLIP Rewards', desc: '2% BBLIP rewards on subscriptions' },
            { title: 'Subscription Limit', desc: '$200 monthly subscription limit' },
            { title: 'Virtual Card', desc: 'Virtual card only' },
            { title: 'Subscription Management', desc: 'Subscription management dashboard' }
          ],
          limits: {
            daily: 200,
            monthly: 200,
            type: 'Daily Limit'
          }
        };
      case 'silver':
        return {
          title: 'E-Commerce Card',
          features: [
            'Online shopping specialized',
            '1.5% BBLIP rewards on e-commerce',
            '$1,000 daily online limit',
            'E-commerce protection insurance',
            'Shopping analytics dashboard'
          ],
          featuresDetailed: [
            { title: 'Online Shopping', desc: 'Online shopping specialized' },
            { title: 'BBLIP Rewards', desc: '1.5% BBLIP rewards on e-commerce' },
            { title: 'Online Limit', desc: '$1,000 daily online limit' },
            { title: 'E-commerce Protection', desc: 'E-commerce protection insurance' },
            { title: 'Shopping Analytics', desc: 'Shopping analytics dashboard' }
          ],
          limits: {
            daily: 1000,
            monthly: 5000,
            type: 'Daily Limit'
          }
        };
      case 'black':
        return {
          title: 'Premium Physical Card',
          features: [
            'NFC enabled physical card',
            '$25,000 daily payment limit',
            'Apple Pay / Google Pay ready',
            'Premium metal card design'
          ],
          featuresDetailed: [
            { title: 'NFC Enabled', desc: 'NFC enabled physical card' },
            { title: 'Payment Limit', desc: '$25,000 daily payment limit' },
            { title: 'Apple Pay / Google Pay', desc: 'Apple Pay / Google Pay ready' },
            { title: 'Premium Design', desc: 'Premium metal card design' }
          ],
          limits: {
            daily: 25000,
            monthly: 50000,
            type: 'Daily Limit'
          }
        };
      default:
        return {
          title: '',
          features: [],
          featuresDetailed: [],
          limits: {
            daily: 0,
            monthly: 0,
            type: ''
          }
        };
    }
  };

  // Add a helper to format expiration date as MM/YY
  const formatExpiry = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${yy}`;
  };


  const [showPrioritiesModal, setShowPrioritiesModal] = useState(false);


  return (
    <motion.div
      className="flex w-full max-w-2xl flex-col mt-10 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible">

      {/* Network Switch Button - Only show when on wrong network */}
      {!isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-20 -mb-5 flex w-full justify-center">
          <div className="flex w-full max-w-[24rem] flex-col gap-2">
            <button
              onClick={handleNetworkSwitch}
              disabled={isSwitching}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaTriangleExclamation className="w-4 h-4" />
              {isSwitching ? "Switching Network..." : " Switch to BSC Testnet"}
            </button>
          </div>
        </motion.div>
      )}

      {/* User Cards Display - Only show when on correct network */}
      {isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-8 w-full">
          {isLoadingCards ? (
            <div className="flex justify-center">
              <div className="text-zinc-400">Loading your cards...</div>
            </div>
          ) : userCards.length > 0 ? (
            <CardCarousel />
          ) : (
            <div className="flex justify-center">
              <div className="text-zinc-400">No cards found. Cards should be generated automatically.</div>
            </div>
          )}
        </motion.div>
      )}

   

      {/* Staking CTA for current active card */}
      {isOnBSCTestnet && userCards.length > 0 && (
        <motion.div variants={itemVariants} className="mt-4">
          {!isCardReserved(userCards[currentCardIndex]?.card_type) ? (
            // Card Not Activated - Yellow Theme
            <div className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Info className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-1">Card Activation Required</h4>
                  <p className="text-xs text-gray-400">
                    Stake {getRequiredStakeAmount().toLocaleString()} BBLIP to activate your {userCards[currentCardIndex]?.card_type} card
                  </p>
                </div>
                <EnhancedButton
                  onClick={handleStakeClick}
                  size="sm" variant="ghost" className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10"
                >
                  Activate Now
                </EnhancedButton>
              </div>
            </div>
          ) : (
            // Card Activated - Green Theme
            <div className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 backdrop-blur-xl rounded-2xl border border-green-500/20 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                                 <div className="flex-1">
                   <h4 className="text-sm font-semibold text-green-300 mb-2"> <span className="text-green-200 font-medium capitalize">{userCards[currentCardIndex]?.card_type}</span> card is now reserved</h4>
                   <div className="space-y-1">
                    
                     <p className="text-xs text-gray-400">
                       Earning <span className="text-yellow-300 font-medium">2x staking rewards</span> during development
                     </p>
                     <p className="text-xs text-gray-400">
                      Full card access launches soon — stay tuned!
                     </p>
                   </div>
                 </div>
                 <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrioritiesModal(true);
                  }}
                  className="px-3 py-1 text-xs font-semibold text-white bg-green-500/20 hover:bg-green-500/30 rounded-full transition-colors"
                >
                  Set Priorities
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}


    

      {/* Network requirement notice */}
      {!isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-red-600 text-sm">
              Switch to BSC to view your cards and access all features.
            </p>
        </motion.div>
      )}

      {/* Card Features Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-yellow-400/10 relative">
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-yellow-200 text-xl font-bold"
              aria-label="Close card details modal"
            >
              ×
            </button>
            {/* Tab Bar */}
            <div className="flex mb-6 border-b border-yellow-400/10">
              <button
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${modalTab === 'details' ? 'text-yellow-200 border-b-2 border-yellow-200' : 'text-zinc-400 hover:text-yellow-200'}`}
                onClick={() => setModalTab('details')}
              >
                Details
              </button>
              <button
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${modalTab === 'features' ? 'text-yellow-200 border-b-2 border-yellow-200' : 'text-zinc-400 hover:text-yellow-200'}`}
                onClick={() => setModalTab('features')}
              >
                Features
              </button>
            </div>
            {/* Tab Content */}
            {modalTab === 'details' ? (
              <div className="flex flex-col gap-4">
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-yellow-400/10 rounded-xl p-5 shadow flex flex-col gap-4 relative">
                  {/* Card Number Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-zinc-400 font-medium mb-1">Card Number</div>
                      <div className="font-mono text-xl text-yellow-100 tracking-widest select-none">
                        {userCards[currentCardIndex]?.card_number.replace(/(\d{4})/g, (_, group, offset) => {
                          const isLast = offset + 4 >= userCards[currentCardIndex]?.card_number.length;
                          return isLast ? group : '**** ';
                        })}
                      </div>
                      {copiedField === 'number' && <div className="text-xs text-green-400 mt-1 animate-pulse">Copied!</div>}
                    </div>
                    <button
                      onClick={() => {
                        const cardNumber = userCards[currentCardIndex]?.card_number;
                        const maskedNumber = cardNumber.slice(-4).padStart(16, '*');
                        handleCopy(maskedNumber, 'number');
                      }}
                      className="text-yellow-200 hover:text-yellow-300 p-2 rounded-full border border-yellow-400/20 bg-black/30 ml-2"
                      aria-label="Copy card number"
                    >
                      {copiedField === 'number' ? <FaCheck className="w-5 h-5 text-green-400" /> : <FaRegCopy className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* CVV & Expiry Row */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-zinc-400 font-medium mb-1">CVV</div>
                        <div className="font-mono text-lg text-yellow-100 select-all">{userCards[currentCardIndex]?.cvv}</div>
                        {copiedField === 'cvv' && <div className="text-xs text-green-400 mt-1 animate-pulse">Copied!</div>}
                      </div>
                      <button
                        onClick={() => handleCopy(userCards[currentCardIndex]?.cvv, 'cvv')}
                        className="text-yellow-200 hover:text-yellow-300 p-2 rounded-full border border-yellow-400/20 bg-black/30 ml-2"
                        aria-label="Copy CVV"
                      >
                        {copiedField === 'cvv' ? <FaCheck className="w-5 h-5 text-green-400" /> : <FaRegCopy className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-zinc-400 font-medium mb-1">Expires</div>
                        <div className="font-mono text-lg text-yellow-100 select-all">{formatExpiry(userCards[currentCardIndex]?.expiration_date)}</div>
                        {copiedField === 'exp' && <div className="text-xs text-green-400 mt-1 animate-pulse">Copied!</div>}
                      </div>
                      <button
                        onClick={() => handleCopy(userCards[currentCardIndex]?.expiration_date, 'exp')}
                        className="text-yellow-200 hover:text-yellow-300 p-2 rounded-full border border-yellow-400/20 bg-black/30 ml-2"
                        aria-label="Copy expiration date"
                      >
                        {copiedField === 'exp' ? <FaCheck className="w-5 h-5 text-green-400" /> : <FaRegCopy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
             
              
                {/* Features Grid with Titles and Descriptions */}
                <div className="grid grid-cols-1 gap-3 mt-2 mb-4">
                  {getCardFeatures(userCards[currentCardIndex]?.card_type).featuresDetailed?.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 py-2 border-b border-yellow-400/5 last:border-0">
                      <span className="mt-1 w-2 h-2 rounded-full bg-yellow-300 inline-block"></span>
                      <div>
                        <div className="text-sm text-yellow-200 font-semibold">{feature.title}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Financial Limits Box */}
                <div className="bg-black/30 rounded-lg p-3 border border-yellow-400/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 font-medium">Daily Limit</span>
                    <span className="text-yellow-200 font-bold">${getCardFeatures(userCards[currentCardIndex]?.card_type)?.limits?.daily?.toLocaleString?.() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 font-medium">Monthly Limit</span>
                    <span className="text-yellow-200 font-bold">${getCardFeatures(userCards[currentCardIndex]?.card_type)?.limits?.monthly?.toLocaleString?.() || '0'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <CardPrioritiesModal
        isOpen={showPrioritiesModal}
        onClose={() => setShowPrioritiesModal(false)}
        cardType={userCards[currentCardIndex]?.card_type as 'bronze' | 'silver' | 'black'}
      />
    </motion.div>
  );
} 