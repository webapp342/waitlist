'use client';

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

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useAccount, useSwitchChain, useBalance, useWalletClient } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { usePresale } from '@/hooks/usePresale';
import { TOKEN_IDS } from '@/config/presale';
import { formatUnits, parseEther, ethers } from 'ethers';
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import { Info, ChevronDown, ChevronUp, TrendingUp, Shield, Clock, DollarSign, Zap, Network, ArrowUpDown } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { userService, cardService } from '@/lib/supabase';
import { useChainId } from 'wagmi';
import { useWallet } from '@/hooks/useWallet';
import { fetchCryptoPrices, getCachedPrices } from '@/lib/priceService';

const PAYMENT_TOKENS = [
  { id: TOKEN_IDS.eth, name: 'ETH', icon: '/eth.png', color: 'from-blue-600 to-blue-400', chainId: 1 }, // Ethereum Mainnet
  { id: TOKEN_IDS.bnb, name: 'BNB', icon: '/bnb.svg', color: 'from-yellow-600 to-yellow-400', chainId: 56 },
];

// Chain IDs
const ETH_MAINNET_CHAIN_ID = 1; // Ethereum Mainnet
const BSC_MAINNET_CHAIN_ID = 56;

// ETH Presale Configuration (Ethereum Mainnet)
const ETH_PRESALE_CONFIG = {
  PRESALE_CONTRACT: "0x01A2763584a4987DfbEd95757F22dce11D4486d6",
  TOKEN_CONTRACT: "0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235",
  CHAIN_ID: 1,
  RPC_URL: "https://eth.llamarpc.com"
};

