'use client'

import { motion } from "framer-motion";
import TextBlur from "@/components/ui/text-blur";
import AnimatedShinyText from "@/components/ui/shimmer-text";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useDisconnect, useChainId, useSwitchChain, useChains } from 'wagmi';
import { FaWallet, FaArrowRightFromBracket, FaTriangleExclamation, FaCreditCard } from "react-icons/fa6";
import { toast } from "sonner";
import { bscTestnet } from 'wagmi/chains';
import { useEffect, useState } from 'react';
import { userService, cardService, Card } from '@/lib/supabase';
import { BSC_TESTNET_CHAIN_ID, BSC_TESTNET_CONFIG } from '@/lib/wagmi';

export default function DashboardCTA() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Clear any existing toasts on component mount
  useEffect(() => {
    toast.dismiss();
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

  // Check if user is on the correct network (BSC TESTNET - Chain ID 97)
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSCTestnet = actualChainId === BSC_TESTNET_CHAIN_ID;

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

  const handleNetworkSwitch = async () => {
    try {
      // Try wagmi first
      try {
        await switchChain({ chainId: bscTestnet.id });
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
              params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
            });
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [BSC_TESTNET_CONFIG],
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

  const getCardIcon = (cardType: string) => {
    const icons = {
      bronze: "🥉",
      silver: "🥈", 
      gold: "🥇"
    };
    return icons[cardType as keyof typeof icons] || "💳";
  };

  const getCardColors = (cardType: string) => {
    const colors = {
      bronze: "bg-gradient-to-br from-orange-800 to-orange-600 border-orange-500",
      silver: "bg-gradient-to-br from-gray-700 to-gray-500 border-gray-400",
      gold: "bg-gradient-to-br from-yellow-700 to-yellow-500 border-yellow-400"
    };
    return colors[cardType as keyof typeof colors] || "bg-gray-800";
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {userCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  variants={itemVariants}
                  className={`relative p-6 rounded-xl border-2 ${getCardColors(card.card_type)} text-black cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                  onClick={() => copyCardNumber(card.card_number)}
                >
                  <div className="absolute top-4 right-4 text-2xl">
                    {getCardIcon(card.card_type)}
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm font-medium opacity-80 uppercase tracking-wider">
                      {card.card_type} Card
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="font-mono text-lg tracking-wider">
                      {card.card_number.match(/.{1,4}/g)?.join(' ')}
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs opacity-70">CVV</div>
                        <div className="font-mono text-sm">{card.cvv}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70">EXPIRES</div>
                        <div className="font-mono text-sm">
                          {new Date(card.expiration_date).toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            year: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 left-6 text-xs opacity-50">
                    Click to copy card number
                  </div>
                </motion.div>
              ))}
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
            Cards created on {userCards[0]?.created_at ? new Date(userCards[0].created_at).toLocaleDateString() : 'N/A'}
          </div>
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