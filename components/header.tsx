"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import WalletModal from "./WalletModal";
import WalletInfo from "./WalletInfo";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;
const ETH_MAINNET_CHAIN_ID = 1;

interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuTimerRef, setSubmenuTimerRef] = useState<NodeJS.Timeout | null>(null);
  const [openMobileSubmenus, setOpenMobileSubmenus] = useState<Set<string>>(new Set());
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleMouseEnter = (menuLabel: string) => {
    if (submenuTimerRef) {
      clearTimeout(submenuTimerRef);
      setSubmenuTimerRef(null);
    }
    setActiveSubmenu(menuLabel);
  };

  const handleMouseLeave = () => {
    const timer = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
    setSubmenuTimerRef(timer);
  };

  const toggleMobileSubmenu = (menuLabel: string) => {
    const newOpenSubmenus = new Set(openMobileSubmenus);
    if (newOpenSubmenus.has(menuLabel)) {
      newOpenSubmenus.delete(menuLabel);
    } else {
      newOpenSubmenus.add(menuLabel);
    }
    setOpenMobileSubmenus(newOpenSubmenus);
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setOpenMobileSubmenus(new Set());
  };

  const isActivePage = (href: string): boolean => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isActiveCategory = (children: MenuItem[]): boolean => {
    return children.some(item => item.href && isActivePage(item.href));
  };

  const isOnBSC = chainId === BSC_MAINNET_CHAIN_ID;
  const isOnETH = chainId === ETH_MAINNET_CHAIN_ID;

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
  
  // Close network menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('.network-menu-container')) {
        setShowNetworkMenu(false);
      }
    };

    if (showNetworkMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showNetworkMenu]);

  const handleDisconnect = () => {
    // Remove auth token
    localStorage.removeItem('bblip_auth_token');
    
    // Disconnect wallet
    disconnect();
    
    toast.success("Wallet disconnected successfully!");
    router.push('/');
  };
  
  const handleSwitchToBSC = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
      setShowNetworkMenu(false);
      toast.success("Switched to BSC network");
    } catch (error) {
      console.error("Failed to switch to BSC:", error);
      toast.error("Failed to switch to BSC network");
    }
  };

  const handleSwitchToETH = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await switchChain({ chainId: ETH_MAINNET_CHAIN_ID });
      setShowNetworkMenu(false);
      toast.success("Switched to ETH network");
    } catch (error) {
      console.error("Failed to switch to ETH:", error);
      toast.error("Failed to switch to ETH network");
    }
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };
  
  // Organized menu structure with dropdowns - Presale now independent
  const menuItems: MenuItem[] = [
    { 
      label: "Presale", 
      href: "/presale"
    },
 
    // Show Dashboard only when wallet is connected
    ...(isConnected ? [{ href: "/dashboard", label: "Dashboard" }] : []),
 
    { href: "/swap", label: "Swap" },


  
    { href: "/airdrop", label: "Airdrop" },

    { 
      label: "Earn",
      children: [
        { href: "/stake", label: "Stake" },
        { href: "/airdrop", label: "Airdrop" },
        { 
          label: "ETH Vault",
          href: "/eth-yield"
        },
        { 
          label: "Bblip Quests", 
          href: "/social-connections"
        },
      ]
    },
    { 
      label: "Trade",
      children: [
        { href: "/swap", label: "Swap" },
        { href: "/bridge", label: "Bridge" },
      ]
    },
    { 
      label: "Docs",
      children: [
        { href: "/tokenomics", label: "Tokenomics" },
        { href: "/whitepaper", label: "Whitepaper" },
      ]
    }
  ];

  // Flatten items for mobile view
  const flattenMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.reduce((acc: MenuItem[], item) => {
      if (item.children) {
        return [...acc, ...item.children];
      }
      return [...acc, item];
    }, []);
  };

  const flatItems = flattenMenuItems(menuItems);

  return (
    <>
      {/* Blur overlay for mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[45] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      {/* Non-fixed header - removed "fixed" class so it scrolls with content */}
      <div className="w-full z-[55] px-4 pt-4 md:px-4 bg-transparent">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between py-2 relative md:px-6 md:mx-auto w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-12">
            <motion.div variants={itemVariants} className="flex items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <Image
                  src="/logo.svg"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="drop-shadow-md ml-2"
                />
                <div className="hidden md:flex items-baseline">
                  <span className="text-xl font-bold text-yellow-200 tracking-tight font-space-grotesk">Bblip</span>
                </div>
              </Link>
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-zinc-400 hover:text-yellow-200 transition-colors p-2 rounded-lg hover:bg-white/5 ml-2"
                aria-label="Toggle menu"
              >
                <Menu size={24} />
              </button>
            </motion.div>

            {/* Desktop Menu with Dropdowns */}
            <motion.nav variants={itemVariants} className="hidden md:flex items-center gap-6">
              {menuItems.map((item) => (
                <div 
                  key={item.label} 
                  className="relative"
                  onMouseEnter={() => item.children && handleMouseEnter(item.label)}
                  onMouseLeave={item.children ? handleMouseLeave : undefined}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "text-base font-medium transition-colors flex items-center gap-1.5 py-2 px-1",
                        isActivePage(item.href) 
                          ? "text-yellow-200" 
                          : "text-zinc-400 hover:text-yellow-200"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {item.label}
                        {( item.label === "ETH Vault") && (
                          <Badge variant="outline" className="border-yellow-200 text-yellow-200 text-xs px-1.5 py-0 h-4 rounded-lg bg-transparent">
                            NEW
                          </Badge>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <button
                      className={cn(
                        "text-base font-medium transition-colors flex items-center gap-1.5 py-2 px-1",
                        activeSubmenu === item.label || (item.children && isActiveCategory(item.children))
                          ? "text-yellow-200" 
                          : "text-zinc-400 hover:text-yellow-200"
                      )}
                    >
                      {item.label}
                      <ChevronDown size={14} />
                    </button>
                  )}
                  
                  {/* Dropdown Menu */}
                  {!item.href && activeSubmenu === item.label && item.children && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 py-2 bg-zinc-900/95 backdrop-blur-lg rounded-lg border border-zinc-800/60 shadow-xl w-48 z-50 overflow-hidden">
                      {item.children?.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href || '#'}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-zinc-800/70 w-full",
                            isActivePage(subItem.href || '') 
                              ? "text-yellow-200 bg-zinc-800/40" 
                              : "text-zinc-300 hover:text-yellow-200"
                          )}
                          onClick={() => setActiveSubmenu(null)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.nav>
          </div>

          {/* Search and Wallet Section */}
          <motion.div variants={itemVariants} className="hidden md:flex items-center gap-3">
            {/* Network Switcher */}
            {isConnected && address && (
              <div className="relative network-menu-container">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNetworkMenu(!showNetworkMenu);
                  }}
                  size="sm"
                  variant="outline"
                  className="relative bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-yellow-200 transition-all duration-200 rounded-full h-8 px-3 font-medium flex items-center gap-1.5"
                >
                  {isOnBSC ? (
                    <>
                      <Image 
                        src="/bnb.svg" 
                        alt="BSC" 
                        width={14}
                        height={14}
                      />
                      <span className="text-xs">BSC</span>
                    </>
                  ) : (
                    <>
                      <Image 
                        src="/eth.png" 
                        alt="ETH" 
                        width={14}
                        height={14}
                        className="rounded-full"
                      />
                      <span className="text-xs">ETH</span>
                    </>
                  )}
                  <ChevronDown size={12} className="ml-1" />
                </Button>
                
                {/* Dropdown Menu */}
                {showNetworkMenu && (
                  <div className="absolute right-0 mt-1 py-1 w-36 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg z-50">
                    {!isOnBSC && (
                      <button 
                        onClick={handleSwitchToBSC}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white hover:bg-zinc-700"
                      >
                        <Image 
                          src="/bnb.svg" 
                          alt="BSC" 
                          width={16} 
                          height={16}
                        />
                        <span>Switch to BSC</span>
                      </button>
                    )}
                    
                    {!isOnETH && (
                      <button 
                        onClick={handleSwitchToETH}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white hover:bg-zinc-700"
                      >
                        <Image 
                          src="/eth.png" 
                          alt="ETH" 
                          width={16} 
                          height={16}
                          className="rounded-full"
                        />
                        <span>Switch to ETH</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {isConnected && address ? (
              <>
                {/* Wallet Address Button - Now only copies to clipboard */}
                <Button
                  onClick={copyAddress}
                  size="sm"
                  variant="outline"
                  className="bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-yellow-200 transition-all duration-200 rounded-full px-4 font-medium"
                >
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </Button>
                
                {/* Disconnect Button */}
                <Button
                  onClick={handleDisconnect}
                  size="sm"
                  variant="outline"
                  className="bg-zinc-900/80 border-zinc-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all duration-200 rounded-full w-8 h-8 p-0 flex items-center justify-center"
                >
                  <LogOut size={14} />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsModalOpen(true)}
                className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-lg px-4 font-medium"
              >
                Connect Wallet
              </Button>
            )}
          </motion.div>

          {/* Mobile Wallet Button or Address */}
          <motion.div variants={itemVariants} className="md:hidden mr-2">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                {/* Mobile Network Switcher - Now with dropdown arrow */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNetworkMenu(!showNetworkMenu);
                  }}
                  size="sm"
                  variant="outline"
                  className="relative bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-yellow-200 transition-all duration-200 rounded-full h-8 px-2 flex items-center gap-1"
                >
                  {isOnBSC ? (
                    <Image 
                      src="/bnb.svg" 
                      alt="BSC" 
                      width={16}
                      height={16}
                    />
                  ) : (
                    <Image 
                      src="/eth.png" 
                      alt="ETH" 
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                  )}
                  <ChevronDown size={12} />
                </Button>
                
                <Button
                  onClick={() => setIsAddressSheetOpen(true)}
                  size="sm"
                  variant="outline"
                  className="bg-zinc-900/80 border-zinc-800 text-yellow-200 transition-all duration-200 rounded-full px-3 py-1 font-medium text-sm"
                >
                  {`${address.slice(0, 4)}...${address.slice(-4)}`}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsModalOpen(true)}
                className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-lg px-4 font-medium"
              >
                Connect Wallet
              </Button>
            )}
          </motion.div>

          {/* Mobile Menu Overlay - Enhanced user-friendly design */}
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl md:hidden z-[60] mx-4"
            >
              <div className="py-3">
                {menuItems.map((item) => (
                  <div key={item.label} className="border-b border-zinc-800/30 last:border-b-0">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 text-base font-medium transition-colors",
                          isActivePage(item.href)
                            ? 'text-yellow-200 bg-zinc-800/20'
                            : 'text-zinc-200 hover:text-yellow-200 hover:bg-zinc-800/20'
                        )}
                        onClick={closeMobileMenu}
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {( item.label === "ETH Vault") && (
                            <Badge variant="outline" className="border-yellow-200 text-yellow-200 text-xs px-1.5 py-0 h-4 rounded-lg bg-transparent">
                              NEW
                            </Badge>
                          )}
                        </span>
                        {isActivePage(item.href) && (
                          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        )}
                      </Link>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleMobileSubmenu(item.label)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-base font-medium transition-colors",
                            (item.children && isActiveCategory(item.children)) || openMobileSubmenus.has(item.label)
                              ? 'text-yellow-200 bg-zinc-800/20'
                              : 'text-zinc-200 hover:text-yellow-200 hover:bg-zinc-800/20'
                          )}
                        >
                          <span>{item.label}</span>
                          <ChevronDown 
                            size={16} 
                            className={cn(
                              "transition-transform duration-200",
                              openMobileSubmenus.has(item.label) ? "rotate-180" : ""
                            )}
                          />
                        </button>
                        
                        {/* Mobile Submenu with smooth animation */}
                        <AnimatePresence>
                          {openMobileSubmenus.has(item.label) && item.children && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden bg-zinc-800/20"
                            >
                              {item.children.map((subItem) => (
                                <Link 
                                  key={subItem.href}
                                  href={subItem.href || '#'}
                                  className={cn(
                                    "flex items-center justify-between px-8 py-2.5 text-sm font-medium transition-colors",
                                    isActivePage(subItem.href || '')
                                      ? 'text-yellow-200 bg-zinc-700/30'
                                      : 'text-zinc-300 hover:text-yellow-200 hover:bg-zinc-700/20'
                                  )}
                                  onClick={closeMobileMenu}
                                >
                                  <span>{subItem.label}</span>
                                  {isActivePage(subItem.href || '') && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                  )}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                ))}
                
                {/* Mobile Menu Footer */}
               
              </div>
            </motion.div>
          )}
          
          {/* Mobile Network Menu Dropdown */}
          {showNetworkMenu && (
            <div className="absolute right-0 top-12 mt-1 py-1 w-36 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg z-50 md:hidden">
              {!isOnBSC && (
                <button 
                  onClick={handleSwitchToBSC}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white hover:bg-zinc-700"
                >
                  <Image 
                    src="/bnb.svg" 
                    alt="BSC" 
                    width={16} 
                    height={16}
                  />
                  <span>Switch to BSC</span>
                </button>
              )}
              
              {!isOnETH && (
                <button 
                  onClick={handleSwitchToETH}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white hover:bg-zinc-700"
                >
                  <Image 
                    src="/eth.png" 
                    alt="ETH" 
                    width={16} 
                    height={16}
                    className="rounded-full"
                  />
                  <span>Switch to ETH</span>
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Wallet Modal */}
        <WalletModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
        
        {/* Wallet Info Dialog */}
        <WalletInfo open={isAddressSheetOpen} onClose={() => setIsAddressSheetOpen(false)} />
      </div>
    </>
  );
}
