'use client';

import { useCallback, useEffect, useState } from 'react';
import { ethers, Contract, Interface } from 'ethers';
import { PRESALE_ADDRESSES, TOKEN_IDS } from '../config/presale';
import { PaymentToken, PresaleInfo } from '../types';
import presaleAbi from '../config/presaleAbi.json';
import { useAccount, useWalletClient, useChainId, useSwitchChain } from 'wagmi';

// ERC20 Interface and ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ERC20_INTERFACE = new Interface(ERC20_ABI);

export const usePresale = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [presaleInfo, setPresaleInfo] = useState<PresaleInfo | null>(null);
  const [paymentTokens, setPaymentTokens] = useState<PaymentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ [key: number]: bigint }>({});

  // ETH için dummy değerler
  const isETH = chainId === 1;
  const ETH_DUMMY_INFO = {
    saleTokenAddress: '',
    tokenPriceUSD: BigInt(0),
    totalTokensSold: BigInt(0),
    userTokensPurchased: BigInt(0),
    isPaused: false
  };

  const loadPresaleInfo = useCallback(async () => {
    if (!walletClient || !isConnected || !address) {
      // Don't set error, just stop loading to allow page access without wallet
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);

      // Load basic presale info
      const [tokenPriceUSD, totalSold, userPurchased, paused] = await Promise.all([
        presaleContract.tokenPriceUSD(),
        presaleContract.totalTokensSold(),
        presaleContract.tokensPurchased(address),
        presaleContract.paused()
      ]);

      setPresaleInfo({
        saleTokenAddress: PRESALE_ADDRESSES.saleToken,
        tokenPriceUSD,
        totalTokensSold: totalSold,
        userTokensPurchased: userPurchased,
        isPaused: paused
      });

      // Load payment tokens with new structure
      const tokens = [];
      const prices: { [key: number]: bigint } = {};
      
      for (let i = 0; i < 3; i++) {
        const token = await presaleContract.paymentTokens(i);
        tokens.push({
          token: token.token,
          priceFeed: token.priceFeed,
          enabled: token.enabled,
          decimals: token.decimals,
          useStaticPrice: token.useStaticPrice,
          staticPriceUSD: token.staticPriceUSD
        });
        
        // Get real-time price for each token
        const tokenPrice = await presaleContract.getTokenPriceUSD(i);
        prices[i] = tokenPrice;
      }
      
      setPaymentTokens(tokens);
      setTokenPrices(prices);

    } catch (err) {
      console.error('Error loading presale info:', err);
      setError('Error loading presale info');
    } finally {
      setLoading(false);
    }
  }, [walletClient, isConnected, address]);

  const checkAllowance = async (tokenId: number) => {
    if (!walletClient || !isConnected || tokenId === 0) return '0'; // BNB doesn't need approval
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      // Get token address
      const paymentToken = await presaleContract.paymentTokens(tokenId);
      const tokenAddress = paymentToken.token;
      
      // Create token contract instance
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      // Get current allowance
      const allowance = await tokenContract.allowance(address, PRESALE_ADDRESSES.presale);
      return allowance.toString();
    } catch (err) {
      console.error('Error checking allowance:', err);
      return '0';
    }
  };

  const approveToken = async (tokenId: number, amount: string) => {
    if (!walletClient || !isConnected || tokenId === 0) return; // BNB doesn't need approval
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      // Get token address
      const paymentToken = await presaleContract.paymentTokens(tokenId);
      const tokenAddress = paymentToken.token;
      
      // Create token contract instance
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      // Approve tokens - amount is already in wei format
      const tx = await tokenContract.approve(PRESALE_ADDRESSES.presale, BigInt(amount));
      await tx.wait();
    } catch (err: any) {
      console.error('Approval failed:', err);
      if (err.code === 4001) {
        throw new Error('User rejected the approval transaction');
      }
      throw new Error('Failed to approve tokens');
    }
  };

  const buyTokens = async (tokenId: number, amount: string) => {
    if (!walletClient || !isConnected) return;
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      // Convert amount to BigInt since it's already in wei format
      const amountWei = BigInt(amount);
      
      if (tokenId === 0) {
        // Buy with BNB
        const tx = await presaleContract.buyWithBNB({ value: amountWei });
        await tx.wait();
      } else {
        // Buy with token
        const tx = await presaleContract.buyWithToken(tokenId, amountWei);
        await tx.wait();
      }
      
      await loadPresaleInfo();
    } catch (err: any) {
      console.error('Buy transaction failed:', err);
      if (err.code === 4001) {
        throw new Error('User rejected the buy transaction');
      }
      // Spesifik bakiye yetersizliği hatası için kullanıcı dostu mesaj
      const errMsg = err?.data?.message || err?.message || '';
      if (errMsg.includes('transfer amount exceeds balance')) {
        throw new Error('Insufficient balance: Your wallet does not have enough balance.');
      }
      throw new Error('Insufficient BNB balance');
    }
  };

  const calculateTokenAmount = async (tokenId: number, amount: string) => {
    if (!walletClient || !isConnected || !amount) return '0';
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      const amountInWei = ethers.parseUnits(amount, 18);
      const tokens = await presaleContract.calculateTokenAmount(tokenId, amountInWei);
      
      return tokens.toString();
    } catch (err) {
      console.error('Error calculating token amount:', err);
      return '0';
    }
  };

  const calculatePaymentAmount = async (tokenId: number, desiredTokenAmount: string): Promise<string> => {
    if (!desiredTokenAmount || !presaleInfo) return '0';
    
    try {
      const tokenAmountWei = ethers.parseUnits(desiredTokenAmount, 18);
      const tokenPriceUSD = presaleInfo.tokenPriceUSD;
      
      // Calculate total USD cost
      const totalUsdCost = (tokenAmountWei * tokenPriceUSD) / BigInt(10 ** 18);
      
      // Get payment token price
      const paymentTokenPrice = tokenPrices[tokenId];
      if (!paymentTokenPrice) return '0';
      
      // Calculate payment amount
      const paymentAmount = (totalUsdCost * BigInt(10 ** 18)) / paymentTokenPrice;
      return paymentAmount.toString();
    } catch (err) {
      console.error('Error calculating payment amount:', err);
      return '0';
    }
  };

  useEffect(() => {
    if (isETH) {
      setPresaleInfo(ETH_DUMMY_INFO);
      setTokenPrices({ [TOKEN_IDS.eth]: BigInt(0) });
      setLoading(false);
      return;
    }
    if (isConnected && address && walletClient) {
      loadPresaleInfo();
    } else {
      // Set loading to false if wallet is not connected to allow page access
      setLoading(false);
    }
  }, [isConnected, address, walletClient, loadPresaleInfo, isETH]);

  return {
    presaleInfo: isETH ? ETH_DUMMY_INFO : presaleInfo,
    paymentTokens,
    loading: isETH ? false : loading,
    error,
    checkAllowance,
    approveToken,
    buyTokens,
    calculateTokenAmount,
    calculatePaymentAmount,
    loadPresaleInfo,
    tokenPrices: isETH ? { [TOKEN_IDS.eth]: BigInt(0) } : tokenPrices
  };
}; 