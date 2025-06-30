"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { Menu, LogOut, Gift } from "lucide-react";
import { useState } from "react";
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import WalletModal from "./WalletModal";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        className="flex items-center justify-between px-6 py-2 bg-[#111111]/80 backdrop-blur-md rounded-[20px] mx-auto max-w-[1400px] border border-zinc-800/50 shadow-lg relative">
        <div className="flex items-center gap-12">
          <motion.div variants={itemVariants} className="flex items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={36}
                height={36}
                className="drop-shadow-md"
              />
              <span className="text-l font-semibold text-yellow-200 tracking-tight">Bblip</span>
            </Link>
          </motion.div>

          {/* Desktop Menu */}
          <motion.nav variants={itemVariants} className="hidden md:flex items-center gap-10">
            <Link 
              href="/presale" 
              className="text-base font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Presale
            </Link>
            <Link 
              href="/dashboard" 
              className="text-base font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/stake" 
              className="text-base font-medium text-zinc-400 hover:text-yellow-200 transition-colors"
            >
              Stake
            </Link>
            <Link 
              href="/referral" 
              className="text-base font-medium text-zinc-400 hover:text-yellow-200 transition-colors flex items-center gap-2"
            >
              <Gift size={16} />
              Referral
            </Link>
          </motion.nav>
        </div>

        {/* Desktop Wallet Button */}
        <motion.div variants={itemVariants} className="hidden md:flex items-center gap-3">
          {isConnected && address ? (
            <>
              {/* Wallet Address Button */}
              <Button
                onClick={copyAddress}
                size="lg"
                variant="outline"
                className="bg-black/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200/50 hover:text-yellow-200 transition-all duration-200 rounded-xl px-5 font-medium"
              >
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </Button>
              
              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                size="lg"
                variant="outline"
                className="bg-black/50 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-300 transition-all duration-200 rounded-xl px-4 font-medium"
              >
                <LogOut size={18} />
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="default"
              onClick={() => setIsModalOpen(true)}
              className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl px-6 font-medium shadow-md"
            >
              Connect Wallet
            </Button>
          )}
        </motion.div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-zinc-400 hover:text-yellow-200 transition-colors p-2 rounded-lg hover:bg-white/5"
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#111111]/95 backdrop-blur-lg rounded-[20px] border border-zinc-800/50 shadow-xl md:hidden">
            <nav className="flex flex-col gap-5 mb-6">
              <Link 
                href="/presale" 
                className="text-base font-medium text-zinc-300 hover:text-yellow-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Presale
              </Link>
              <Link 
                href="/dashboard" 
                className="text-base font-medium text-zinc-300 hover:text-yellow-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/stake" 
                className="text-base font-medium text-zinc-300 hover:text-yellow-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                Stake
              </Link>
              <Link 
                href="/referral" 
                className="text-base font-medium text-zinc-300 hover:text-yellow-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Gift size={16} />
                Referral
              </Link>
            </nav>
            
            {/* Mobile Wallet Controls */}
            <div className="border-t border-zinc-800/70 pt-5 flex flex-col gap-3">
              {isConnected && address ? (
                <>
                  <Button
                    onClick={copyAddress}
                    size="default"
                    variant="outline"
                    className="bg-black/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200/50 hover:text-yellow-200 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium text-sm w-full"
                  >
                    {`${address.slice(0, 8)}...${address.slice(-6)}`}
                  </Button>
                  
                  <Button
                    onClick={handleDisconnect}
                    size="default"
                    variant="outline"
                    className="bg-black/50 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-300 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium text-sm w-full flex items-center justify-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="default"
                  variant="default"
                  onClick={() => { setIsMenuOpen(false); setIsModalOpen(true); }}
                  className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium w-full"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Wallet Modal */}
      <WalletModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
