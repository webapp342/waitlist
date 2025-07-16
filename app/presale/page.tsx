'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
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

function PresalePageInner() {
  const { isConnected, address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
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
  const [ethPriceUSD, setEthPriceUSD] = useState(3000); // Default fallback
  const [estimatedGasCost, setEstimatedGasCost] = useState<string>('0');

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

  // Get ETH price and estimate gas when ETH is selected
  useEffect(() => {
    const getETHPriceAndGas = async () => {
      if (selectedToken === TOKEN_IDS.eth && window.ethereum && isOnETHMainnet) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const presaleContract = new ethers.Contract(
            ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
            ETH_PRESALE_ABI,
            provider
          );
          
          // Get ETH price
          const ethPriceFromContract = await presaleContract.getLatestETHPrice(); // 8 decimals
          const ethPriceFormatted = Number(ethPriceFromContract) / 1e8; // Convert to USD
          setEthPriceUSD(ethPriceFormatted);
          
          // Estimate gas cost
          const gasCost = await estimateGasCost();
          setEstimatedGasCost(gasCost);
        } catch (error) {
          console.error('Error getting ETH price or gas:', error);
          setEthPriceUSD(3000); // Fallback
          setEstimatedGasCost('0'); // No fallback
        }
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      getETHPriceAndGas();
    }
  }, [selectedToken, isOnETHMainnet]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!window.ethereum || !isOnETHMainnet) return '0';
      const provider = new ethers.BrowserProvider(window.ethereum);
      const presaleContract = new ethers.Contract(
        ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
        ETH_PRESALE_ABI,
        provider
      );
      const tokenAmount = await presaleContract.calculateTokenAmount(ethAmountWei);
      return ethers.formatEther(tokenAmount);
    } catch (err) {
      console.error('Error calculating ETH token amount:', err);
      return '0';
    }
  }, [isOnETHMainnet]);

  const buyTokensWithETH = async () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0 || !isOnETHMainnet) return;
    
    // Show confirmation modal first
    setShowETHConfirmModal(true);
  };

  const confirmETHPurchase = async () => {
    setShowETHConfirmModal(false);
    
    try {
      setIsEthBuying(true);
      setStatusMessage('Initializing ETH purchase...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const presaleContract = new ethers.Contract(
        ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
        ETH_PRESALE_ABI,
        signer
      );
      
      const ethAmountWei = ethers.parseEther(ethAmount);
      
      // Calculate expected tokens for display
      const expectedTokens = await presaleContract.calculateTokenAmount(ethAmountWei);
      const tokenAmountFormatted = ethers.formatEther(expectedTokens);
      
      setStatusMessage(`Confirm transaction: ${parseFloat(ethAmount).toFixed(4)} ETH → ${parseFloat(tokenAmountFormatted).toFixed(2)} BBLP`);
      
      // Estimate gas for the actual transaction
      const gasEstimate = await presaleContract.buyTokens.estimateGas({
        value: ethAmountWei
      });
      
      // Add 20% buffer to gas estimate
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      
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
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction was cancelled by user');
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
        const ethAmountWei = ethers.parseEther(ethAmount);
        const tokenAmount = await calculateETHTokenAmount(ethAmountWei.toString());
        setBblpAmount(parseFloat(tokenAmount).toFixed(4));
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateETHCalculation();
    }
  }, [ethAmount, selectedToken, isOnETHMainnet, inputMode, calculateETHTokenAmount]);

  // ETH: Update ETH when BBLP changes  
  useEffect(() => {
    const updateBBLPtoETHCalculation = async () => {
      if (selectedToken === TOKEN_IDS.eth && bblpAmount && parseFloat(bblpAmount) > 0 && inputMode === 'BBLP') {
        try {
          // Use contract's calculateETHAmount function
          if (window.ethereum && isOnETHMainnet) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const presaleContract = new ethers.Contract(
              ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
              ETH_PRESALE_ABI,
              provider
            );
            
            // Use contract's calculateETHAmount function for accurate calculation
            const tokenAmountWei = ethers.parseEther(bblpAmount);
            const ethAmountWei = await presaleContract.calculateETHAmount(tokenAmountWei);
            const ethAmount = ethers.formatEther(ethAmountWei);
            
            setEthAmount(ethAmount);
          }
        } catch (error) {
          console.error('Error calculating ETH from BBLP using contract:', error);
          
          // Fallback calculation with current ETH price
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const presaleContract = new ethers.Contract(
              ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
              ETH_PRESALE_ABI,
              provider
            );
            
            const ethPriceUSD = await presaleContract.getLatestETHPrice(); // 8 decimals
            const ethPriceFormatted = Number(ethPriceUSD) / 1e8; // Convert to USD
            
            // Calculate ETH amount: BBLP * $0.10 / ETH_price_USD
            const bblpValueUSD = parseFloat(bblpAmount) * 0.10;
            const ethAmount = bblpValueUSD / ethPriceFormatted;
            
            setEthAmount(ethAmount.toFixed(6));
          } catch (fallbackError) {
            console.error('Fallback calculation also failed:', fallbackError);
            // Use stored ETH price as last resort
            const bblpValueUSD = parseFloat(bblpAmount) * 0.10;
            const ethAmount = bblpValueUSD / ethPriceUSD; 
            setEthAmount(ethAmount.toFixed(6));
          }
        }
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateBBLPtoETHCalculation();
    }
  }, [bblpAmount, selectedToken, isOnETHMainnet, inputMode, ethPriceUSD]);

  // ETH: Update BBLP when ETH changes
  useEffect(() => {
    const updateETHtoBBLPCalculation = async () => {
      if (selectedToken === TOKEN_IDS.eth && ethAmount && parseFloat(ethAmount) > 0 && inputMode === 'ETH') {
        try {
          if (window.ethereum && isOnETHMainnet) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const presaleContract = new ethers.Contract(
              ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
              ETH_PRESALE_ABI,
              provider
            );
            
            // Use contract's calculateTokenAmount function
            const ethAmountWei = ethers.parseEther(ethAmount);
            const tokenAmount = await presaleContract.calculateTokenAmount(ethAmountWei);
            const tokenAmountFormatted = ethers.formatEther(tokenAmount);
            
            setBblpAmount(tokenAmountFormatted);
          }
        } catch (error) {
          console.error('Error calculating BBLP from ETH:', error);
          // Fallback calculation
          const ethPriceUSD = 3000; // Fallback ETH price
          const bblpValueUSD = parseFloat(ethAmount) * ethPriceUSD;
          const bblpAmount = bblpValueUSD / 0.10; // $0.10 per BBLP
          setBblpAmount(bblpAmount.toFixed(4));
        }
      }
    };

    if (selectedToken === TOKEN_IDS.eth) {
      updateETHtoBBLPCalculation();
    }
  }, [ethAmount, selectedToken, isOnETHMainnet, inputMode]);

  // Estimate gas cost for ETH transaction
  const estimateGasCost = async () => {
    if (!window.ethereum || !isOnETHMainnet) return '0';
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const presaleContract = new ethers.Contract(
        ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
        ETH_PRESALE_ABI,
        provider
      );
      
      // Get current gas price from blockchain first
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;
      
      if (!gasPrice) {
        throw new Error('Could not get gas price from blockchain');
      }
      
      // Estimate gas for a typical purchase (0.001 ETH as example)
      const sampleAmount = ethers.parseEther("0.001");
      const gasEstimate = await presaleContract.buyTokens.estimateGas({
        value: sampleAmount
      });
      
      // Calculate estimated gas cost using real blockchain data
      const estimatedGasCost = gasEstimate * gasPrice;
      const estimatedGasCostETH = ethers.formatEther(estimatedGasCost);
      
      // Add 30% buffer for gas price fluctuations and network congestion
      const gasBuffer = parseFloat(estimatedGasCostETH) * 1.3;
      
      // Log the calculation for debugging
      console.log('Real Blockchain Gas Estimation:', {
        gasEstimate: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
        estimatedCost: estimatedGasCostETH + ' ETH',
        buffer: gasBuffer + ' ETH',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'N/A',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei' : 'N/A',
        lastBlockNumber: await provider.getBlockNumber(),
        contractAddress: ETH_PRESALE_CONFIG.PRESALE_CONTRACT
      });
      
      return gasBuffer.toFixed(8);
    } catch (error) {
      console.error('Error estimating gas from blockchain:', error);
      
      // Try alternative method if contract estimation fails
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;
        
        if (gasPrice) {
          // Use a conservative gas estimate (150,000 gas units for complex contract interaction)
          const conservativeGasEstimate = BigInt(150000);
          const estimatedGasCost = conservativeGasEstimate * gasPrice;
          const estimatedGasCostETH = ethers.formatEther(estimatedGasCost);
          const gasBuffer = parseFloat(estimatedGasCostETH) * 1.5;
          
          console.log('Fallback Gas Estimation:', {
            gasEstimate: conservativeGasEstimate.toString(),
            gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
            estimatedCost: estimatedGasCostETH + ' ETH',
            buffer: gasBuffer + ' ETH',
            contractAddress: ETH_PRESALE_CONFIG.PRESALE_CONTRACT
          });
          
          return gasBuffer.toFixed(8);
        }
      } catch (fallbackError) {
        console.error('Fallback gas estimation also failed:', fallbackError);
      }
      
      return '0'; // No fallback - let user know estimation failed
    }
  };

  // Max button for selected token
  const handleMaxToken = async () => {
    if (!selectedTokenDetails) return;

    try {
      if (selectedTokenDetails.name === 'ETH' && window.ethereum && isOnETHMainnet) {
        // Get ETH balance for Ethereum Mainnet
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const ethBalance = ethers.formatEther(balance);
        
        console.log('Current ETH Balance:', ethBalance);
        
        // Get estimated gas cost from blockchain
        const gasCost = await estimateGasCost();
        setEstimatedGasCost(gasCost);
        
        if (gasCost === '0') {
          // Gas estimation failed, show error
          setError('Could not estimate gas cost from blockchain. Please try again or enter amount manually.');
          return;
        }
        
        // Reserve exact estimated gas cost from blockchain
        const gasReserve = parseFloat(gasCost);
        const maxEthAmount = Math.max(0, parseFloat(ethBalance) - gasReserve);
        
        console.log('Gas Reserve:', gasReserve, 'ETH');
        console.log('Max ETH Amount:', maxEthAmount, 'ETH');
        
        setInputMode('ETH');
        setEthAmount(maxEthAmount.toFixed(6));
        
        // Calculate BBLP amount using contract
        const presaleContract = new ethers.Contract(
          ETH_PRESALE_CONFIG.PRESALE_CONTRACT,
          ETH_PRESALE_ABI,
          provider
        );
        
        const ethAmountWei = ethers.parseEther(maxEthAmount.toString());
        const tokenAmount = await presaleContract.calculateTokenAmount(ethAmountWei);
        const tokenAmountFormatted = ethers.formatEther(tokenAmount);
        
        setBblpAmount(tokenAmountFormatted);
        
        console.log('Calculated BBLP Amount:', tokenAmountFormatted);
        
      } else if (selectedTokenDetails.name === 'BNB' && userData?.bnbBalance && window.ethereum && isOnBSCMainnet) {
        // Get BNB balance for BSC Mainnet
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const bnbBalance = parseFloat(ethers.formatEther(balance));

        // 0.001 BNB'yi gas için ayır, kalanını inputa yaz
        const gasReserve = 0.001;
        const maxBnbAmount = Math.max(0, bnbBalance - gasReserve);
        setInputMode('BNB');
        setBnbAmount(maxBnbAmount.toFixed(6));
      }
    } catch (error) {
      console.error('Error getting max balance:', error);
      setError('Failed to get wallet balance from blockchain');
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
    if (!bnbAmount || parseFloat(bnbAmount) <= 0 || !isOnBSCMainnet) return;
    
    // Show confirmation modal first
    setShowBNBConfirmModal(true);
  };

  const confirmBNBPurchase = async () => {
    setShowBNBConfirmModal(false);
    
    try {
      setIsBuying(true);
      // Convert BNB amount to wei format
      const bnbAmountWei = parseEther(bnbAmount);
      await buyTokens(TOKEN_IDS.bnb, bnbAmountWei.toString());
      setStatusMessage('Purchase successful!');
      setBnbAmount('');
      setBblpAmount('');
    } catch (err: any) {
      console.error('Purchase failed:', err);
      if (err.message.includes('User rejected')) {
        setError('Transaction was cancelled by user');
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
    if (selectedToken === TOKEN_IDS.bnb && userData?.bnbBalance) {
      return parseFloat(userData.bnbBalance);
    }
    if (selectedToken === TOKEN_IDS.eth && typeof window !== 'undefined' && window.ethereum && isOnETHMainnet) {
      // ETH balance is not in userData, so we need to get it from provider
      // But for button logic, we can use ethAmount and a state variable
      return ethWalletBalance;
    }
    return 0;
  };

  // Track ETH wallet balance for ETH mode
  const [ethWalletBalance, setEthWalletBalance] = useState(0);
  useEffect(() => {
    const fetchEthBalance = async () => {
      if (selectedToken === TOKEN_IDS.eth && window.ethereum && isOnETHMainnet && address) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(address);
        setEthWalletBalance(parseFloat(ethers.formatEther(bal)));
      }
    };
    fetchEthBalance();
  }, [selectedToken, isOnETHMainnet, address]);

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
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
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
      <style jsx>{`
        .animation-delay-0 {
          animation-delay: 0ms;
        }
        .animation-delay-75 {
          animation-delay: 75ms;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
      <Header />
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-32 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              Buy BBLP
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Buy BBLP tokens at the best price using BNB or ETH.
            </p>
          </div>

          {/* Modern Professional Stepper */}
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl rounded-3xl border border-zinc-800/50 p-8 mb-6 shadow-2xl transition-all duration-300 hover:shadow-yellow-500/5">
            
            {/* Elegant Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400/15 to-orange-500/10 border border-yellow-400/20 shadow-lg shadow-yellow-500/10">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Token Sale Phases</h2>
                <p className="text-sm text-zinc-400">Progressive pricing structure with limited-time offers</p>
              </div>
            </div>

            {/* Ultra Modern Stepper */}
            <div className="relative">
              {/* Background Progress Line (Full Width) */}
              <div className="absolute top-5 md:top-6 left-6 md:left-8 right-6 md:right-8 h-0.5 md:h-1 bg-zinc-700/30 rounded-full"></div>
              
              {/* Active Progress Line (Only Completed Portions) */}
              <div className="absolute top-5 md:top-6 left-6 md:left-8 h-0.5 md:h-1 bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full shadow-sm" style={{width: 'calc(73.67% - 12px)'}}>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-yellow-400/20 rounded-full blur-sm"></div>
              </div>
              
              <div className="relative flex justify-between items-center">
                
                                  {/* Phase 1 - Seed Sale (Completed) */}
                  <div className="flex flex-col items-center group">
                    <div className="relative mb-4 md:mb-6 transform transition-transform duration-300 group-hover:scale-105">
                      {/* Outer Glow Ring */}
                      <div className="absolute -inset-1 md:-inset-2 rounded-full bg-gradient-to-r from-emerald-400/30 to-green-500/30 blur-lg animate-pulse"></div>
                      <div className="absolute -inset-0.5 md:-inset-1 rounded-full bg-gradient-to-r from-emerald-400/20 to-green-500/20 animate-pulse"></div>
                      
                      {/* Main Circle with Enhanced Design */}
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 border-2 border-emerald-300/60 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
                                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                        <svg className="w-4 h-4 md:w-6 md:h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 border-2 border-zinc-900 flex items-center justify-center shadow-lg">
                        <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    <div className="text-center max-w-[80px] md:max-w-[120px]">
                      <h3 className="text-sm md:text-base font-bold text-emerald-400 mb-1">Seed Sale</h3>
                      <p className="text-lg md:text-xl font-black text-emerald-400 mb-2">$0.07</p>
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <p className="text-xs text-emerald-300 font-medium">Completed</p>
                      </div>
                    </div>
                  </div>

                                  {/* Phase 2 - Presale (Active) */}
                  <div className="flex flex-col items-center group">
                    <div className="relative mb-4 md:mb-6 transform transition-transform duration-300 group-hover:scale-110">
                      {/* Multi-Layer Glow Effects */}
                      <div className="absolute -inset-2 md:-inset-4 rounded-full bg-gradient-to-r from-yellow-400/40 via-orange-500/40 to-yellow-400/40 blur-xl animate-pulse"></div>
                      <div className="absolute -inset-1.5 md:-inset-3 rounded-full bg-gradient-to-r from-yellow-400/30 via-orange-500/30 to-yellow-400/30 animate-pulse"></div>
                      <div className="absolute -inset-1 md:-inset-2 rounded-full bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-yellow-400/20 animate-spin-slow blur-lg"></div>
                      
                      {/* Premium Main Circle */}
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 border-2 border-yellow-300/70 shadow-2xl shadow-yellow-500/40 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-white animate-pulse shadow-xl relative z-10"></div>
                      </div>
                      
                      {/* Premium Active Badge */}
                      <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-zinc-900 flex items-center justify-center animate-bounce shadow-xl">
                        <Zap className="w-2 h-2 md:w-3 md:h-3 text-black" />
                      </div>
                    </div>
                    
                    <div className="text-center max-w-[80px] md:max-w-[120px]">
                      <h3 className="text-sm md:text-base font-bold text-yellow-300 mb-1">Presale</h3>
                      <p className="text-lg md:text-xl font-black text-yellow-400 mb-2">$0.10</p>
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                        <p className="text-xs text-yellow-400 font-medium animate-pulse">Live Now</p>
                      </div>
                    </div>
                  </div>

                                  {/* Phase 3 - Public Sale (Coming Soon) */}
                  <div className="flex flex-col items-center group">
                    <div className="relative mb-4 md:mb-6 transform transition-transform duration-300 group-hover:scale-105">
                      {/* Subtle Future Glow */}
                      <div className="absolute -inset-1 md:-inset-2 rounded-full bg-zinc-600/15 blur-lg"></div>
                      
                      {/* Sophisticated Future Circle */}
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 border-2 border-zinc-600/60 shadow-xl flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent"></div>
                        <span className="text-zinc-300 font-black text-base md:text-lg relative z-10">3</span>
                      </div>
                      
                      {/* Future Badge */}
                      <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 border-2 border-zinc-900 flex items-center justify-center shadow-lg">
                        <Clock className="w-2 h-2 md:w-3 md:h-3 text-zinc-300" />
                      </div>
                    </div>
                    
                    <div className="text-center max-w-[80px] md:max-w-[120px]">
                      <h3 className="text-sm md:text-base font-bold text-zinc-300 mb-1">Public Sale</h3>
                      <p className="text-lg md:text-xl font-black text-zinc-300 mb-2">$0.14</p>
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-zinc-500"></div>
                        <p className="text-xs text-zinc-400 font-medium">Upcoming</p>
                      </div>
                    </div>
                  </div>

              </div>
            </div>

          </div>

          {/* Main Presale Card - Keeping Original Working Version */}

          {/* Main Presale Card */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-4 py-6 md:p-8 mb-6 shadow-xl transition-all duration-300">
            
        

         

            {/* Payment Method Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Select Payment Method</label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_TOKENS.map((token) => {
                  const isTokenOnCurrentNetwork = token.chainId === Number(chainId);
                  const isSelected = selectedToken === token.id;
                  
                  return (
                    <button
                      key={token.id}
                      onClick={() => setSelectedToken(token.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 relative",
                        isSelected
                          ? "border-yellow-400/50 bg-yellow-400/10 shadow-xl shadow-yellow-400/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80"
                      )}
                    >
                      <Image 
                        src={token.icon} 
                        alt={token.name} 
                        width={24} 
                        height={24} 
                        className={token.name === 'ETH' ? "rounded-full" : ""}
                      />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-white" : "text-gray-400"
                          )}>
                            {token.name}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {token.name === 'ETH' ? 'Ethereum Mainnet' : 'BSC Mainnet'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Amount Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">You Pay</label>
                                  <div className="flex items-center gap-2">
                    {selectedToken === TOKEN_IDS.eth && estimatedGasCost !== '0' && (
                      <span className="text-xs text-gray-500">
                        Gas: ~{parseFloat(estimatedGasCost) < 0.001 ? (parseFloat(estimatedGasCost) * 1000).toFixed(2) + ' mETH' : estimatedGasCost + ' ETH'}
                      </span>
                    )}
                    {selectedToken === TOKEN_IDS.eth && estimatedGasCost === '0' && (
                      <span className="text-xs text-red-400">
                        Gas estimation failed
                      </span>
                    )}
                    <button
                      onClick={handleMaxToken}
                      className="text-xs text-yellow-200 hover:text-yellow-300 transition-colors"
                      type="button"
                      title={selectedToken === TOKEN_IDS.eth ? `Reserves ~${estimatedGasCost} ETH for gas fees` : 'Use maximum available balance'}
                      disabled={selectedToken === TOKEN_IDS.eth && estimatedGasCost === '0'}
                    >
                      Use Max
                    </button>
                  </div>
              </div>
              
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
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
                  className="h-12 md:h-14 text-lg font-semibold bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 pr-20 rounded-xl"
                  disabled={loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Image 
                    src={selectedToken === TOKEN_IDS.eth ? "/eth.png" : "/bnb.svg"} 
                    alt={selectedToken === TOKEN_IDS.eth ? "ETH" : "BNB"} 
                    width={20} 
                    height={20} 
                  />
                  <span className="text-sm text-gray-400">
                    {selectedToken === TOKEN_IDS.eth ? 'ETH' : 'BNB'}
                  </span>
                </div>
              </div>
            </div>

          

            {/* BBLP Receive Amount */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">You Receive</label>
              </div>
              
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={bblpAmount}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputMode('BBLP');
                      setBblpAmount(value);
                    }
                  }}
                  className="h-12 md:h-14 text-lg font-semibold bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 pr-20 rounded-xl"
                  disabled={loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Image src="/logo.svg" alt="BBLP" width={20} height={20} />
                  <span className="text-sm text-gray-400">BBLP</span>
                </div>
              </div>
            </div>

              {/* Payment Summary */}
              {((selectedToken === TOKEN_IDS.eth && ethAmount && parseFloat(ethAmount) > 0) || 
                (selectedToken === TOKEN_IDS.bnb && bnbAmount && parseFloat(bnbAmount) > 0)) && 
                bblpAmount && parseFloat(bblpAmount) > 0 && (
                <div className="mb-4 p-3 rounded-xl border border-zinc-800/50 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image 
                        src={selectedToken === TOKEN_IDS.eth ? "/eth.png" : "/bnb.svg"} 
                        alt={selectedToken === TOKEN_IDS.eth ? "ETH" : "BNB"} 
                        width={20} 
                        height={20} 
                      />
                      <span className="text-sm text-gray-400">You Pay</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {selectedToken === TOKEN_IDS.eth 
                          ? `${parseFloat(ethAmount || '0').toFixed(6)} ETH`
                          : `${parseFloat(bnbAmount || '0').toFixed(6)} BNB`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedToken === TOKEN_IDS.eth 
                          ? `$${(parseFloat(ethAmount || '0') * ethPriceUSD).toFixed(2)} USD`
                          : `$${bnbPriceUSD > 0 ? (parseFloat(bnbAmount || '0') * bnbPriceUSD).toFixed(2) : 'Calculating...'} USD`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center my-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                      <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/logo.svg" alt="BBLP" width={20} height={20} />
                      <span className="text-sm text-gray-400">You Receive</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{parseFloat(bblpAmount).toFixed(4)} BBLP</div>
                      <div className="text-xs text-gray-500">
                        ${(parseFloat(bblpAmount) * 0.10).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ağ Bilgisi Gösterimi */}
            {isConnected && (
              <div className="mb-2 text-xs text-gray-400 text-center">
                Currently on: {actualChainId === ETH_MAINNET_CHAIN_ID ? 'Ethereum Mainnet' : (chain?.name || 'Unknown Network')}
              </div>
            )}

            {/* Buy/Switch/Connect Butonları */}
            {!isConnected ? (
              <Button
                className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black font-semibold shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40 transition-all duration-300 transform hover:scale-[1.02]"
                size="lg"
                onClick={() => setShowWalletModal(true)}
              >
                <div className="flex items-center justify-center w-full gap-2">
                  <span className="text-sm">Connect Wallet</span>
                </div>
              </Button>
            ) : requiresNetworkSwitch ? (
              <Button
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg transition-all duration-200"
                size="lg"
                onClick={() => {
                  if (selectedTokenDetails) {
                    switchChain({ chainId: selectedTokenDetails.chainId as any });
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Switch to {selectedTokenDetails?.chainId === ETH_MAINNET_CHAIN_ID ? 'Ethereum' : 'BSC'}
                </div>
              </Button>
            ) : (
              <Button
                className={cn(
                  "w-full h-12 font-semibold shadow-lg transition-all duration-200",
                  (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0)) || 
                  (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0))
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed hover:bg-zinc-800"
                    : "bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white"
                )}
                size="lg"
                disabled={
                  isInsufficientBalance() ||
                  (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0 || isEthBuying)) ||
                  (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0 || isBuying))
                }
                onClick={selectedToken === TOKEN_IDS.eth ? buyTokensWithETH : handleBuy}
              >
                {(selectedToken === TOKEN_IDS.eth ? isEthBuying : isBuying) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Buying with {selectedTokenDetails?.name}...
                  </div>
                ) : isInsufficientBalance() ? (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Insufficient balance
                  </div>
                ) : (selectedToken === TOKEN_IDS.eth && (!ethAmount || parseFloat(ethAmount) <= 0)) || 
                   (selectedToken === TOKEN_IDS.bnb && (!bnbAmount || parseFloat(bnbAmount) <= 0)) ? (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Enter Amount
                  </div>
                ) : requiresNetworkSwitch ? (
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Switch to {selectedTokenDetails?.chainId === ETH_MAINNET_CHAIN_ID ? 'Ethereum' : 'BSC'}
                  </div>
                ) : (
                  `Buy with ${selectedTokenDetails?.name}`
                )}
              </Button>
            )}

              {/* Exchange Rate Info */}
              {selectedTokenDetails && selectedTokenDetails.name === 'BNB' && bnbPriceUSD > 0 && (
                <div className="   ">
                  <div className="flex items-center justify-center text-center mt-1 text-xs">
                    <div className="flex text-center gap-2">
                      <span className="text-gray-400 font-medium">
                        1 {selectedTokenDetails.name} = {(1 / bblpPriceInBNB).toFixed(2)} BBLP (${bnbPriceUSD.toFixed(2)} USD)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {(error || statusMessage) && (
              <div className={cn(
                " mt-4 p-2   text-center font-medium  flex items-center justify-center gap-2",
                error 
                  ? ' text-red-300 ' 
                  : ' text-green-300 '
              )}>
                {error ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                )}
                {error || statusMessage}
              </div>
            )}
          </div>



          <div className="flex text-center justify-center items-center gap-2 mt-2 mb-8">
  <span className="text-xs text-gray-400">Secured by</span>
  <Image src="/idhiQehyPF_logos.svg" alt="Fireblocks Logo" width={120} height={14} className="h-4 w-auto" />
</div>


         

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
        
      </main>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl'>
    {/* Presale Details Accordion - Professional */}
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-xl border border-zinc-800 overflow-hidden mb-20">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <Info className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Presale Details</h3>
                  <p className="text-xs text-gray-500">Terms and information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {showDetails ? 'Hide' : 'Show'}
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
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
                      <p className="text-xs text-gray-400">Presale is available on BSC Mainnet only</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
    

</div>
      
      {/* Wallet Connection Modal */}
      <WalletModal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />

      {/* ETH Purchase Confirmation Modal */}
      {showETHConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Image src="/eth.png" alt="ETH" width={48} height={48}  />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm ETH Purchase</h3>
              <p className="text-gray-400 text-sm">Please review your transaction details</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">You Pay</span>
                  <div className="flex items-center gap-2">
                    <Image src="/eth.png" alt="ETH" width={16} height={16}  />
                    <span className="text-gray-400 text-sm">ETH</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{parseFloat(ethAmount || '0').toFixed(6)} ETH</div>
                <div className="text-sm text-gray-500">${(parseFloat(ethAmount || '0') * ethPriceUSD).toFixed(2)} USD</div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">You Receive</span>
                  <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="BBLP" width={16} height={16} />
                    <span className="text-gray-400 text-sm">BBLP</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-400">{parseFloat(bblpAmount || '0').toFixed(4)} BBLP</div>
                <div className="text-sm text-gray-500">${(parseFloat(bblpAmount || '0') * 0.10).toFixed(2)} USD</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowETHConfirmModal(false)}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmETHPurchase}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                disabled={isEthBuying}
              >
                {isEthBuying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Confirming...
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BNB Purchase Confirmation Modal */}
      {showBNBConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Image src="/bnb.svg" alt="BNB" width={48} height={48} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm BNB Purchase</h3>
              <p className="text-gray-400 text-sm">Please review your transaction details</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">You Pay</span>
                  <div className="flex items-center gap-2">
                    <Image src="/bnb.svg" alt="BNB" width={16} height={16} />
                    <span className="text-gray-400 text-sm">BNB</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{parseFloat(bnbAmount || '0').toFixed(6)} BNB</div>
                <div className="text-sm text-gray-500">${bnbPriceUSD > 0 ? (parseFloat(bnbAmount || '0') * bnbPriceUSD).toFixed(2) : 'Calculating...'} USD</div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">You Receive</span>
                  <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="BBLP" width={16} height={16} />
                    <span className="text-gray-400 text-sm">BBLP</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-400">{parseFloat(bblpAmount || '0').toFixed(4)} BBLP</div>
                <div className="text-sm text-gray-500">${(parseFloat(bblpAmount || '0') * 0.10).toFixed(2)} USD</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowBNBConfirmModal(false)}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBNBPurchase}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                disabled={isBuying}
              >
                {isBuying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Confirming...
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </Button>
            </div>
          </div>
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