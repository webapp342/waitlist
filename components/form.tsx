'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FaGithub, FaXTwitter } from "react-icons/fa6";
import { FaWallet } from "react-icons/fa6";
import { EnhancedButton } from "@/components/ui/enhanced-btn";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Form() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);
  const router = useRouter();

  // Redirect to dashboard when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      router.push('/dashboard');
    }
  }, [isConnected, address, router]);

  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      setShowConnectors(!showConnectors);
    }
  };

  const handleConnectorClick = (connector: any) => {
    connect({ connector });
    setShowConnectors(false);
  };

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
          {isPending ? "Connecting..." : isConnected ? `Disconnect ${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
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
      <motion.div
        variants={itemVariants}
        className="mt-4 flex w-full items-center justify-center gap-1 text-muted-foreground">
        <p>For any queries, reach out at </p>
        <Link
          href="https://x.com/blakssh"
          rel="noopener noreferrer"
          target="_blank">
          <FaXTwitter className="h-4 w-4 transition-all duration-200 ease-linear hover:text-yellow-200" />
        </Link>
        or
        <Link
          href="https://github.com/lakshaybhushan"
          rel="noopener noreferrer"
          target="_blank">
          <FaGithub className="ml-0.5 h-5 w-5 transition-all duration-200 ease-linear hover:text-yellow-200" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
