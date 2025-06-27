"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { containerVariants, itemVariants } from "@/lib/animation-variants";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet disconnected successfully!");
    router.push('/');
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };

  return (
    <div className="fixed w-full top-0 z-[50] px-4 pt-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between px-8 py-3 bg-[#111111]/80 backdrop-blur-sm rounded-[18px] mx-auto max-w-[1400px] border border-zinc-800 relative">
        <div className="flex items-center gap-12">
          <motion.div variants={itemVariants} className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
              />
              <span className="text-[18px] font-medium text-white">BBLIP</span>
            </Link>
          </motion.div>

          {/* Desktop Menu */}
          <motion.div variants={itemVariants} className="hidden md:flex items-center gap-8">
            <Link 
              href="/features" 
              className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/dashboard" 
              className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/stake" 
              className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Stake
            </Link>
          </motion.div>
        </div>

        {/* Desktop Wallet Button */}
        <motion.div variants={itemVariants} className="hidden md:flex items-center gap-2">
          {isConnected && address ? (
            <>
              {/* Wallet Address Button */}
              <Button
                onClick={copyAddress}
                size="lg"
                variant="outline"
                className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200 hover:text-yellow-200 transition-colors rounded-2xl px-4 font-medium"
              >
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </Button>
              
              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                size="lg"
                variant="outline"
                className="bg-transparent border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors rounded-2xl px-4 font-medium"
              >
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="default"
              className="bg-yellow-200 text-black hover:bg-yellow-300 transition-colors rounded-2xl px-6 font-medium"
            >
              Connect Wallet
            </Button>
          )}
        </motion.div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-zinc-400 hover:text-yellow-200 transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#111111] rounded-[24px] border border-zinc-800 md:hidden">
            <div className="flex flex-col gap-4">
              <Link 
                href="/features" 
                className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="/dashboard" 
                className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/stake" 
                className="text-[15px] font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Stake
              </Link>
              
              {/* Mobile Wallet Controls */}
              <div className="border-t border-zinc-700 pt-4 flex flex-col gap-2">
                {isConnected && address ? (
                  <>
                    <Button
                      onClick={copyAddress}
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200 hover:text-yellow-200 transition-colors rounded-xl px-3 font-medium text-sm"
                    >
                      {`${address.slice(0, 8)}...${address.slice(-6)}`}
                    </Button>
                    
                    <Button
                      onClick={handleDisconnect}
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors rounded-xl px-3 font-medium text-sm"
                    >
                      <LogOut size={14} className="mr-2" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-yellow-200 text-black hover:bg-yellow-300 transition-colors rounded-xl px-4 font-medium"
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
