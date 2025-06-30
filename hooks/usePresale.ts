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

// Kontrat fiyatları (8 decimal)
const TOKEN_PRICES: { tokenPriceUSD: string; [key: number]: string } = {
  tokenPriceUSD: "10000000",     // $0.1
  [TOKEN_IDS.bnb]: "65000000000",    // $650
  [TOKEN_IDS.usdt]: "110000000",     // $1.10
  [TOKEN_IDS.busd]: "110000000"      // $1.10
};

export const usePresale = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [presaleInfo, setPresaleInfo] = useState<PresaleInfo | null>(null);
  const [paymentTokens, setPaymentTokens] = useState<PaymentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Load payment tokens
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const token = await presaleContract.paymentTokens(i);
        tokens.push({
          token: token.token,
          priceUSD: token.priceUSD,
          enabled: token.enabled,
          decimals: token.decimals
        });
      }
      setPaymentTokens(tokens);

    } catch (err) {
      console.error('Error loading presale info:', err);
      setError('Error loading presale info');
    } finally {
      setLoading(false);
    }
  }, [walletClient, isConnected, address]);

  const checkAllowance = async (tokenId: number, amount: string) => {
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
    if (!walletClient || !isConnected) return;
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      // Get token address
      const paymentToken = await presaleContract.paymentTokens(tokenId);
      const tokenAddress = paymentToken.token;
      
      // Create token contract instance
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      // Approve
      const amountInWei = ethers.parseUnits(amount, 18);
      const tx = await tokenContract.approve(PRESALE_ADDRESSES.presale, amountInWei);
      await tx.wait();
      
      return tx;
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
      
      if (tokenId === 0) {
        // Buy with BNB
        const tx = await presaleContract.buyWithBNB({ value: ethers.parseUnits(amount, 18) });
        await tx.wait();
      } else {
        // Buy with token
        const tx = await presaleContract.buyWithToken(tokenId, ethers.parseUnits(amount, 18));
        await tx.wait();
      }
      
      await loadPresaleInfo();
    } catch (err: any) {
      console.error('Buy transaction failed:', err);
      if (err.code === 4001) {
        throw new Error('User rejected the buy transaction');
      }
      throw new Error('Failed to complete the purchase');
    }
  };

  const calculateTokenAmount = async (tokenId: number, amount: string) => {
    if (!walletClient || !isConnected || !amount) return '0';
    
    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const presaleContract = new Contract(PRESALE_ADDRESSES.presale, presaleAbi.abi, signer);
      
      const amountInWei = ethers.parseUnits(amount, 18);
      let tokens;
      
      if (tokenId === TOKEN_IDS.bnb) {
        tokens = await presaleContract.calculateTokensForBNB(amountInWei);
      } else {
        tokens = await presaleContract.calculateTokensForToken(tokenId, amountInWei);
      }
      
      return tokens.toString();
    } catch (err) {
      console.error('Error calculating token amount:', err);
      return '0';
    }
  };

  const calculatePaymentAmount = (tokenId: number, desiredTokenAmount: string): string => {
    if (!desiredTokenAmount) return '0';
    try {
      const tokenAmountWei = ethers.parseUnits(desiredTokenAmount, 18);
      const tokenPriceUSD = BigInt(TOKEN_PRICES.tokenPriceUSD);
      const totalUsdCost = (tokenAmountWei * tokenPriceUSD) / BigInt(10 ** 18);
      const paymentTokenPrice = BigInt(TOKEN_PRICES[tokenId]);
      const paymentAmount = (totalUsdCost * BigInt(10 ** 18)) / paymentTokenPrice;
      return paymentAmount.toString();
    } catch (err) {
      console.error('Error calculating payment amount:', err);
      return '0';
    }
  };

  useEffect(() => {
    if (isConnected && address && walletClient) {
      loadPresaleInfo();
    } else {
      // Set loading to false if wallet is not connected to allow page access
      setLoading(false);
    }
  }, [isConnected, address, walletClient, loadPresaleInfo]);

  return {
    presaleInfo,
    paymentTokens,
    loading,
    error,
    checkAllowance,
    approveToken,
    buyTokens,
    calculateTokenAmount,
    calculatePaymentAmount,
    loadPresaleInfo,
    TOKEN_PRICES
  };
}; 