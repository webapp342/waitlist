'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FaGithub, FaXTwitter } from "react-icons/fa6";
import { FaWallet } from "react-icons/fa6";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;

export default function Form() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showConnectors, setShowConnectors] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  // Clear any existing toasts on component mount
  useEffect(() => {
    toast.dismiss();
  }, []);

  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      setShowConnectors(!showConnectors);
    }
  };

  const handleConnectorClick = async (connector: any) => {
    try {
      await connect({ connector });
      setShowConnectors(false);
      // Wait for connection to complete before redirecting
      if (connector.ready) {
        setIsRedirecting(true);
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setIsRedirecting(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
      
      // Check if user is on BSC Mainnet
      const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;
      
      if (isOnBSCMainnet) {
        // User is on correct network, redirect to dashboard
        const timer = setTimeout(() => {
          setIsRedirecting(true);
          router.replace('/dashboard');
        }, 500);
        return () => clearTimeout(timer);
      } else if (actualChainId) {
        // User is connected but on wrong network, redirect to dashboard for network switching
        const timer = setTimeout(() => {
          setIsRedirecting(true);
          router.replace('/dashboard');
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, chain, chainId, router, switchChain]);

  // Only hide when actually redirecting and connected
  if (isRedirecting && isConnected) {
    return null;
  }

  return (
    <motion.div
      className="mt-6 flex w-full max-w-[24rem] flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible">
      
      {/* Wallet Connection Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <EnhancedButton
          variant="expandIcon"
          Icon={FaWallet}
          onClick={handleWalletAction}
          iconPlacement="right"
          className="w-full"
          disabled={isPending}>
          {isPending ? "Connecting..." : isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
        </EnhancedButton>
        
        {/* Connector Options */}
        {showConnectors && !isConnected && (
          <div className="flex flex-col gap-2 mt-2">
            {connectors.map((connector) => (
              <motion.button
                key={connector.uid}
                variants={itemVariants}
                onClick={() => handleConnectorClick(connector)}
                className="w-full p-2 text-sm border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                disabled={isPending}>
                {connector.name}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Network Info */}
      {isConnected && !isRedirecting && (
        <motion.div variants={itemVariants} className="mt-2">
          <div className="text-center text-xs text-zinc-400">
            Required: BSC Mainnet (Chain ID: 56)
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
