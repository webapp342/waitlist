import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAccount, useBalance, useChainId, useSwitchChain, useDisconnect } from 'wagmi';
import Image from 'next/image';
import { fetchCryptoPrices, getCachedPrices } from '@/lib/priceService';
import { Copy, ChevronDown, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// BSC Mainnet Chain ID
const BSC_MAINNET_CHAIN_ID = 56;
const ETH_MAINNET_CHAIN_ID = 1;

// BSC and Ethereum Token Addresses
const BBLP_ADDRESS = '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235';
const ETH_BBSC_ADDRESS = '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235'; // WBBLP token address

// Fixed price for BBLP and WBBLP
const BBLP_FIXED_PRICE = 0.10;

// Refresh interval in milliseconds
const REFRESH_INTERVAL = 15000; // 15 seconds - more frequent updates

interface WalletInfoProps {
  open: boolean;
  onClose: () => void;
}

interface CryptoPriceData {
  price: number;
  changePercent24h: number;
}

export default function WalletInfo({ open, onClose }: WalletInfoProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [cryptoPrices, setCryptoPrices] = useState<{
    bnb: CryptoPriceData;
    eth: CryptoPriceData;
  }>({
    bnb: { price: 0, changePercent24h: 0 },
    eth: { price: 0, changePercent24h: 0 }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state to track previous non-BBLP USD value
  const [previousNonBblpTotalUsd, setPreviousNonBblpTotalUsd] = useState(0);
  
  const isOnBSC = chainId === BSC_MAINNET_CHAIN_ID;
  const isOnETH = chainId === ETH_MAINNET_CHAIN_ID;
  
  // Fetch token balances for BSC - Real-time
  const { data: bblpBalance, refetch: refetchBBLP } = useBalance(address ? { 
    address, 
    token: BBLP_ADDRESS, 
    chainId: 56 
  } : { address: undefined });
  
  const { data: bnbBalance, refetch: refetchBNB } = useBalance(address ? { 
    address, 
    chainId: 56 
  } : { address: undefined });
  
  // Fetch token balances for ETH - Real-time
  const { data: wbblpBalance, refetch: refetchWBBLP } = useBalance(address ? { 
    address, 
    token: ETH_BBSC_ADDRESS, 
    chainId: 1 
  } : { address: undefined });
  
  const { data: ethBalance, refetch: refetchETH } = useBalance(address ? { 
    address, 
    chainId: 1 
  } : { address: undefined });

  // Calculate USD values
  const bnbUsd = bnbBalance ? parseFloat(bnbBalance.formatted) * cryptoPrices.bnb.price : 0;
  const bblpUsd = bblpBalance ? parseFloat(bblpBalance.formatted) * BBLP_FIXED_PRICE : 0;
  const ethUsd = ethBalance ? parseFloat(ethBalance.formatted) * cryptoPrices.eth.price : 0;
  const wbblpUsd = wbblpBalance ? parseFloat(wbblpBalance.formatted) * BBLP_FIXED_PRICE : 0;

  // Calculate total USD value
  const totalUsd = bnbUsd + bblpUsd + ethUsd + wbblpUsd;
  
  // Calculate non-BBLP total USD (just BNB and ETH)
  const nonBblpTotalUsd = bnbUsd + ethUsd;
  
  // Calculate weighted change percentage based on BNB and ETH 
  // This ensures our change matches UniSwap's calculation
  const calculateWeightedChangePercent = () => {
    if (nonBblpTotalUsd === 0) return 0;
    
    // Calculate weighted percentage change
    const bnbWeight = bnbUsd / nonBblpTotalUsd;
    const ethWeight = ethUsd / nonBblpTotalUsd;
    
    const bnbContribution = bnbWeight * cryptoPrices.bnb.changePercent24h;
    const ethContribution = ethWeight * cryptoPrices.eth.changePercent24h;
    
    return bnbContribution + ethContribution;
  };
  
  // Calculate weighted change amount based on percentages
  const weightedChangePercent = calculateWeightedChangePercent();
  
  // Calculate dollar change amount based on the weighted percentage
  const nonBblpTotalUsdChange = (weightedChangePercent / 100) * nonBblpTotalUsd;
  
  // Format change value based on magnitude
  const formatChangeValue = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue < 0.01) {
      return absValue.toFixed(5); // Show 5 decimal places for very small changes
    } else if (absValue < 0.1) {
      return absValue.toFixed(4); // Show 4 decimal places for small changes
    } else {
      return absValue.toFixed(2); // Show 2 decimal places for larger changes
    }
  };
  
  // Fetch BNB and ETH prices with change percentages
  const fetchPricesAndBalances = async () => {
    setIsRefreshing(true);
    try {
      // Using CoinGecko API with price change percentages
      // Add timestamp parameter to avoid caching
      const timestamp = new Date().getTime();
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin,ethereum&vs_currencies=usd&include_24hr_change=true&t=${timestamp}`);
      const data = await response.json();
      
      setCryptoPrices({
        bnb: {
          price: data.binancecoin?.usd || 0,
          changePercent24h: data.binancecoin?.usd_24h_change || 0
        },
        eth: {
          price: data.ethereum?.usd || 0,
          changePercent24h: data.ethereum?.usd_24h_change || 0
        }
      });
      
      // Refresh balances
      await Promise.all([
        refetchBNB(),
        refetchBBLP(),
        refetchETH(),
        refetchWBBLP()
      ]);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Initial fetch and setup refresh interval
  useEffect(() => {
    if (open) {
      // Initial fetch
      fetchPricesAndBalances();
      
      // Setup refresh interval
      refreshTimerRef.current = setInterval(() => {
        fetchPricesAndBalances();
      }, REFRESH_INTERVAL);
      
      // Close network menu when dialog opens
      setShowNetworkMenu(false);
    }
    
    // Cleanup
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close network menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNetworkMenu(false);
    };

    if (showNetworkMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showNetworkMenu]);
  
  // Format USD value function
  const formatUsd = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };

  // Handle disconnect and redirect to home page
  const handleDisconnect = () => {
    disconnect();
    router.push('/');
    onClose();
  };

  const handleSwitchToBSC = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
      setShowNetworkMenu(false);
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
    } catch (error) {
      console.error("Failed to switch to ETH:", error);
      toast.error("Failed to switch to ETH network");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        aria-label="Wallet Assets"
        className="!fixed !bottom-0 !left-0 !right-0 !transform-none !translate-x-0 !translate-y-0 !top-auto w-full max-w-md mx-auto rounded-t-2xl rounded-b-none p-0 bg-gradient-to-b from-black to-zinc-900 border-t border-zinc-800/50 shadow-2xl z-[100] max-h-[80vh] overflow-y-auto flex flex-col focus:outline-none animate-slideInUp"
      >
        <div className="w-full h-1 flex justify-center">
          <div className="w-12 h-1 bg-zinc-700 rounded-full my-3" aria-hidden="true" />
        </div>
        
        {/* Wallet Header with Address */}
        <div className="flex justify-between items-center px-5 py-2 border-b border-zinc-800/30">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/10">
              <span className="text-black font-bold">
                {address ? address.slice(2, 4).toUpperCase() : ""}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-white truncate max-w-[140px]">
                  {address ? `0x${address.slice(2, 6)}...${address.slice(-4)}` : ""}
                </span>
                <button 
                  onClick={copyAddress}
                  className="text-white hover:text-yellow-200 transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              {address && (
                <div className="flex items-center text-xs text-green-500 mt-0.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                  <span className="font-mono">Connected</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            {/* Network Switcher with Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNetworkMenu(!showNetworkMenu);
                }}
                className="relative flex items-center justify-center h-8 px-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-sm text-white border border-zinc-700/50 shadow-inner"
              >
                <div className="flex items-center gap-1.5">
                  {isOnBSC ? (
                    <>
                      <Image 
                        src="/bnb.svg" 
                        alt="BSC" 
                        width={16} 
                        height={16}
                      />
                      <span className="text-xs">BSC</span>
                    </>
                  ) : (
                    <>
                      <Image 
                        src="/eth.png" 
                        alt="ETH" 
                        width={16} 
                        height={16}
                        className="rounded-full"
                      />
                      <span className="text-xs">ETH</span>
                    </>
                  )}
                  <ChevronDown size={14} className="ml-1" />
                </div>
              </button>
              
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
            
            {/* Disconnect button */}
            <button 
              onClick={handleDisconnect}
              className="text-white opacity-70 hover:opacity-100 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Total Balance Section - Now with percentage change and USD change (excluding BBLP tokens) */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-zinc-900 to-zinc-900/80 mb-2">
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-baseline">
            <span className="text-sm text-zinc-500 mr-1">$</span>
            {formatUsd(totalUsd)}
          </h2>
          {/* Display total balance change percentage and USD amount (excluding BBLP and WBBLP) */}
          {weightedChangePercent !== 0 && (
            <p className={`text-sm flex items-center gap-1 ${weightedChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <span>{weightedChangePercent >= 0 ? '▲' : '▼'}</span> 
              <span>${formatChangeValue(Math.abs(nonBblpTotalUsdChange))}</span>
              <span className="opacity-75">({Math.abs(weightedChangePercent).toFixed(2)}%)</span>
            </p>
          )}
        </div>
        
        {/* Remove the Tokens header and divider */}
        
        {/* Asset List - More Professional */}
        <div className="flex flex-col">
          {/* BNB */}
          {bnbBalance && (
            <div className="flex justify-between items-center py-4 px-5 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image 
                    src="/bnb.svg" 
                    alt="BNB" 
                    width={26} 
                    height={26}
                    className="drop-shadow-md"
                  />
                </div>
                <div>
                  <p className="font-medium text-white">Binance Coin</p>
                  <p className="text-sm text-zinc-400">{parseFloat(bnbBalance.formatted).toFixed(5)} BNB</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">${formatUsd(bnbUsd)}</p>
                {cryptoPrices.bnb.changePercent24h !== 0 && (
                  <p className={`text-xs ${cryptoPrices.bnb.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {cryptoPrices.bnb.changePercent24h >= 0 ? '▲' : '▼'} {Math.abs(cryptoPrices.bnb.changePercent24h).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ETH */}
          {ethBalance && (
            <div className="flex justify-between items-center py-4 px-5 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image 
                    src="/eth.png" 
                    alt="ETH" 
                    width={26} 
                    height={26}
                    className="rounded-full drop-shadow-md"
                  />
                </div>
                <div>
                  <p className="font-medium text-white">Ethereum</p>
                  <p className="text-sm text-zinc-400">{parseFloat(ethBalance.formatted).toFixed(6)} ETH</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">${formatUsd(ethUsd)}</p>
                {cryptoPrices.eth.changePercent24h !== 0 && (
                  <p className={`text-xs ${cryptoPrices.eth.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {cryptoPrices.eth.changePercent24h >= 0 ? '▲' : '▼'} {Math.abs(cryptoPrices.eth.changePercent24h).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* WBBLP */}
          {wbblpBalance && (
            <div className="flex justify-between items-center py-4 px-5 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image 
                    src="/BBLP.svg" 
                    alt="WBBLP" 
                    width={26} 
                    height={26}
                    className="drop-shadow-md"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Image 
                      src="/eth.png" 
                      alt="ETH" 
                      width={14} 
                      height={14}
                      className="rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-white">WBBLP Token</p>
                  <p className="text-sm text-zinc-400">{parseFloat(wbblpBalance.formatted).toFixed(3)} WBBLP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">${formatUsd(wbblpUsd)}</p>
                {/* No percentage change for WBBLP as in the screenshot */}
              </div>
            </div>
          )}
          
          {/* BBLP */}
          {bblpBalance && (
            <div className="flex justify-between items-center py-4 px-5 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image 
                    src="/BBLP.svg" 
                    alt="BBLP" 
                    width={26} 
                    height={26}
                    className="drop-shadow-md"
                  />
                </div>
                <div>
                  <p className="font-medium text-white">BBLP Token</p>
                  <p className="text-sm text-zinc-400">{parseFloat(bblpBalance.formatted).toFixed(3)} BBLP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">${formatUsd(bblpUsd)}</p>
                {/* No percentage change for BBLP as in the screenshot */}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 