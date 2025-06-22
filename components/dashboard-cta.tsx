'use client'

import { motion } from "framer-motion";
import TextBlur from "@/components/ui/text-blur";
import AnimatedShinyText from "@/components/ui/shimmer-text";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useDisconnect, useChainId, useSwitchChain, useChains } from 'wagmi';
import { FaWallet, FaArrowRightFromBracket, FaLink, FaTriangleExclamation } from "react-icons/fa6";
import { toast } from "sonner";
import { bsc } from 'wagmi/chains';
import { useEffect, useState } from 'react';
import { userService } from '@/lib/supabase';

export default function DashboardCTA() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [hasShownInitialWarning, setHasShownInitialWarning] = useState(false);

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

  // Check if user is on the correct network (BSC)
  // Force number conversion to handle any type issues
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const isOnBSC = actualChainId === 56;

  // Monitor network changes and show warnings
  useEffect(() => {
    if (isConnected && actualChainId !== undefined && actualChainId !== null) {
      const currentChainId = Number(actualChainId);
      console.log('Network Check - Current Chain ID:', currentChainId);
      console.log('Network Check - Is on BSC:', currentChainId === 56);
      
      if (currentChainId !== 56) {
        setShowNetworkWarning(true);
        
        // Only show toast if we haven't shown it yet for this connection
        if (!hasShownInitialWarning) {
          // Get network name for the alert
          const networkName = getNetworkName(currentChainId);
          
          toast.warning(`⚠️ Wrong Network Detected! You're on ${networkName} (Chain ID: ${currentChainId}). Please switch to BSC Network (Chain ID: 56).`, {
            duration: 10000,
            position: 'top-center',
          });
          
          setHasShownInitialWarning(true);
        }
      } else {
        setShowNetworkWarning(false);
        
        // Only show success toast if we were previously on wrong network
        if (hasShownInitialWarning) {
          toast.success("✅ Connected to BSC Network!", {
            duration: 2000,
            position: 'top-center',
          });
          setHasShownInitialWarning(false);
        }
      }
    }
  }, [isConnected, actualChainId, hasShownInitialWarning]);

  // Save user to database when wallet is connected
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address && actualChainId) {
        try {
          const userData = {
            wallet_address: address,
            chain_id: actualChainId,
            network_name: getNetworkName(actualChainId),
          };

          await userService.addUser(userData);
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, actualChainId]);

  const getNetworkName = (chainId: number): string => {
    // Extended network names including all major networks
    const networkNames: { [key: number]: string } = {
      // Mainnets
      1: "Ethereum Mainnet",
      56: "BSC Smart Chain",
      137: "Polygon",
      42161: "Arbitrum One",
      43114: "Avalanche",
      59144: "Linea Mainnet",
      10: "Optimism",
      250: "Fantom",
      25: "Cronos",
      100: "Gnosis",
      1284: "Moonbeam",
      1285: "Moonriver",
      42220: "Celo",
      1666600000: "Harmony",
      8453: "Base",
      534352: "Scroll",
      324: "zkSync Era",
      5000: "Mantle",
      81457: "Blast",
      1088: "Metis",
      1313161554: "Aurora",
      8217: "Klaytn",
      1101: "Polygon zkEVM",
      42170: "Arbitrum Nova",
      1116: "Core",
      40: "Telos",
      7700: "Canto",
      5234: "Humanode",
      7001: "ZetaChain",
      169: "Manta Pacific",
      34443: "Mode",
      60808: "BOB",
      2222: "Kava",
      122: "Fuse",
      66: "OKXChain",
      82: "Meter",
      888: "Wanchain",
      288: "Boba",
      57: "Syscoin",
      2020: "Ronin",
      2021: "Saigon Testnet",
      148: "Shimmer EVM",
      1329: "Sei",
      // Testnets
      17000: "Holesky",
      11155111: "Sepolia",
      97: "BSC Testnet",
      5: "Goerli",
      534351: "Scroll Sepolia",
      59140: "Linea Goerli",
      80001: "Polygon Mumbai",
      421614: "Arbitrum Sepolia",
      11155420: "Optimism Sepolia",
      84532: "Base Sepolia",
      43113: "Avalanche Fuji",
      4002: "Fantom Testnet",
      44787: "Celo Alfajores",
      10200: "Gnosis Chiado",
      5001: "Mantle Testnet",
      168587773: "Blast Sepolia",
      7000: "ZetaChain Athens",
      280: "zkSync Era Testnet",
      // Add more networks as needed
    };
    
    return networkNames[chainId] || `Unknown Network`;
  };

  const getChainInfo = () => {
    const currentChainId = actualChainId ? Number(actualChainId) : null;
    
    if (currentChainId === null || currentChainId === undefined) {
      return "No Network Detected";
    }
    
    // If on BSC, show success state
    if (currentChainId === 56) {
      return "✅ BSC Smart Chain (Chain ID: 56)";
    }
    
    // Show current network with warning
    const networkName = getNetworkName(currentChainId);
    return `⚠️ ${networkName} (Chain ID: ${currentChainId})`;
  };

  const handleNetworkSwitch = async () => {
    try {
      toast.loading("🔄 Switching to BSC Network...", {
        id: 'network-switch',
        position: 'top-center',
      });
      
      await switchChain({ chainId: bsc.id });
      
      toast.success("✅ Successfully switched to BSC Network!", {
        id: 'network-switch',
        position: 'top-center',
      });
      
      setShowNetworkWarning(false);
    } catch (error: any) {
      console.error('Network switch failed:', error);
      
      // More specific error handling
      if (error?.code === 4902) {
        toast.error("❌ BSC Network not found in your wallet. Please add it manually.", {
          id: 'network-switch',
          duration: 5000,
          position: 'top-center',
        });
      } else if (error?.code === 4001) {
        toast.error("❌ Network switch rejected by user.", {
          id: 'network-switch',
          duration: 3000,
          position: 'top-center',
        });
      } else {
        toast.error("❌ Failed to switch network. Please switch manually in your wallet.", {
          id: 'network-switch',
          duration: 5000,
          position: 'top-center',
        });
      }
    }
  };

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("📋 Wallet address copied to clipboard!");
    }
  };

  return (
    <motion.div
      className="flex w-full max-w-2xl flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible">
      
      {/* Network Warning Banner */}
      {showNetworkWarning && (
        <motion.div variants={itemVariants} className="mb-4">
          <div className="flex items-center justify-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <FaTriangleExclamation className="mr-2 text-red-400" />
            <span className="text-red-300 text-sm text-center">
              Wrong Network! This app requires BSC Network. Please switch to continue.
            </span>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center">
          <div className="flex w-fit items-center justify-center rounded-full bg-muted/80 text-center">
            <AnimatedShinyText className="px-4 py-1">
              <span>{isOnBSC ? "Connected successfully!" : "Please switch network"}</span>
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
          text={isOnBSC ? "Your wallet has been successfully connected to BSC Network. Welcome to the platform!" : "Please switch to BSC Network to access all features."}
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
          
          <EnhancedButton
            variant="expandIcon"
            Icon={FaLink}
            onClick={handleNetworkSwitch}
            iconPlacement="right"
            disabled={isSwitching}
            className={`w-full ${!isOnBSC ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white' : ''}`}>
            {isSwitching ? "Switching..." : getChainInfo()}
          </EnhancedButton>
          
          {/* Additional Switch Button when on wrong network */}
          {!isOnBSC && (
            <EnhancedButton
              variant="expandIcon"
              Icon={FaTriangleExclamation}
              onClick={handleNetworkSwitch}
              iconPlacement="right"
              disabled={isSwitching}
              className="w-full bg-orange-600 hover:bg-orange-700 border-orange-500 text-white">
              {isSwitching ? "Switching Network..." : "🔄 Switch to BSC Network"}
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
          
          {/* Debug button - remove this in production */}
          <button
            onClick={() => {
              const currentId = actualChainId || 'undefined';
              const networkName = actualChainId ? getNetworkName(actualChainId) : 'No Chain';
              toast.info(`Debug: Chain ID is ${currentId} (${networkName})`, {
                duration: 5000,
                position: 'bottom-center',
              });
              console.log('Manual chain check:', { actualChainId, chain, chainId, isOnBSC });
            }}
            className="w-full mt-2 p-2 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-600">
            🔍 Debug: Check Current Chain
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 