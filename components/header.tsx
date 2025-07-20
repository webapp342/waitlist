"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { Menu, LogOut, Gift, Repeat, Store, LayoutDashboard, Coins, Map } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import WalletModal from "./WalletModal";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isActivePage = (path: string) => pathname === path;

  // Add useEffect to handle body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleDisconnect = () => {
    // Remove auth token
    localStorage.removeItem('bblip_auth_token');
    
    // Disconnect wallet
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

  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/presale", label: "Presale" },
    { href: "/tokenomics", label: "Tokenomics" },
    { href: "/swap", label: "Swap" },
    { href: "/bridge", label: "Bridge" },
    { href: "/stake", label: "Stake" },
    { href: "/referral", label: "Referral" },
    { href: "/x", label: "X Connect" },
    { href: "/whitepaper", label: "Whitepaper" }
  ];

  return (
    <>
      {/* Blur overlay for mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[45] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
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
                <div className="flex items-baseline">
                  <span className="text-xl font-bold text-yellow-200 tracking-tight">Bblip</span>
                </div>
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            <motion.nav variants={itemVariants} className="hidden md:flex items-center gap-10">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-base font-medium transition-colors flex items-center gap-2",
                    isActivePage(item.href) ? "text-yellow-200" : "text-zinc-400 hover:text-yellow-200"
                  )}
                >
                  {item.label}
                </Link>
              ))}
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#111111] rounded-[20px] border border-zinc-800/50 shadow-xl md:hidden">
              <div className="p-4">
                {/* Grid layout for all menu items */}
                <div className="grid grid-cols-2 gap-2">
                  {menuItems.map((item) => (
                    <Link 
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 text-base font-medium transition-colors px-3 py-3 rounded-lg ${
                        isActivePage(item.href)
                        ? 'text-yellow-200 bg-white/5'
                        : 'text-zinc-300 hover:text-yellow-200 hover:bg-white/5'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Wallet Section */}
              <div className="border-t border-zinc-800/70 p-4">
                <div className="space-y-2">
                  {isConnected && address ? (
                    <>
                      <Button
                        onClick={copyAddress}
                        size="default"
                        variant="outline"
                        className="w-full bg-black/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-yellow-200/50 hover:text-yellow-200 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium text-sm"
                      >
                        {`${address.slice(0, 8)}...${address.slice(-6)}`}
                      </Button>
                      
                      <Button
                        onClick={handleDisconnect}
                        size="default"
                        variant="outline"
                        className="w-full bg-black/50 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-300 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <LogOut size={16} />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="default"
                      variant="default"
                      onClick={() => { setIsMenuOpen(false); setIsModalOpen(true); }}
                      className="w-full bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl px-4 py-2.5 font-medium"
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Wallet Modal */}
        <WalletModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </>
  );
}
