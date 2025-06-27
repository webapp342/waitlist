'use client'

import { motion } from "framer-motion";
import TextBlur from "@/components/ui/text-blur";
import AnimatedShinyText from "@/components/ui/shimmer-text";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useDisconnect, useChainId, useSwitchChain, useChains, useBalance } from 'wagmi';
import { FaWallet, FaArrowRightFromBracket, FaTriangleExclamation, FaCreditCard } from "react-icons/fa6";
import { toast } from "sonner";
import { useEffect, useState } from 'react';
import { userService, cardService, Card } from '@/lib/supabase';
import { UserData } from '@/types';
import { ethers } from 'ethers';
import CreditCard from './CreditCard';

interface DashboardCTAProps {
  userData: UserData;
}

export default function DashboardCTA({ userData }: DashboardCTAProps) {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [bnbPrice, setBnbPrice] = useState<number>(0);

  // Get user's BNB balance
  const { data: balance } = useBalance({
    address: address,
    chainId: 97, // BSC Testnet
  });

  // Clear any existing toasts on component mount
  useEffect(() => {
    toast.dismiss();
  }, []);

  // Fetch BNB price from CoinGecko
  useEffect(() => {
    const fetchBNBPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
        const data = await response.json();
        setBnbPrice(data.binancecoin.usd);
      } catch (error) {
        console.error('Error fetching BNB price:', error);
        setBnbPrice(0);
      }
    };

    fetchBNBPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchBNBPrice, 60000);
    
    return () => clearInterval(interval);
  }, []);

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
        return stakedAmount >= 1000 && stakedAmount < 2000;
      case 'silver':
        return stakedAmount >= 2000 && stakedAmount < 3500;
      case 'gold':
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

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("📋 Wallet address copied to clipboard!");
    }
  };

  const copyCardNumber = async (cardNumber: string) => {
    await navigator.clipboard.writeText(cardNumber);
    toast.success("💳 Card number copied to clipboard!");
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev === 0 ? userCards.length - 1 : prev - 1));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev === userCards.length - 1 ? 0 : prev + 1));
  };

  // Format BNB balance for display in USD
  const formatBalance = () => {
    if (!balance || bnbPrice === 0) return '$0.00';
    const balanceValue = parseFloat(balance.formatted);
    const usdValue = balanceValue * bnbPrice;
    return `$ ${usdValue.toFixed(2)}`;
  };



  return (
    <motion.div
      className="flex w-full max-w-2xl flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible">

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center">
          <div className="flex w-fit items-center justify-center rounded-full bg-muted/80 text-center">
            <AnimatedShinyText className="px-4 py-1">
              <span>{isOnBSCTestnet ? "Connected to BSC Testnet!" : "Please switch to BSC Testnet"}</span>
            </AnimatedShinyText>
          </div>
        </div>
      </motion.div>

      <motion.img
        src="/logo.svg"
        alt="logo"
        className="mx-auto h-24 w-24"
        variants={itemVariants}
      />

      <motion.div variants={itemVariants}>
        <TextBlur
          className="text-center text-3xl font-medium tracking-tighter sm:text-5xl"
          text="Welcome to Dashboard"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <TextBlur
          className="mx-auto max-w-[27rem] pt-1.5 text-center text-base text-zinc-300 sm:text-lg"
          text={isOnBSCTestnet ? "Your wallet has been successfully connected to BSC Testnet. Welcome to the platform!" : "Please switch to BSC Testnet to access all features."}
          duration={0.8}
        />
      </motion.div>

      {/* Staking Info Display */}
      {isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <span className="text-blue-300 text-sm">
              💰 Staked: {stakedAmount.toFixed(2)} TOKENS
            </span>
          </div>
        </motion.div>
      )}

      {/* Wallet Address Display - Using Same Button Design */}
      <motion.div variants={itemVariants} className="mt-6 flex w-full justify-center">
        <div className="flex w-full max-w-[24rem] flex-col gap-2">
          <EnhancedButton
            variant="expandIcon"
            Icon={FaWallet}
            onClick={copyToClipboard}
            iconPlacement="right"
            className="w-full">
            {address ? `${address.slice(0, 8)}...${address.slice(-8)} (Click to Copy)` : "No Address"}
          </EnhancedButton>
          
          {/* Additional Switch Button when on wrong network */}
          {!isOnBSCTestnet && (
            <EnhancedButton
              variant="expandIcon"
              Icon={FaTriangleExclamation}
              onClick={handleNetworkSwitch}
              iconPlacement="right"
              disabled={isSwitching}
              className="w-full bg-orange-600 hover:bg-orange-700 border-orange-500 text-white">
              {isSwitching ? "Switching Network..." : "🔄 Switch to BSC Testnet"}
            </EnhancedButton>
          )}
          
          <EnhancedButton
            variant="expandIcon"
            Icon={FaArrowRightFromBracket}
            onClick={() => disconnect()}
            iconPlacement="right"
            className="w-full mt-2">
            Disconnect Wallet
          </EnhancedButton>
        </div>
      </motion.div>

      {/* User Cards Display - Only show when on correct network */}
      {isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-8 w-full">
          <div className="flex items-center justify-center mb-4">
            <h3 className="text-xl font-semibold text-yellow-100 flex items-center gap-2">
              <FaCreditCard /> Your Exclusive Cards
            </h3>
          </div>
          
          {isLoadingCards ? (
            <div className="flex justify-center">
              <div className="text-zinc-400">Loading your cards...</div>
            </div>
          ) : userCards.length > 0 ? (
            <div className="relative w-full max-w-[800px] mx-auto">
              <div className="relative h-[300px] flex items-center justify-center">
                {/* Cards Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {userCards.map((card, index) => {
                    const isCenter = index === currentCardIndex;
                    const isLeft = index === (currentCardIndex === 0 ? userCards.length - 1 : currentCardIndex - 1);
                    const isRight = index === (currentCardIndex === userCards.length - 1 ? 0 : currentCardIndex + 1);
                    
                    if (!isCenter && !isLeft && !isRight) return null;

                    let position = 'translate-x-0';
                    let scale = 'scale-100';
                    let zIndex = 'z-10';
                    let opacity = 'opacity-100';

                    if (isLeft) {
                      position = '-translate-x-32 md:-translate-x-40';
                      scale = 'scale-75';
                      zIndex = 'z-0';
                      opacity = 'opacity-60';
                    } else if (isRight) {
                      position = 'translate-x-32 md:translate-x-40';
                      scale = 'scale-75';
                      zIndex = 'z-0';
                      opacity = 'opacity-60';
                    } else if (isCenter) {
                      position = 'translate-x-0';
                      scale = 'scale-100';
                      zIndex = 'z-10';
                      opacity = 'opacity-100';
                    }

                    return (
                      <motion.div
                        key={card.id}
                        className={`absolute ${position} ${scale} ${zIndex} ${opacity} cursor-pointer transition-all duration-300 ease-out`}
                        onClick={() => !isCenter ? setCurrentCardIndex(index) : copyCardNumber(card.card_number)}
                        initial={false}
                        animate={{
                          x: isLeft ? -140 : isRight ? 140 : 0,
                          scale: isCenter ? 1 : 0.75,
                          opacity: isCenter ? 1 : 0.6,
                          rotateY: isLeft ? 25 : isRight ? -25 : 0,
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{ 
                          transformStyle: "preserve-3d",
                          perspective: "1000px"
                        }}
                      >
                        <div className="w-[280px] md:w-[320px] hover:scale-105 transition-transform duration-200">
                          <CreditCard
                            cardType={card.card_type as 'bronze' | 'silver' | 'gold'}
                            cardNumber={card.card_number}
                            cvv={card.cvv}
                            expirationDate={card.expiration_date}
                            isReserved={isCardReserved(card.card_type)}
                            balance={formatBalance()}
                            onClick={() => {}}
                          />
                          
                          
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Card Indicators */}
              <div className="flex justify-center gap-2 -mt-10">
                {userCards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCardIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentCardIndex
                        ? "w-8 bg-yellow-400 shadow-lg"
                        : "w-2 bg-zinc-600 hover:bg-zinc-500"
                    }`}
                    aria-label={`Go to card ${index + 1}`}
                  />
                ))}
              </div>

              {/* Current Card Info */}
              <div className="flex justify-center mt-4">
                <motion.div
                  key={currentCardIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {/* Status indicator for current card */}
                  {!isCardReserved(userCards[currentCardIndex]?.card_type) && (
                    <div className="text-xs text-zinc-400 px-2">
                      {stakedAmount < 1000 && userCards[currentCardIndex]?.card_type === 'bronze' && 'Stake 1,000+ TOKENS to reserve'}
                      {stakedAmount < 2000 && userCards[currentCardIndex]?.card_type === 'silver' && 'Stake 2,000+ TOKENS to reserve'}
                      {stakedAmount < 3500 && userCards[currentCardIndex]?.card_type === 'gold' && 'Stake 3,500+ TOKENS to reserve'}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="text-zinc-400">No cards found. Cards should be generated automatically.</div>
            </div>
          )}
        </motion.div>
      )}

      {/* Cards Stats - Only show when on correct network */}
      {isOnBSCTestnet && userCards.length > 0 && (
        <motion.div variants={itemVariants} className="mt-6 text-center">
          <div className="text-sm text-zinc-400">
            You have {userCards.length} exclusive card{userCards.length !== 1 ? 's' : ''} • 
            {userCards.filter(card => isCardReserved(card.card_type)).length} reserved • 
            Cards created on {userCards[0]?.created_at ? new Date(userCards[0].created_at).toLocaleDateString() : 'N/A'}
          </div>
        </motion.div>
      )}

      {/* Staking CTA for unreserved cards */}
      {isOnBSCTestnet && userCards.length > 0 && userCards.some(card => !isCardReserved(card.card_type)) && (
        <motion.div variants={itemVariants} className="mt-4 text-center">
          <EnhancedButton
            variant="expandIcon"
            Icon={FaCreditCard}
            onClick={() => window.location.href = '/stake'}
            iconPlacement="right"
            className="bg-purple-600 hover:bg-purple-700 border-purple-500">
            🚀 Stake More to Reserve Cards
          </EnhancedButton>
        </motion.div>
      )}

      {/* Network requirement notice */}
      {!isOnBSCTestnet && (
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-sm">
              🔐 Connect to BSC Testnet to view your exclusive cards and access all features.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
} 