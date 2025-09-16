'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useAccount, useSwitchChain, useBalance, useWalletClient, useChainId } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { usePresale } from '@/hooks/usePresale';
import { TOKEN_IDS } from '@/config/presale';
import { formatUnits, parseEther, ethers } from 'ethers';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { Info, ChevronDown, ChevronUp, TrendingUp, Shield, Clock, DollarSign, Zap, Network, ArrowUpDown } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { useWallet } from '@/hooks/useWallet';
import { fetchCryptoPrices, getCachedPrices } from '@/lib/priceService';
import { userService } from '@/lib/supabase';
import { toast } from 'sonner';
import Container from '@/components/container';
import Footer from '@/components/footer';
import CTA from '@/components/cta';



// Window type declarations for mobile wallets
declare global {
  interface Window {
    ethereum?: any;
    web3?: {
      currentProvider?: any;
    };
    trustwallet?: any;
    providers?: any[];
  }
}

const PAYMENT_TOKENS = [
  { id: TOKEN_IDS.eth, name: 'ETH', icon: '/eth.png', color: 'from-blue-600 to-blue-400', chainId: 1 }, // Ethereum Mainnet
  { id: TOKEN_IDS.bnb, name: 'BNB', icon: '/bnb.svg', color: 'from-yellow-600 to-yellow-400', chainId: 56 },
];

// Chain IDs
const ETH_MAINNET_CHAIN_ID = 1; // Ethereum Mainnet
const BSC_MAINNET_CHAIN_ID = 56;

// ETH Presale Configuration (Ethereum Mainnet)
const ETH_PRESALE_CONFIG = {
  PRESALE_CONTRACT: "0x56a74AB74FDA831aaBFF0cCD20a3267129b52AAd",
  TOKEN_CONTRACT: "0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235",
  CHAIN_ID: 1,
  RPC_URL: "https://eth.llamarpc.com"
};

// ETH Presale Contract ABI (essential functions)
const ETH_PRESALE_ABI = [
  "function tokenPriceUSD() view returns (uint256)",
  "function calculateTokenAmount(uint256 ethAmount) view returns (uint256)",
  "function calculateETHAmount(uint256 tokenAmount) view returns (uint256)",
  "function getLatestETHPrice() view returns (uint256)",
  "function buyTokens() payable",
  "function paused() view returns (bool)",
  "function totalTokensSold() view returns (uint256)",
  "function tokensPurchased(address) view returns (uint256)",
  "function saleToken() view returns (address)",
  "function ethPriceFeed() view returns (address)",
  "event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 ethPriceUSD)"
];

// Minimal ERC20 ABI for balance reads
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
// Chainlink Aggregator (ETH/USD on Ethereum, BNB/USD on BSC)
const AGGREGATOR_V3_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)"
];
const ETH_PRICE_FEED_ADDRESS = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
const BNB_PRICE_FEED_ADDRESS = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