// ETH Presale Contract ABI (essential functions)
const ETH_PRESALE_ABI = [
  "function tokenPriceUSD() view returns (uint256)",
  "function calculateTokenAmount(uint256 ethAmount) view returns (uint250)",
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
  const [ethPriceUSD, setEthPriceUSD] = useState(0); // Default değeri daha güncel yap

  // Presale Progress States
  const [presaleProgress, setPresaleProgress] = useState({
    raised: 0, // Başlangıçta 0, useEffect'te hesaplanacak
    target: 2500000, // $2.5M hedef
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

  // Timer (her saniye güncellenir)
  useEffect(() => {
    const endDate = new Date('2025-07-28T23:00:00Z'); // 2 gün uzatıldı
    const updateTimer = () => {
      const now = new Date();
      const timeLeft = endDate.getTime() - now.getTime();
      const daysLeft = Math.max(Math.floor(timeLeft / (1000 * 60 * 60 * 24)), 0);
      const hoursLeft = Math.max(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0);
      const minutesLeft = Math.max(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)), 0);
      const secondsLeft = Math.max(Math.floor((timeLeft % (1000 * 60)) / 1000), 0);
      setTimer({ daysLeft, hoursLeft, minutesLeft, secondsLeft });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Progress ve raised/target (her 30 dakikada bir güncellenir)
  useEffect(() => {
    const endDate = new Date('2025-07-28T23:00:00Z'); // 2 gün uzatıldı
    const updateProgress = () => {
      const now = new Date();
      
      // Bitiş tarihine ne kadar kaldığını hesapla
      const timeRemaining = endDate.getTime() - now.getTime();
      
      // Eğer bitiş tarihini geçtiyse, bitiş değerlerini göster
      if (timeRemaining <= 0) {
        setPresaleProgress(prev => ({
          ...prev,
          raised: 2500000,
          target: 2500000,
          percentage: 100,
          contributors: 7977, // 6382 * (2500000/2000000) = 7977
          tokensSold: 25000000 // 25M tokens
        }));
        return;
      }
      
      // Presale parametreleri
      const totalPresaleDuration = 30 * 24 * 60 * 60 * 1000; // 30 günlük presale süresi (5 gün uzatıldı)
      const periodDuration = 30 * 60 * 1000; // 30 dakika
      const totalPeriods = totalPresaleDuration / periodDuration; // Toplam 30 dakikalık period sayısı (1440)
      
      // Presale başlangıcından bu yana geçen süreyi hesapla
      const startDate = new Date(endDate.getTime() - totalPresaleDuration);
      const elapsed = now.getTime() - startDate.getTime();
      
      // Kaç tane 30 dakikalık period geçtiğini hesapla
      const elapsedPeriods = Math.floor(elapsed / periodDuration);
      
      // Her period için artış miktarları
      const raisePerPeriod = 2500000 / totalPeriods; // ~$1,736.11 per 30 min
      const contributorsPerPeriod = 7977 / totalPeriods; // ~5.54 contributors per 30 min
      const tokensPerPeriod = 25000000 / totalPeriods; // ~17,361.11 tokens per 30 min
      
      // Güncel değerleri hesapla
      const currentRaised = Math.min(elapsedPeriods * raisePerPeriod, 2500000);
      const currentContributors = Math.min(Math.floor(elapsedPeriods * contributorsPerPeriod), 7977);
      const currentTokensSold = Math.min(elapsedPeriods * tokensPerPeriod, 25000000);
      const percentage = (currentRaised / 2500000) * 100;
      
      setPresaleProgress(prev => ({
        ...prev,
        raised: currentRaised,
        target: 2500000,
        percentage: percentage,
        contributors: currentContributors,
        tokensSold: currentTokensSold
      }));
    };
    updateProgress();
    const interval = setInterval(updateProgress, 30 * 60 * 1000);
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

  // Get ETH price and estimate gas when ETH is selected
  useEffect(() => {
    const getETHPriceAndGas = async () => {
      console.log('ETH Price Fetch - Starting', {
        selectedToken,
        isOnETHMainnet,
        chainId: chain?.id,
        actualChainId
      });
      
      if (selectedToken === TOKEN_IDS.eth) {
        try {
          // Get cached price immediately for faster display
          const cachedPrices = getCachedPrices();
          setEthPriceUSD(cachedPrices.eth);
          
          // Then fetch fresh prices
          const prices = await fetchCryptoPrices();
          console.log('ETH Price from shared service:', prices.eth);
          setEthPriceUSD(prices.eth);
        } catch (error) {
          console.error('Error in ETH price fetch:', error);
          setEthPriceUSD(3500);
        }
      }
    };

    getETHPriceAndGas();
  }, [selectedToken]);

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
      
      // Direct calculation using ETH price
      const ethValue = Number(ethers.formatEther(ethAmountWei));
      if (ethValue <= 0) return '0';
      
      const bblpAmount = (ethValue * ethPriceUSD) / 0.10;
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
      
      // Calculate expected tokens for display
      const expectedTokens = await presaleContract.calculateTokenAmount(ethAmountWei);
      const tokenAmountFormatted = ethers.formatEther(expectedTokens);
      
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
  const presalePrice = 0.10; // fallback
  const bnbPriceUSD = tokenPrices && tokenPrices[TOKEN_IDS.bnb] ? Number(tokenPrices[TOKEN_IDS.bnb]) / 1e8 : 0;
  const bblpPriceInBNB = bnbPriceUSD > 0 ? presalePrice / bnbPriceUSD : 0;

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
          // Direct calculation using ETH price
          const bblpValueUSD = parseFloat(bblpAmount) * 0.10;
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
          // Direct calculation using ETH price
          const bblpValueUSD = parseFloat(ethAmount) * ethPriceUSD;
          const bblpAmount = bblpValueUSD / 0.10; // $0.10 per BBLP
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
      // Önce güncel gas değerlerini almaya çalış
      if (selectedTokenDetails.name === 'ETH') {
        // ETH için güncel gas değerlerini al
        try {
          const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
          const feeData = await provider.getFeeData();
          
          // Convert BigInt to number and from wei to gwei
          const currentGasPrice = Number(feeData.gasPrice) / 1e9;
          
          // Add 30% buffer for safety (max buton için daha güvenli olalım)
          const safeGasPrice = Math.ceil(currentGasPrice * 1.3);
          
          // Update gas prices state
          setGasPrices(prev => ({
            ...prev,
            eth: { 
              ...prev.eth, 
              gasPrice: safeGasPrice 
            }
          }));
          
          // Gas limit hesapla
          if (walletClient && isOnETHMainnet) {
            await estimateGasLimit('eth');
          }
        } catch (error) {
          console.error('Error updating ETH gas values:', error);
          // Continue with existing values
        }
      } else if (selectedTokenDetails.name === 'BNB') {
        // BNB için güncel gas değerlerini al
        try {
          const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
          const feeData = await provider.getFeeData();
          
          // Convert BigInt to number and from wei to gwei
          const currentGasPrice = Number(feeData.gasPrice) / 1e9;
          
          // Add 30% buffer for safety
          const safeGasPrice = Math.ceil(currentGasPrice * 1.3);
          
          // Update gas prices state
          setGasPrices(prev => ({
            ...prev,
            bnb: { 
              ...prev.bnb, 
              gasPrice: safeGasPrice 
            }
          }));
        } catch (error) {
          console.error('Error updating BNB gas values:', error);
          // Continue with existing values
        }
      }

      // Şimdi max değerleri hesapla
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
        
        // Gas fee için rezerv hesaplama - dinamik gas fiyatlarını kullan
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
        
        // Gas fee için rezerv hesaplama - dinamik gas fiyatlarını kullan
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
                Secure Your BBLP Tokens 
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
            Purchase BBLP tokens from BSC Mainnet and Ethereum Mainnet


            </p>
              
             
              
             
              
           
            </div>
          </div>

          {/* Minimal Professional Presale Progress */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-6 mb-6">
            {/* Timer - Modern Boxed */}
            <div className="flex flex-col items-center justify-center mb-6">
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
            {/* Raised/Target */}
            <div className="flex flex-col items-center justify-center mb-6">
              <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wide text-center px-2">
                <span className="block sm:inline text-gray-400">USD RAISED</span>
                <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                  ${animatedRaised.toLocaleString(undefined, {maximumFractionDigits:2})} / ${presaleProgress.target.toLocaleString(undefined, {maximumFractionDigits:2})}
                </span>
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-none"
                  style={{width: `${animatedPercentage}%`}}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {Math.floor(animatedTokensSold).toLocaleString()} BBLP Sold
                </span>
                <span className="text-xs text-gray-500">{presaleProgress.contributors.toLocaleString()} Contributors</span>
              </div>
            </div>
            {/* Price Phases - Minimal Design */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Phase 1</div>
                <div className="text-sm font-medium text-gray-400 line-through">$0.07</div>
                <div className="text-xs text-green-400 mt-1">Sold Out</div>
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 text-center">
                <div className="text-xs text-yellow-400 mb-1">Phase 2</div>
                <div className="text-sm font-bold text-white">$0.10</div>
                <div className="text-xs text-yellow-400 mt-1">Active</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-3 text-center opacity-60">
                <div className="text-xs text-gray-500 mb-1">Phase 3</div>
                <div className="text-sm font-medium text-gray-400">$0.14</div>
                <div className="text-xs text-gray-500 mt-1">Upcoming</div>
              </div>
            </div>
          </div>


      

          {/* Main Presale Card - Minimal Professional Design */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 overflow-hidden mb-8">
            {/* Compact Header */}
            <div className="px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Purchase BBLP</h2>
                <span className="text-xs text-gray-400">1 BBLP = $0.10</span>
              </div>
            </div>
            
            {/* Body Section */}
            <div className="p-6">
                {/* Payment Method Selection - Minimal */}
            <div className="mb-5">
              <label className="text-xs text-gray-400 block mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_TOKENS.map((token) => {
                  const isSelected = selectedToken === token.id;
                  
                  return (
                    <button
                      key={token.id}
                      onClick={() => setSelectedToken(token.id)}
                      className={cn(
                        "p-3 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2",
                        isSelected
                          ? "border-yellow-400/30 bg-yellow-400/10 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-gray-400 hover:border-zinc-700"
                      )}
                    >
                      <Image 
                        src={token.icon} 
                        alt={token.name} 
                        width={20} 
                        height={20} 
                        className={token.name === 'ETH' ? "rounded-full" : ""}
                      />
                      <span className="text-sm font-medium">{token.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Amount</label>
                <div className="flex items-center gap-2 text-xs">
                  {isConnected && (
                    <span className="text-gray-500">
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
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Input */}
                <div className="relative">
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
                    className="h-10 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 pr-12 rounded-lg"
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-gray-400">
                      {selectedToken === TOKEN_IDS.eth ? 'ETH' : 'BNB'}
                    </span>
                  </div>
                </div>

                {/* Output */}
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={bblpAmount}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setInputMode('BBLP');
                        setBblpAmount(value);
                      }
                    }}
                    className="h-10 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 pr-12 rounded-lg"
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-gray-400">BBLP</span>
                  </div>
                </div>
              </div>
            </div>



              {/* Minimal Network Status */}
            {isConnected && !isOnCorrectNetwork && (
              <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center justify-center gap-2">
                  <Network className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-orange-400">
                    Switch to {selectedToken === TOKEN_IDS.eth ? 'Ethereum' : 'BSC'} network to continue
                  </span>
                </div>
              </div>
            )}

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
                Switch Network
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

                            {/* Minimal Price Info */}
              {selectedTokenDetails && (
                <div className="mt-2 flex items-center justify-center text-xs text-gray-400">
                  {selectedTokenDetails.name === 'ETH' ? (
                    ethPriceUSD > 0 ? (
                      <span>1 ETH = ${ethPriceUSD.toFixed(0)} = {(ethPriceUSD / 0.10).toFixed(0)} BBLP</span>
                    ) : (
                      <span>Loading price...</span>
                    )
                  ) : bnbPriceUSD > 0 ? (
                    <span>1 BNB = ${bnbPriceUSD.toFixed(0)} = {(1 / bblpPriceInBNB).toFixed(0)} BBLP</span>
                  ) : (
                    <span>Loading price...</span>
                  )}
                </div>
              )}
            </div>
            </div>

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
        
      </main>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl'>
        {/* FAQ Section - Professional */}
        <div className="mb-20">
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
                      <p className="text-xs text-gray-400">$0.10 per BBLP token (Presale Round 2)</p>
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
      
      {/* Wallet Connection Modal */}
      <WalletModal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />

      {/* ETH Purchase Confirmation Modal */}
      {showETHConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 max-w-md w-full shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <Image src="/eth.png" alt="ETH" width={32} height={32} className="rounded-full" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">Confirm Purchase</h3>
              <p className="text-sm text-zinc-400">Review transaction details before proceeding</p>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4 mb-6">
              {/* From Section */}
              <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">You Pay</span>
                  <div className="flex items-center gap-1.5">
                    <Image src="/eth.png" alt="ETH" width={14} height={14} className="rounded-full" />
                    <span className="text-xs font-medium text-zinc-400">ETH</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{parseFloat(ethAmount || '0').toFixed(6)}</span>
                  <span className="text-sm text-zinc-500">ETH</span>
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  {ethPriceUSD > 0 ? 
                    `≈ $${(parseFloat(ethAmount || '0') * ethPriceUSD).toFixed(2)}` : 
                    'Calculating...'
                  }
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* To Section */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-400 uppercase tracking-wider">You Receive</span>
                  <div className="flex items-center gap-1.5">
                    <Image src="/logo.svg" alt="BBLP" width={14} height={14} />
                    <span className="text-xs font-medium text-green-400">BBLP</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-400">{parseFloat(bblpAmount || '0').toFixed(2)}</span>
                  <span className="text-sm text-green-500">BBLP</span>
                </div>
                <div className="text-sm text-green-500/80 mt-1">
                  ≈ ${(parseFloat(bblpAmount || '0') * 0.10).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-800/30 rounded-lg p-3 mb-6 border border-zinc-700/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Exchange Rate</span>
                <span className="text-white font-medium">
                  1 ETH = {ethPriceUSD > 0 ? (ethPriceUSD / 0.10).toFixed(0) : '---'} BBLP
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowETHConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmETHPurchase}
                disabled={isEthBuying}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEthBuying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* BNB Purchase Confirmation Modal */}
      {showBNBConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 max-w-md w-full shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                <Image src="/bnb.svg" alt="BNB" width={32} height={32} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">Confirm Purchase</h3>
              <p className="text-sm text-zinc-400">Review transaction details before proceeding</p>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4 mb-6">
              {/* From Section */}
              <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">You Pay</span>
                  <div className="flex items-center gap-1.5">
                    <Image src="/bnb.svg" alt="BNB" width={14} height={14} />
                    <span className="text-xs font-medium text-zinc-400">BNB</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{parseFloat(bnbAmount || '0').toFixed(6)}</span>
                  <span className="text-sm text-zinc-500">BNB</span>
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  ≈ ${bnbPriceUSD > 0 ? (parseFloat(bnbAmount || '0') * bnbPriceUSD).toFixed(2) : 'Calculating...'}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* To Section */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-400 uppercase tracking-wider">You Receive</span>
                  <div className="flex items-center gap-1.5">
                    <Image src="/logo.svg" alt="BBLP" width={14} height={14} />
                    <span className="text-xs font-medium text-green-400">BBLP</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-400">{parseFloat(bblpAmount || '0').toFixed(2)}</span>
                  <span className="text-sm text-green-500">BBLP</span>
                </div>
                <div className="text-sm text-green-500/80 mt-1">
                  ≈ ${(parseFloat(bblpAmount || '0') * 0.10).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-800/30 rounded-lg p-3 mb-6 border border-zinc-700/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Exchange Rate</span>
                <span className="text-white font-medium">
                  1 BNB = {bnbPriceUSD > 0 ? (bnbPriceUSD / 0.10).toFixed(0) : '---'} BBLP
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowBNBConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmBNBPurchase}
                disabled={isBuying}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBuying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Estimated Gas Fee Section - User Friendly */}
      <div className="mb-5 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-sm font-medium text-white">Estimated Network Fee</h3>
        </div>
        
        <div className="space-y-2">
          {selectedToken === TOKEN_IDS.eth ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Gas Price</span>
                <span className="text-xs text-gray-300">{gasPrices.eth.gasPrice} Gwei</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Gas Limit</span>
                <span className="text-xs text-gray-300">{gasPrices.eth.gasLimit.toLocaleString()}</span>
              </div>
              <div className="border-t border-zinc-700/50 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Network Fee</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {((gasPrices.eth.gasLimit * gasPrices.eth.gasPrice) / 1000000000).toFixed(6)} ETH
                    </div>
                    <div className="text-xs text-gray-400">
                      ≈ ${(((gasPrices.eth.gasLimit * gasPrices.eth.gasPrice) / 1000000000) * ethPriceUSD).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Gas Price</span>
                <span className="text-xs text-gray-300">{gasPrices.bnb.gasPrice} Gwei</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Gas Limit</span>
                <span className="text-xs text-gray-300">{gasPrices.bnb.gasLimit.toLocaleString()}</span>
              </div>
              <div className="border-t border-zinc-700/50 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Network Fee</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {((gasPrices.bnb.gasLimit * gasPrices.bnb.gasPrice) / 1000000000).toFixed(6)} BNB
                    </div>
                    <div className="text-xs text-gray-400">
                      ≈ ${(((gasPrices.bnb.gasLimit * gasPrices.bnb.gasPrice) / 1000000000) * bnbPriceUSD).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Gas Fee Info */}
          <div className="mt-3 p-2 bg-blue-500/5 rounded border border-blue-500/10">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                Network fees are required to process your transaction on the blockchain. 
                The "Max" button automatically deducts this fee from your balance.
              </p>
            </div>
          </div>
        </div>
      </div>
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