function PresalePageInner() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desiredTokens, setDesiredTokens] = useState('');
  const [selectedToken, setSelectedToken] = useState<number>(TOKEN_IDS.eth);
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasAllowance, setHasAllowance] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [bnbAmount, setBnbAmount] = useState('');
  const [bblpAmount, setBblpAmount] = useState('');
  const [inputMode, setInputMode] = useState<'BNB' | 'ETH' | 'BBLP'>('BBLP');
  const { userData } = useWallet();

  // ETH Presale specific states
  const [ethAmount, setEthAmount] = useState('');
  const [isEthBuying, setIsEthBuying] = useState(false);
  const [showETHConfirmModal, setShowETHConfirmModal] = useState(false);
  const [showBNBConfirmModal, setShowBNBConfirmModal] = useState(false);
  const [ethPriceUSD, setEthPriceUSD] = useState(0);
  const [bnbPriceUSD, setBnbPriceUSD] = useState(0);
  const [purchasedBalances, setPurchasedBalances] = useState<{ bsc: string; eth: string; total: string }>({ bsc: '0', eth: '0', total: '0' });

  // Presale Progress States
  const [presaleProgress, setPresaleProgress] = useState({
    raised: 0, // Başlangıçta 0, useEffect'te hesaplanacak
    target: 5600000, // $5.6M hedef
    percentage: 0, // Başlangıçta 0
    contributors: 0, // Başlangıçta 0
    daysLeft: 0,
    hoursLeft: 0,
    minutesLeft: 0,
    secondsLeft: 0,
    tokensSold: 0 // Başlangıçta 0
  });
  // Timer state ayrı tutulacak
  const [timer, setTimer] = useState({
    daysLeft: 0,
    hoursLeft: 0,
    minutesLeft: 0,
    secondsLeft: 0
  });
  // Animasyon state'leri
  const [animatedRaised, setAnimatedRaised] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedTokensSold, setAnimatedTokensSold] = useState(0);

  // Presale schedule: start and end dates (UTC)
  const PRESALE_START_ISO = '2025-08-10T12:00:00Z';
  const PRESALE_END_ISO = '2025-09-29T12:00:00Z';
  const PRESALE_START_DATE = new Date(PRESALE_START_ISO);
  const PRESALE_END_DATE = new Date(PRESALE_END_ISO);
  
  // Helper to format UTC date compactly for UX context
  const formatUTC = (date: Date): string => {
    try {
      return date.toLocaleString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'
      }) + ' UTC';
    } catch {
      return date.toUTCString();
    }
  };

  // Sync with internet UTC time to avoid device drift
  const [utcDeltaMs, setUtcDeltaMs] = useState<number>(0); // serverUTC - Date.now()
  useEffect(() => {
    const getUtcDelta = async () => {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { cache: 'no-store' });
        if (!res.ok) throw new Error('utc fetch failed');
        const data = await res.json();
        const serverNow = new Date(data.utc_datetime).getTime();
        setUtcDeltaMs(serverNow - Date.now());
      } catch (e) {
        // fallback: keep delta 0
        console.error('Failed to fetch UTC time, falling back to device time');
        setUtcDeltaMs(0);
      }
    };
    void getUtcDelta();
    const interval = setInterval(getUtcDelta, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Timer (her saniye güncellenir)
  useEffect(() => {
    const startDate = PRESALE_START_DATE;
    const endDate = PRESALE_END_DATE;
    const updateTimer = () => {
      const now = new Date(Date.now() + utcDeltaMs);
      const isBeforeStart = now.getTime() < startDate.getTime();
      const isEnded = now.getTime() >= endDate.getTime();
      const target = isBeforeStart ? startDate : endDate;
      const timeLeft = isEnded ? 0 : Math.max(target.getTime() - now.getTime(), 0);
      const daysLeft = Math.max(Math.floor(timeLeft / (1000 * 60 * 60 * 24)), 0);
      const hoursLeft = Math.max(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0);
      const minutesLeft = Math.max(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)), 0);
      const secondsLeft = Math.max(Math.floor((timeLeft % (1000 * 60)) / 1000), 0);
      setTimer({ daysLeft, hoursLeft, minutesLeft, secondsLeft });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [utcDeltaMs]);

  // Progress ve raised/target (her 30 dakikada bir güncellenir)
  useEffect(() => {
    const endDate = PRESALE_END_DATE;
    const targetUsd = 5600000;
    const tokenPriceUsd = 0.14;

    const updateProgress = async () => {
      const now = new Date();
      const timeRemaining = endDate.getTime() - now.getTime();

      // If presale ended, lock final values
      if (timeRemaining <= 0) {
        setPresaleProgress(prev => ({
          ...prev, 
          raised: targetUsd,
          target: targetUsd,
          percentage: 100,
          // Max 56,000 contributors, rule: 1 contributor per $100
          contributors: Math.min(56000, Math.floor(targetUsd / 100)),
          tokensSold: Math.floor(targetUsd / tokenPriceUsd)
        }));
        return;
      }

      // Try to fetch actual raised amount
      try {
        const response = await fetch('https://bblp-bot-production.up.railway.app/total-raised', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        const totalUsdRaisedRaw = (data as { totalUsdRaised?: unknown }).totalUsdRaised;
        const totalUsdRaised = typeof totalUsdRaisedRaw === 'number' ? totalUsdRaisedRaw : Number(totalUsdRaisedRaw);

        const safeRaised = Number.isFinite(totalUsdRaised) ? Math.max(0, Math.min(totalUsdRaised, targetUsd)) : 0;
        const percentage = (safeRaised / targetUsd) * 100;
        const tokensSold = safeRaised / tokenPriceUsd;
        // Contributors: 1 per $100 contributed, capped at 56,000 total
        const contributors = Math.min(56000, Math.floor(safeRaised / 100));

        setPresaleProgress(prev => ({
          ...prev,
          raised: safeRaised,
          target: targetUsd,  
          percentage,
          contributors,
          tokensSold
        }));
      } catch (err) {
        // On failure, keep previous values without change
        console.error('Failed to fetch total raised:', err);
      }
    };

    void updateProgress();
    const interval = setInterval(() => { void updateProgress(); }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Animasyon efekti - sayfa yüklendiğinde
  useEffect(() => {
    // İlk yükleme kontrolü
    const isFirstLoad = animatedRaised === 0 && presaleProgress.raised > 0;
    
    if (isFirstLoad) {
      // İlk yüklemede animasyon
      const targetRaised = presaleProgress.raised;
      const targetPercentage = presaleProgress.percentage;
      const targetTokensSold = presaleProgress.tokensSold;
      const duration = 1500; // 1.5 saniye
      const fps = 60;
      const increment = 1000 / fps;
      const steps = duration / increment;
      
      let currentStep = 0;
      
      const animate = () => {
        if (currentStep <= steps) {
          // Easing function (easeOutCubic)
          const progress = currentStep / steps;
          const eased = 1 - Math.pow(1 - progress, 3);
          
          // Raised animasyonu
          const currentRaised = targetRaised * eased;
          setAnimatedRaised(currentRaised);
          
          // Percentage animasyonu
          const currentPercentage = targetPercentage * eased;
          setAnimatedPercentage(currentPercentage);
          
          // Tokens sold animasyonu
          const currentTokensSold = targetTokensSold * eased;
          setAnimatedTokensSold(currentTokensSold);
          
          currentStep++;
          requestAnimationFrame(animate);
        } else {
          // Animasyon bittiğinde tam değerleri set et
          setAnimatedRaised(targetRaised);
          setAnimatedPercentage(targetPercentage);
          setAnimatedTokensSold(targetTokensSold);
        }
      };
      
      // Animasyonu başlat
      requestAnimationFrame(animate);
    } else {
      // Sonraki güncellemelerde direkt değerleri set et
      setAnimatedRaised(presaleProgress.raised);
      setAnimatedPercentage(presaleProgress.percentage);
      setAnimatedTokensSold(presaleProgress.tokensSold);
    }
  }, [presaleProgress.raised, presaleProgress.percentage, presaleProgress.tokensSold]);

  // Reset amounts when token selection changes
  useEffect(() => {
    setEthAmount('');
    setBnbAmount('');
    setBblpAmount('');
    // Set input mode based on selected token
    if (selectedToken === TOKEN_IDS.eth) {
      setInputMode('ETH');
    } else {
      setInputMode('BBLP');
    }
  }, [selectedToken, setEthAmount, setBnbAmount, setBblpAmount, setInputMode]);



  // Show all tokens but indicate which network each requires
  const availableTokens = PAYMENT_TOKENS; // Show all tokens
  const selectedTokenDetails = PAYMENT_TOKENS.find(token => token.id === selectedToken);
  const requiresNetworkSwitch = selectedTokenDetails ? selectedTokenDetails.chainId !== Number(chainId) : false;
  
  const { 
    presaleInfo, 
    paymentTokens, 
    loading,
    error: presaleError,
    checkAllowance,
    approveToken,
    buyTokens,
    calculatePaymentAmount,
    tokenPrices
  } = usePresale();

  // Set desired tokens from URL parameter
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam)) && Number(amountParam) > 0) {
      setDesiredTokens(amountParam);
      // Also set the BBLP amount directly for the input field
      setBblpAmount(amountParam);
      setInputMode('BBLP');
    }
  }, [searchParams]);

  // Check if user is on the correct network based on selected token
  const actualChainId = chain?.id ? Number(chain.id) : (chainId ? Number(chainId) : undefined);
  const requiredChainId = selectedToken === TOKEN_IDS.eth ? ETH_MAINNET_CHAIN_ID : BSC_MAINNET_CHAIN_ID;
  const isOnCorrectNetwork = actualChainId === requiredChainId;
  const isOnBSCMainnet = actualChainId === BSC_MAINNET_CHAIN_ID;
  const isOnETHMainnet = actualChainId === ETH_MAINNET_CHAIN_ID;

  // Use wagmi hooks for balances - like dashboard
  const { data: ethBalance } = useBalance(address ? { address, chainId: 1 } : { address: undefined });
  const { data: bnbBalance } = useBalance(address ? { address, chainId: 56 } : { address: undefined });

  // Fetch ETH/USD from Chainlink (Ethereum) and BNB/USD from Chainlink (BSC)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // ETH/USD on Ethereum
        const ethProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        const ethFeed = new ethers.Contract(ETH_PRICE_FEED_ADDRESS, AGGREGATOR_V3_ABI, ethProvider);
        const [ethDecimals, ethRound] = await Promise.all([
          ethFeed.decimals(),
          ethFeed.latestRoundData()
        ]);
        const ethAnswer = Number(ethRound[1]);
        const ethPrice = ethAnswer / 10 ** Number(ethDecimals);
        if (Number.isFinite(ethPrice) && ethPrice > 0) setEthPriceUSD(ethPrice);
      } catch (e) {
        console.error('ETH oracle fetch failed', e);
      }

      try {
        // BNB/USD on BSC
        const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
        const bnbFeed = new ethers.Contract(BNB_PRICE_FEED_ADDRESS, AGGREGATOR_V3_ABI, bscProvider);
        const [bnbDecimals, bnbRound] = await Promise.all([
          bnbFeed.decimals(),
          bnbFeed.latestRoundData()
        ]);
        const bnbAnswer = Number(bnbRound[1]);
        const bnbPrice = bnbAnswer / 10 ** Number(bnbDecimals);
        if (Number.isFinite(bnbPrice) && bnbPrice > 0) setBnbPriceUSD(bnbPrice);
      } catch (e) {
        console.error('BNB oracle fetch failed', e);
      }
    };

    void fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user's purchased token balances across ETH (WBBLP) and BSC (BBLP)
  useEffect(() => {
    const fetchPurchasedBalances = async () => {
      try {
        if (!address) {
          setPurchasedBalances({ bsc: '0', eth: '0', total: '0' });
          return;
        }
        const ethProvider = new ethers.JsonRpcProvider(ETH_PRESALE_CONFIG.RPC_URL);
        const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
        const ethToken = new ethers.Contract(ETH_PRESALE_CONFIG.TOKEN_CONTRACT, ERC20_ABI, ethProvider);
        const bscToken = new ethers.Contract(ETH_PRESALE_CONFIG.TOKEN_CONTRACT, ERC20_ABI, bscProvider);
        // Assume same decimals across chains
        const decimals: number = await ethToken.decimals();
        const [ethBal, bscBal] = await Promise.all([
          ethToken.balanceOf(address),
          bscToken.balanceOf(address)
        ]);
        const ethAmount = Number(ethers.formatUnits(ethBal, decimals));
        const bscAmount = Number(ethers.formatUnits(bscBal, decimals));
        const total = ethAmount + bscAmount;
        setPurchasedBalances({
          eth: ethAmount.toFixed(4),
          bsc: bscAmount.toFixed(4),
          total: total.toFixed(4)
        });
      } catch (e) {
        console.error('Failed to fetch purchased balances', e);
      }
    };
    void fetchPurchasedBalances();
    const interval = setInterval(fetchPurchasedBalances, 30000);
    return () => clearInterval(interval);
  }, [address]);

  // Save user to database when wallet is connected to correct network
  useEffect(() => {
    const saveUserToDatabase = async () => {
      if (isConnected && address && isOnCorrectNetwork) {
        try {
          await userService.addUser(address);
          console.log('User saved successfully from presale page');
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    saveUserToDatabase();
  }, [isConnected, address, isOnCorrectNetwork]);

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return;
    
    try {
      setIsSwitchingChain(true);
      const targetChainName = selectedToken === TOKEN_IDS.eth ? 'Ethereum Mainnet' : 'BSC Mainnet';
      setStatusMessage(`Switching to ${targetChainName}...`);
      await switchChain({ chainId: requiredChainId });
      setStatusMessage(`Successfully switched to ${targetChainName}!`);
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      if (err.code === 4001) {
        setError('Chain switch was cancelled by user');
      } else {
        const targetChainName = selectedToken === TOKEN_IDS.eth ? 'Ethereum Mainnet' : 'BSC Mainnet';
        setError(`Failed to switch to ${targetChainName}. Please switch manually in your wallet.`);
      }
    } finally {
      setIsSwitchingChain(false);
    }
  };

  // ETH Presale Functions
  const calculateETHTokenAmount = useCallback(async (ethAmountWei: string) => {
    try {
      // 0 veya negatif değer kontrolü
      if (!ethAmountWei || BigInt(ethAmountWei) <= 0) {
        console.log('calculateETHTokenAmount: Invalid amount', ethAmountWei);
        return '0';
      }
      
      // ETH fiyatı yüklenene kadar bekle
      if (ethPriceUSD <= 0) {
        return '0';
      }
      
      // Direct calculation using ETH price and presale price $0.14
      const ethValue = Number(ethers.formatEther(ethAmountWei));
      if (ethValue <= 0) return '0';
      
      const bblpAmount = (ethValue * ethPriceUSD) / 0.14;
      return bblpAmount.toFixed(18);
    } catch (err) {
      console.error('Error calculating ETH token amount:', err);
      return '0';
    }
  }, [ethPriceUSD]);

  const buyTokensWithETH = async () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setError('Please enter a valid ETH amount');
      return;
    }
    
    // Mobil için daha esnek network kontrolü
    const isEthNetwork = actualChainId === ETH_MAINNET_CHAIN_ID;
    
    if (!isEthNetwork && isConnected) {
      setError('Please switch to Ethereum Mainnet');
      return;
    }
    
    // Show confirmation modal first
    setShowETHConfirmModal(true);
  };

  const confirmETHPurchase = async () => {
    setShowETHConfirmModal(false);
    
    try {
      setIsEthBuying(true);
      setStatusMessage('Initializing ETH purchase...');
      
      // Use walletClient from wagmi
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }
      
      const ethAmountWei = ethers.parseEther(ethAmount);
      
      // Get signer from walletClient
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      
      const presaleContract = new ethers.Contract(
        ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
        ETH_PRESALE_ABI,
        signer
      );
      
      // Calculate expected tokens in UI (no contract read)
      const ethFloat = parseFloat(ethAmount);
      const expectedTokensFloat = ethPriceUSD > 0 ? (ethFloat * ethPriceUSD) / 0.14 : 0;
      const tokenAmountFormatted = expectedTokensFloat.toFixed(6);
      
      setStatusMessage(`Confirm transaction: ${parseFloat(ethAmount).toFixed(4)} ETH → ${parseFloat(tokenAmountFormatted).toFixed(2)} BBLP`);
      
      // Gas limit belirleme
      let gasLimit;
      try {
        // Estimate gas for the actual transaction
        const gasEstimate = await presaleContract.buyTokens.estimateGas({
          value: ethAmountWei
        });
        // Add 20% buffer to gas estimate
        gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      } catch (gasError) {
        console.error('Gas estimation failed, using default:', gasError);
        gasLimit = 200000; // Fallback gas limit
      }
      
      const tx = await presaleContract.buyTokens({
        value: ethAmountWei,
        gasLimit: gasLimit
      });
      
      setStatusMessage('Transaction submitted, waiting for confirmation...');
      const receipt = await tx.wait();
      
      console.log('Transaction successful:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        contractAddress: ETH_PRESALE_CONFIG.PRESALE_CONTRACT
      });
      
      setStatusMessage('ETH purchase successful!');
      setEthAmount('');
      setBblpAmount('');
    } catch (err: any) {
      console.error('ETH purchase failed:', err);
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('Transaction was cancelled by user');
      } else if (err.message?.includes('insufficient funds')) {
        setError('Insufficient ETH balance for transaction and gas fees');
      } else if (err.message?.includes('Wallet not connected')) {
        setError('Wallet connection lost. Please reconnect your wallet.');
      } else {
        setError(err.message || 'Failed to complete ETH purchase');
      }
    } finally {
      setIsEthBuying(false);
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Calculate payment amount when desired tokens or selected token changes
  useEffect(() => {
    const updatePaymentAmount = async () => {
      // ETH için payment amount hesaplamasını atla
      if (selectedToken === TOKEN_IDS.eth) {
        setPaymentAmount('0');
        setHasAllowance(true);
        setIsCheckingAllowance(false);
        return;
      }
      
      if (desiredTokens && isOnCorrectNetwork) {
        const amount = await calculatePaymentAmount(selectedToken, desiredTokens);
        setPaymentAmount(amount);
        
        // Check allowance for the calculated payment amount
        if (selectedToken !== TOKEN_IDS.bnb && selectedToken !== TOKEN_IDS.eth) {
          try {
            setIsCheckingAllowance(true);
            const allowance = await checkAllowance(selectedToken);
            setHasAllowance(BigInt(allowance) >= BigInt(amount));
          } catch (err) {
            console.error('Error checking allowance:', err);
            setHasAllowance(false);
          } finally {
            setIsCheckingAllowance(false);
          }
        } else {
          setHasAllowance(true);
          setIsCheckingAllowance(false);
        }
      } else {
        setPaymentAmount('0');
        setHasAllowance(false);
        setIsCheckingAllowance(false);
      }
    };

    updatePaymentAmount();
  }, [desiredTokens, selectedToken, calculatePaymentAmount, checkAllowance, isOnCorrectNetwork, setPaymentAmount, setIsCheckingAllowance, setHasAllowance]);

  // Presale price (assume presaleInfo?.tokenPriceUSD is in 1e8 USD, and BNB price is in USD)
  const presalePrice = 0.14;
  const bblpPriceInBNB = bnbPriceUSD > 0 ? presalePrice / bnbPriceUSD : 0;

  const getCurrentUsdValue = (): number => {
    try {
      if (inputMode === 'BBLP' && bblpAmount) {
        const v = parseFloat(bblpAmount);
        return isNaN(v) ? 0 : v * presalePrice;
      }
      if (selectedToken === TOKEN_IDS.eth) {
        const v = parseFloat(ethAmount || '0');
        return ethPriceUSD > 0 && !isNaN(v) ? v * ethPriceUSD : 0;
      }
      if (selectedToken === TOKEN_IDS.bnb) {
        const v = parseFloat(bnbAmount || '0');
        return bnbPriceUSD > 0 && !isNaN(v) ? v * bnbPriceUSD : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const currentUsdValue = getCurrentUsdValue();
  const meetsUsdRange = currentUsdValue > 0;

  // Update BBLP when BNB changes
  useEffect(() => {
    if (inputMode === 'BNB' && selectedToken === TOKEN_IDS.bnb) {
      const bnb = parseFloat(bnbAmount);
      if (!isNaN(bnb) && bnb > 0 && bblpPriceInBNB > 0) {
        setBblpAmount((bnb / bblpPriceInBNB).toFixed(4));
      } else {
        setBblpAmount('');
      }
    }
    // eslint-disable-next-line
  }, [bnbAmount, bblpPriceInBNB, selectedToken, inputMode]);

  // Update BNB when BBLP changes
  useEffect(() => {
    if (inputMode === 'BBLP' && selectedToken === TOKEN_IDS.bnb) {
      const bblp = parseFloat(bblpAmount);
      if (!isNaN(bblp) && bblp > 0 && bblpPriceInBNB > 0) {
        setBnbAmount((bblp * bblpPriceInBNB).toFixed(6));
      } else {
        setBnbAmount('');
      }
    }
    // eslint-disable-next-line
  }, [bblpAmount, bblpPriceInBNB, selectedToken, inputMode]);

  // ETH: Update BBLP when ETH changes
  useEffect(() => {
    const updateETHCalculation = async () => {
      if (selectedToken === TOKEN_IDS.eth && ethAmount && parseFloat(ethAmount) > 0 && inputMode === 'ETH') {
        // Minimum ETH kontrolü
        const minEth = 0.0001;
        if (parseFloat(ethAmount) < minEth) {
          setBblpAmount('0');
          return;
        }
        
        try {
          const ethAmountWei = ethers.parseEther(ethAmount);
          const tokenAmount = await calculateETHTokenAmount(ethAmountWei.toString());
          setBblpAmount(parseFloat(tokenAmount).toFixed(4));
        } catch (error) {
          console.error('Error in ETH calculation:', error);
          setBblpAmount('0');
        }
      } else if (selectedToken === TOKEN_IDS.eth && inputMode === 'ETH') {
        setBblpAmount('0');
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateETHCalculation();
    }
  }, [ethAmount, selectedToken, inputMode, calculateETHTokenAmount]);

  // ETH: Update ETH when BBLP changes  
  useEffect(() => {
    const updateBBLPtoETHCalculation = async () => {
      if (selectedToken === TOKEN_IDS.eth && bblpAmount && parseFloat(bblpAmount) > 0 && inputMode === 'BBLP') {
        // ETH fiyatı yüklenene kadar bekle
        if (ethPriceUSD <= 0) {
          setEthAmount('');
          return;
        }
        
        try {
          // Direct calculation using ETH price and $0.14/BBLP
          const bblpValueUSD = parseFloat(bblpAmount) * 0.14;
          const ethAmount = bblpValueUSD / ethPriceUSD;
          setEthAmount(ethAmount.toFixed(6));
        } catch (error) {
          console.error('Error calculating ETH from BBLP:', error);
          setEthAmount('');
        }
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateBBLPtoETHCalculation();
    }
  }, [bblpAmount, selectedToken, inputMode, ethPriceUSD]);

  // ETH: Update BBLP when ETH changes
  useEffect(() => {
    const updateETHtoBBLPCalculation = async () => {
      if (selectedToken === TOKEN_IDS.eth && ethAmount && parseFloat(ethAmount) > 0 && inputMode === 'ETH') {
        // ETH fiyatı yüklenene kadar bekle
        if (ethPriceUSD <= 0) {
          setBblpAmount('');
          return;
        }
        
        try {
          // Direct calculation using ETH price and $0.14/BBLP
          const bblpValueUSD = parseFloat(ethAmount) * ethPriceUSD;
          const bblpAmount = bblpValueUSD / 0.14;
          setBblpAmount(bblpAmount.toFixed(4));
        } catch (error) {
          console.error('Error calculating BBLP from ETH:', error);
          setBblpAmount('');
        }
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateETHtoBBLPCalculation();
    }
  }, [ethAmount, selectedToken, inputMode, ethPriceUSD]);

  // State for gas prices
  const [gasPrices, setGasPrices] = useState({
    eth: { gasPrice: 30, gasLimit: 150000 }, // Default values
    bnb: { gasPrice: 5, gasLimit: 200000 }   // Default values
  });

  // Fetch current gas prices and estimate gas limits
  useEffect(() => {
    const fetchGasPrices = async () => {
      try {
        // For Ethereum
        if (selectedToken === TOKEN_IDS.eth) {
          // Try to get current gas price from the network
          try {
            const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
            const feeData = await provider.getFeeData();
            
            // Convert BigInt to number and from wei to gwei
            const currentGasPrice = Number(feeData.gasPrice) / 1e9;
            
            // Add 20% buffer for safety
            const safeGasPrice = Math.ceil(currentGasPrice * 1.2);
            
            console.log('Current ETH Gas Price:', currentGasPrice, 'Gwei');
            console.log('Safe ETH Gas Price:', safeGasPrice, 'Gwei');
            
            // Update gas prices state
            setGasPrices(prev => ({
              ...prev,
              eth: { 
                ...prev.eth, 
                gasPrice: safeGasPrice 
              }
            }));
            
            // Estimate gas limit if wallet is connected
            if (walletClient && address && isOnETHMainnet) {
              try {
                await estimateGasLimit('eth');
              } catch (gasError) {
                console.error('Error estimating ETH gas limit:', gasError);
              }
            }
          } catch (error) {
            console.error('Error fetching ETH gas price:', error);
            // Keep using default values
          }
        }
        
        // For BNB
        if (selectedToken === TOKEN_IDS.bnb) {
          try {
            const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
            const feeData = await provider.getFeeData();
            
            // Convert BigInt to number and from wei to gwei
            const currentGasPrice = Number(feeData.gasPrice) / 1e9;
            
            // Add 20% buffer for safety
            const safeGasPrice = Math.ceil(currentGasPrice * 1.2);
            
            console.log('Current BNB Gas Price:', currentGasPrice, 'Gwei');
            console.log('Safe BNB Gas Price:', safeGasPrice, 'Gwei');
            
            // Update gas prices state
            setGasPrices(prev => ({
              ...prev,
              bnb: { 
                ...prev.bnb, 
                gasPrice: safeGasPrice 
              }
            }));
          } catch (error) {
            console.error('Error fetching BNB gas price:', error);
            // Keep using default values
          }
        }
      } catch (error) {
        console.error('Error in fetchGasPrices:', error);
      }
    };

    fetchGasPrices();
    // Refresh gas prices every 30 seconds
    const interval = setInterval(fetchGasPrices, 30000);
    
    return () => clearInterval(interval);
  }, [selectedToken, walletClient, address, isOnETHMainnet]);

  // Estimate gas limit for transactions
  const estimateGasLimit = async (tokenType: 'eth' | 'bnb'): Promise<number> => {
    try {
      if (tokenType === 'eth') {
        // ETH için gas limit hesaplama
        if (!walletClient || !address) {
          console.log('Wallet not connected, using default gas limit for ETH');
          return gasPrices.eth.gasLimit; // Default değeri döndür
        }

        try {
          // Create provider from wallet client
          const provider = new ethers.BrowserProvider(walletClient as any);
          const signer = await provider.getSigner();
          
          // Create a contract instance
          const presaleContract = new ethers.Contract(
            ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
            ETH_PRESALE_ABI,
            signer
          );
          
          // Estimate gas for buyTokens function
          // Minimum ETH değeri (0.01 ETH) ile gas tahmini yapıyoruz
          const minEthValue = ethers.parseEther('0.01');
          const estimatedGas = await presaleContract.buyTokens.estimateGas({
            value: minEthValue
          });
          
          // Convert BigInt to number and add 20% buffer
          const gasLimit = Math.ceil(Number(estimatedGas) * 1.2);
          console.log('Estimated ETH gas limit:', gasLimit);
          
          // Update gas prices state
          setGasPrices(prev => ({
            ...prev,
            eth: { 
              ...prev.eth, 
              gasLimit: gasLimit 
            }
          }));
          
          return gasLimit;
        } catch (error) {
          console.error('Error estimating ETH gas limit:', error);
          return gasPrices.eth.gasLimit; // Error durumunda default değeri döndür
        }
      } else {
        // BNB için gas limit hesaplama - daha basit bir yaklaşım
        // BNB ağında presale işlemleri için standart değer kullanıyoruz
        return gasPrices.bnb.gasLimit;
      }
    } catch (error) {
      console.error('Error in estimateGasLimit:', error);
      return tokenType === 'eth' ? gasPrices.eth.gasLimit : gasPrices.bnb.gasLimit;
    }
  };


  // Max button for selected token
  const handleMaxToken = async () => {
    if (!selectedTokenDetails || !address) return;

    try {
      // Max değerleri, mevcut poll edilen gas verisiyle ANINDA hesapla
      if (selectedTokenDetails.name === 'ETH') {
        // ETH fiyatının yüklendiğinden emin ol
        if (!ethPriceUSD || ethPriceUSD <= 0) {
          console.error('ETH price not loaded yet');
          setError('Please wait for ETH price to load');
          return;
        }
        
        // Use balance from useBalance hook
        const ethBalanceValue = ethBalance ? parseFloat(ethBalance.formatted) : 0;
        
        console.log('Current ETH Balance:', ethBalanceValue);
        console.log('Current ETH Price USD:', ethPriceUSD);
        
        // Balance kontrolü
        if (ethBalanceValue <= 0) {
          setError('No ETH balance found in wallet');
          setEthAmount('0');
          setBblpAmount('0');
          return;
        }
        
        // Gas fee için rezerv hesaplama - mevcut poll edilen değerleri kullan
        const { gasPrice, gasLimit } = gasPrices.eth;
        const gasFeeETH = (gasLimit * gasPrice) / 1000000000; // Convert from Gwei to ETH
        
        console.log('Current Gas Price:', gasPrice, 'Gwei');
        console.log('Gas Limit:', gasLimit);
        console.log('Estimated Gas Fee:', gasFeeETH, 'ETH');
        
        // Kullanılabilir maksimum ETH miktarı (gas fee rezervi bırakarak)
        const maxEthAmount = Math.max(0, ethBalanceValue - gasFeeETH);
        
        // Güvenlik için %2 daha düşük kullanıyoruz (ek koruma)
        const safeMaxEthAmount = maxEthAmount * 0.98;
        
        console.log('Max ETH Amount (after gas reserve):', safeMaxEthAmount, 'ETH');
        
        setInputMode('ETH');
        setEthAmount(safeMaxEthAmount.toFixed(6));
        
        // Calculate BBLP amount
        try {
          if (safeMaxEthAmount > 0) {
            const ethAmountWei = ethers.parseEther(safeMaxEthAmount.toString());
            const tokenAmount = await calculateETHTokenAmount(ethAmountWei.toString());
            setBblpAmount(tokenAmount);
            console.log('Calculated BBLP Amount:', tokenAmount);
          } else {
            setBblpAmount('0');
            if (maxEthAmount <= 0) {
              setError('Insufficient ETH balance for gas fees');
            }
          }
        } catch (calcError) {
          console.error('Error calculating BBLP amount:', calcError);
          setBblpAmount('0');
        }
        
      } else if (selectedTokenDetails.name === 'BNB') {
        // Use balance from useBalance hook
        const bnbBalanceValue = bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
        
        // Gas fee için rezerv hesaplama - mevcut poll edilen değerleri kullan
        const { gasPrice, gasLimit } = gasPrices.bnb;
        const gasFeeInBNB = (gasLimit * gasPrice) / 1000000000; // Convert from Gwei to BNB
        
        console.log('Current Gas Price:', gasPrice, 'Gwei');
        console.log('Gas Limit:', gasLimit);
        console.log('Estimated Gas Fee for BNB:', gasFeeInBNB, 'BNB');
        
        // Kullanılabilir maksimum BNB miktarı (gas fee rezervi bırakarak)
        const maxBnbAmount = Math.max(0, bnbBalanceValue - gasFeeInBNB);
        
        // Güvenlik için %2 daha düşük kullanıyoruz
        const safeMaxBnbAmount = maxBnbAmount * 0.98;
        
        console.log('Max BNB Amount (after gas reserve):', safeMaxBnbAmount, 'BNB');
        
        setInputMode('BNB');
        setBnbAmount(safeMaxBnbAmount.toFixed(6));
        
        // Yetersiz bakiye kontrolü
        if (maxBnbAmount <= 0) {
          setError('Insufficient BNB balance for gas fees');
        }
      }
    } catch (error) {
      console.error('Error getting max balance:', error);
      setError('Failed to get wallet balance. Please try again.');
    }
  };

  // Flip input mode
  const handleFlip = () => {
    if (selectedToken === TOKEN_IDS.eth) {
      setInputMode(inputMode === 'ETH' ? 'BBLP' : 'ETH');
    } else {
      setInputMode(inputMode === 'BNB' ? 'BBLP' : 'BNB');
    }
  };

  // Don't redirect if wallet is not connected - show the page with connect wallet option

  const handleApprove = async () => {
    if (!paymentAmount || paymentAmount === '0' || !isOnBSCMainnet) return;
    
    try {
      setIsApproving(true);
      setStatusMessage('Approving tokens...');  
      await approveToken(selectedToken, paymentAmount);
      setStatusMessage('Tokens approved successfully!');
      
      // Re-check allowance
      const allowance = await checkAllowance(selectedToken);
      setHasAllowance(BigInt(allowance) >= BigInt(paymentAmount));
    } catch (err: any) {
      console.error('Approval failed:', err);
      if (err.message.includes('User rejected')) {
        setError('Approval was cancelled by user');
      } else {
        setError(err.message || 'Please try again');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!bnbAmount || parseFloat(bnbAmount) <= 0) {
      setError('Please enter a valid BNB amount');
      return;
    }
    
    // Mobil için daha esnek network kontrolü
    const isBscNetwork = actualChainId === BSC_MAINNET_CHAIN_ID;
    
    if (!isBscNetwork && isConnected) {
      setError('Please switch to BSC Mainnet');
      return;
    }
    
    setShowBNBConfirmModal(true);
  };

  const confirmBNBPurchase = async () => {
    setShowBNBConfirmModal(false);
    
    try {
      setIsBuying(true);
      setStatusMessage('Initializing BNB purchase...');
      
      // Convert BNB amount to wei format
      const bnbAmountWei = parseEther(bnbAmount);
      
      // BNB satın alımını gerçekleştir
      await buyTokens(TOKEN_IDS.bnb, bnbAmountWei.toString());
      
      setStatusMessage('Purchase successful!');
      setBnbAmount('');
      setBblpAmount('');
      
      // Balance will be automatically refreshed by useBalance hook
    } catch (err: any) {
      console.error('Purchase failed:', err);
      if (err.message?.includes('User rejected') || err.code === 4001) {
        setError('Transaction was cancelled by user');
      } else if (err.message?.includes('Insufficient BNB balance')) {
        setError('Insufficient BNB balance for transaction');
      } else if (err.message?.includes('execution reverted')) {
        setError('Transaction failed. Please check your balance and try again.');
      } else {
        setError(err.message || 'Failed to complete the purchase');
      }
    } finally {
      setIsBuying(false);
    }
  };

  const formatPrice = (price: bigint | undefined): string => {
    if (!price) return '0.00';
    return (Number(price) / 1e8).toFixed(2);
  };

  const selectedTokenData = PAYMENT_TOKENS.find(t => t.id === selectedToken);
  const selectedTokenName = selectedTokenData?.name || 'BNB';

  // Helper: get current wallet balance for selected token
  const getCurrentTokenBalance = () => {
    if (selectedToken === TOKEN_IDS.bnb) {
      return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
    }
    if (selectedToken === TOKEN_IDS.eth) {
      return ethBalance ? parseFloat(ethBalance.formatted) : 0;
    }
    return 0;
  };

  // Check insufficient balance
  const isInsufficientBalance = () => {
    if (selectedToken === TOKEN_IDS.bnb) {
      return bnbAmount && parseFloat(bnbAmount) > getCurrentTokenBalance();
    }
    if (selectedToken === TOKEN_IDS.eth) {
      return ethAmount && parseFloat(ethAmount) > getCurrentTokenBalance();
    }
    return false;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-10 md:pt-10">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
          <Header />
          <div className="flex items-center justify-center py-20 mt-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
              <Image 
                src="/logo.svg" 
                alt="BBLP" 
                width={32} 
                height={32} 
                className="absolute inset-0 m-auto animate-pulse" 
              />
            </div>
          </div>
        </section>
        <Particles
          quantityDesktop={80}
          quantityMobile={30}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip ">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-6 mt-10">
            {/* Enhanced Hero Section with Stronger Value Proposition */}


             
            <div className="mb-4">
            
              
              <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-3">
                Purchase BBLP
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
            Purchase BBLP tokens from BSC & Ethereum Mainnet


            </p>
              
             
              
             
              
           
            </div>
          </div>

          {/* Minimal Professional Presale Progress */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-6 ">
            {/* Countdown - clearer UX context */}
            <div className="flex flex-col items-center justify-center mb-6">
              {(() => {
                const nowTs = Date.now() + utcDeltaMs;
                const isBeforeStart = nowTs < PRESALE_START_DATE.getTime();
                const isEnded = nowTs >= PRESALE_END_DATE.getTime();
                const label = isEnded ? 'Presale ended' : isBeforeStart ? 'Presale starts in' : 'Presale ends in';
                const subLabel = isEnded ? '' : (isBeforeStart ? `Starts ${formatUTC(PRESALE_START_DATE)}` : `Ends ${formatUTC(PRESALE_END_DATE)}`);
                return (
                  <div className="text-center mb-3">
                    <div className="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider">{label}</div>
                  
                  </div>
                );
              })()}

              <div className="flex items-center gap-1 sm:gap-3">
                <div className="flex flex-col items-center">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-4 py-2 min-w-[48px] sm:min-w-[56px] text-center">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">{String(timer.daysLeft).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-wider">Days</span>
                </div>
                <span className="text-lg sm:text-xl text-gray-600 font-bold">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-4 py-2 min-w-[48px] sm:min-w-[56px] text-center">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">{String(timer.hoursLeft).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-wider">Hours</span>
                </div>
                <span className="text-lg sm:text-xl text-gray-600 font-bold">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-4 py-2 min-w-[48px] sm:min-w-[56px] text-center">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">{String(timer.minutesLeft).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-wider">Minutes</span>
                </div>
                <span className="text-lg sm:text-xl text-gray-600 font-bold">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-4 py-2 min-w-[48px] sm:min-w-[56px] text-center">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">{String(timer.secondsLeft).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-wider">Seconds</span>
                </div>
              </div>
            </div> 
            {/* Raised/Target - single line, themed */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-baseline gap-2 whitespace-nowrap px-2">
                <span className="text-xs sm:text-sm text-gray-400">USD Raised:</span>
                <span className="text-sm sm:text-xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B]">
                  ${animatedRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm sm:text-xl font-mono font-bold text-gray-500">/</span>
                <span className="text-sm sm:text-xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B]">
                  ${presaleProgress.target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            {/* Progress Bar with centered label */}
            <div className="mb-6">
              <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-none"
                  style={{width: `${animatedPercentage}%`}}
                />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="px-2 py-[2px] text-[10px] sm:text-xs  text-gray-300 rounded-full  whitespace-nowrap">
                    Until Presale Ends
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {Math.floor(animatedTokensSold).toLocaleString()} BBLP Sold
                </span>
                <span className="text-xs text-gray-500">{presaleProgress.contributors.toLocaleString()} Contributors</span>
              </div>
              
            </div>
                
            <div className="">
            {/* Top Row: Pay input (left) + Payment Method dropdown (right) */}
            <div className="mb-5">
              <div className="grid grid-cols-2 gap-3">
                {/* Pay input */}
                <div className="relative">
                  <label className="text-xs text-gray-400 block mb-2">
                    {selectedToken === TOKEN_IDS.eth ? 'Pay with ETH' : 'Pay with BNB'}
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={selectedToken === TOKEN_IDS.eth ? ethAmount : bnbAmount}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        if (selectedToken === TOKEN_IDS.eth) {
                          setInputMode('ETH');
                          setEthAmount(value);
                        } else {
                          setInputMode('BNB');
                          setBnbAmount(value);
                        }
                      }
                    }}
                    className="h-10 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 rounded-lg"
                    disabled={loading}
                  />
                </div>

                {/* Payment Method Dropdown with Balance + Max above */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-end mb-2 text-xs">
                    {isConnected && (
                      <span className="text-gray-500 mr-2">
                        {selectedToken === TOKEN_IDS.eth 
                          ? `${ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000'} ETH` 
                          : `${bnbBalance ? parseFloat(bnbBalance.formatted).toFixed(4) : '0.0000'} BNB`}
                      </span>
                    )}
                    <button
                      onClick={handleMaxToken}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      type="button"
                    >
                      Max
                    </button>
                  </div>
                  <Select
                    value={selectedToken === TOKEN_IDS.eth ? 'eth' : 'bnb'}
                    onValueChange={(val) => {
                      setSelectedToken(val === 'eth' ? TOKEN_IDS.eth : TOKEN_IDS.bnb);
                    }}
                  >
                    <SelectTrigger className="h-10 bg-zinc-800/50 border-zinc-700 text-white">
                      <div className="flex items-center gap-2">
                        <Image src={selectedToken === TOKEN_IDS.eth ? '/eth.png' : '/bnb.svg'} alt="token" width={18} height={18} className={selectedToken === TOKEN_IDS.eth ? 'rounded-full' : ''} />
                        <SelectValue placeholder="Select token" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eth">ETH</SelectItem>
                      <SelectItem value="bnb">BNB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            

            {/* BBLP Output - Full width under inputs */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Receive BBLP</span>
                <span className="text-[10px] sm:text-xs text-gray-500">1 BBLP = $0.14 USD</span>
              </div>
              <div className="relative h-10 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center pl-3 pr-16">
                <span className="text-sm text-white/90">{bblpAmount || '0.00'}</span>
                <div className="absolute right-3 inset-y-0 flex items-center gap-2">
                  <Image src="/BBLP.svg" alt="BBLP" width={16} height={16} />
                  <span className="text-xs text-gray-400">BBLP</span>
                </div>
              </div>
            </div>



            {/* Network warning removed; messaging moved to primary action button */}

            {/* Action Button - Minimal */}
            {!isConnected ? (
              <Button
                className="w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-black font-medium transition-colors"
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet
              </Button>
            ) : requiresNetworkSwitch ? (
              <Button
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
                onClick={() => {
                  if (selectedTokenDetails) {
                    switchChain({ chainId: selectedTokenDetails.chainId as any });
                  }
                }}
              >
                {selectedToken === TOKEN_IDS.eth ? 'Switch to ETH' : 'Switch to BSC'}
              </Button>
            ) : (
              <Button
                className={cn(
                  "w-full h-12 font-semibold transition-all duration-200 relative overflow-hidden",
                  (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0)) || 
                  (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0))
                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                    : isInsufficientBalance()
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-green-500/20"
                )}
                disabled={
                  isInsufficientBalance() ||
                  (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0 || isEthBuying)) ||
                  (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0 || isBuying))
                }
                onClick={selectedToken === TOKEN_IDS.eth ? buyTokensWithETH : handleBuy}
              >
                {(selectedToken === TOKEN_IDS.eth ? isEthBuying : isBuying) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : isInsufficientBalance() ? (
                  'Insufficient Balance'
                ) : (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0)) || 
                   (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0)) ? (
                  'Enter Amount'
                ) : (
                  'Purchase'
                )}
              </Button>
              
            )}



            <div className="flex items-center justify-between  mt-1">
              <span className="text-[10px] font-medium text-gray-400">Purchased BBLP</span>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">{purchasedBalances.eth} WBBLP (ETH) · {purchasedBalances.bsc} BBLP (BSC)</span>
              </div>
            </div>

                            {/* Minimal Price Info */}
            
            </div>
            
           
          </div>


      


          

              {/* Minimal Network Status */}

            </div>
            
            {/* Status Messages - Minimal */}
            {(error || statusMessage) && (
              <div className={cn(
                "px-6 py-3 border-t text-center text-sm",
                error 
                  ? 'bg-red-500/5 border-red-500/20 text-red-400' 
                  : 'bg-green-500/5 border-green-500/20 text-green-400'
              )}>
                {error || statusMessage}
              </div>
            )}
    



        


         

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
          <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl mt-40  '>
        {/* FAQ Section - Professional */}
        <div className="mb-20 -mt-40">
          <div className="text-center mb-8">
            
          </div>
          
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-xl border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <Info className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Presale Information</h3>
                  <p className="text-xs text-gray-500">Key details about the token sale</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
                )}
              </div>
            </button>
            
            {showDetails && (
              <div className="px-6 pb-4 border-t border-zinc-800">
                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Current Price</h4>
                      <p className="text-xs text-gray-400">$0.14 per BBLP token (Presale Final Round)</p>
                    </div>
                  </div>
                  
           
                  
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Early Bird Pricing</h4>
                      <p className="text-xs text-gray-400">Available during presale period only</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3  rounded-lg">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Network className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Network Requirement</h4>
                      <p className="text-xs text-gray-400">Presale is available on BNB Smart Chain & Ethereum</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </main>

    
      
      {/* Wallet Connection Modal */}
      <WalletModal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />

      {/* ETH Purchase Confirmation Modal */}
      {showETHConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-xl"
          >
            <div className="p-4">
              {/* Header (compact) */}
              <div className="flex items-center gap-2 mb-3">
                <Image src="/eth.png" alt="ETH" width={20} height={20} className="rounded-full" />
                <h3 className="text-sm font-semibold text-white">Confirm Purchase</h3>
              </div>

              {/* Compact details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-3 py-2">
                  <span className="text-[11px] text-zinc-400">You pay</span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-white">{parseFloat(ethAmount || '0').toFixed(6)} ETH</div>
                    <div className="text-[11px] text-zinc-500">{ethPriceUSD > 0 ? `≈ $${(parseFloat(ethAmount || '0') * ethPriceUSD).toFixed(2)}` : 'Calculating...'}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                  <span className="text-[11px] text-green-400">You receive</span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-green-400">{parseFloat(bblpAmount || '0').toFixed(2)} BBLP</div>
                    <div className="text-[11px] text-green-500/80">≈ ${(parseFloat(bblpAmount || '0') * 0.14).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-[11px] text-zinc-500 text-center">1 ETH ≈ {ethPriceUSD > 0 ? (ethPriceUSD / 0.14).toFixed(0) : '---'} BBLP</div>

              <div className="flex gap-2">
                <button onClick={() => setShowETHConfirmModal(false)} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 h-10 text-xs text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
                <button onClick={confirmETHPurchase} disabled={isEthBuying} className="flex-1 rounded-lg bg-blue-600 h-10 text-xs text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {isEthBuying ? (
                    <div className="flex items-center justify-center gap-2"><div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Processing...</div>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* BNB Purchase Confirmation Modal */}
      {showBNBConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-xl"
          >
            <div className="p-4">
              {/* Header (compact) */}
              <div className="flex items-center gap-2 mb-3">
                <Image src="/bnb.svg" alt="BNB" width={20} height={20} />
                <h3 className="text-sm font-semibold text-white">Confirm Purchase</h3>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-3 py-2">
                  <span className="text-[11px] text-zinc-400">You pay</span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-white">{parseFloat(bnbAmount || '0').toFixed(6)} BNB</div>
                    <div className="text-[11px] text-zinc-500">≈ ${bnbPriceUSD > 0 ? (parseFloat(bnbAmount || '0') * bnbPriceUSD).toFixed(2) : 'Calculating...'}</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="h-8 w-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                  <span className="text-[11px] text-green-400">You receive</span>
                  <div className="text-right">
                    <div className="text-base font-semibold text-green-400">{parseFloat(bblpAmount || '0').toFixed(2)} BBLP</div>
                    <div className="text-[11px] text-green-500/80">≈ ${(parseFloat(bblpAmount || '0') * 0.14).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-[11px] text-zinc-500 text-center">1 BNB ≈ {bnbPriceUSD > 0 ? (bnbPriceUSD / 0.14).toFixed(0) : '---'} BBLP</div>

              <div className="flex gap-2">
                <button onClick={() => setShowBNBConfirmModal(false)} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 h-10 text-xs text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
                <button onClick={confirmBNBPurchase} disabled={isBuying} className="flex-1 rounded-lg bg-yellow-500 h-10 text-xs text-black hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {isBuying ? (
                    <div className="flex items-center justify-center gap-2"><div className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />Processing...</div>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      
    </>
  );
}

export default function PresalePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <PresalePageInner />
    </Suspense>
  );
} 