'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenSelector, TokenButton } from './TokenSelector';
import { SwapSettings } from './SwapSettings';
import { useSwap } from '@/hooks/useSwap';
import { useAccount } from 'wagmi';
import { ArrowUpDown, Loader2, AlertTriangle, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Token } from '@/types/swap';
import { PANCAKESWAP_CONTRACTS } from '@/config/swap';
import { ethers } from 'ethers';

// Enhanced styles from stake page
const cardStyles = `
  relative overflow-hidden rounded-2xl lg:rounded-3xl
  bg-gradient-to-br from-zinc-900/90 to-zinc-950/90
  border border-zinc-800
  backdrop-blur-xl shadow-xl
`;



const shimmerStyles = `
  [&]:before:absolute [&]:before:inset-0 
  [&]:before:bg-gradient-to-r [&]:before:from-transparent [&]:before:via-yellow-200/10 [&]:before:to-transparent
  [&]:before:animate-[shimmer_2s_infinite] [&]:before:content-['']
  relative overflow-hidden
`;

const TabButton = ({ active, children }: { active?: boolean, children: React.ReactNode }) => (
  <button
    className={cn(
      "px-3 py-1.5 lg:px-4 lg:py-2 text-sm font-medium  rounded-lg",
      active 
        ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" 
        : "text-gray-400 hover:text-yellow-400/70 hover:bg-yellow-400/5"
    )}
  >
    {children}
  </button>
);

export const SwapInterface: React.FC = () => {
  const { isConnected, address } = useAccount();
  
  const {
    swapState,
    tokens,
    balances,
    approvalState,
    isCorrectNetwork,
    updateInputToken,
    updateOutputToken,
    updateInputAmount,
    updateSettings,
    flipTokens,
    switchToBSCMainnet,
    approveToken,
    executeSwap,
    getTokenPrice,
    loadTokenBalance
  } = useSwap();

  const [showInputTokenSelector, setShowInputTokenSelector] = useState(false);
  const [showOutputTokenSelector, setShowOutputTokenSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);



  const handleInputAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      updateInputAmount(value);
    }
  };

  const handleMaxClick = useCallback(() => {
    if (!swapState.inputToken || !address) return;
    const balance = balances[swapState.inputToken.address];
    if (!balance || parseFloat(balance) <= 0) return;

    // If it's native BNB, leave some for gas
    if (swapState.inputToken.address === 'NATIVE' || swapState.inputToken.symbol === 'BNB') {
      const balanceNum = parseFloat(balance);
      const gasReserve = Math.min(0.01, balanceNum * 0.1); // Leave 0.01 BNB or 10% for gas
      const maxAmount = Math.max(0, balanceNum - gasReserve);
      updateInputAmount(maxAmount.toFixed(8));
    } else {
      updateInputAmount(balance);
    }
  }, [swapState.inputToken, address, balances, updateInputAmount]);

  const handleApprove = async () => {
    if (!swapState.inputToken || !swapState.inputAmount) return;
    
    try {
      await approveToken(swapState.inputToken, swapState.inputAmount);
      
      // Refresh balance after approval
      await loadTokenBalance(swapState.inputToken);
      
    } catch (error: any) {
      console.error('Approval failed:', error);
      
      // Show the error message from ethers.js error handling
      toast.error(error.message || 'Token approval failed. Please try again', {
        duration: 5000,
        style: {
          backgroundColor: '#1E2335',
          border: '1px solid #2E324C',
          color: '#fff'
        },
      });
    }
  };

  const handleSwap = async () => {
    if (!swapState.quote) return;
    
    setIsSwapping(true);
    
    try {
      const txHash = await executeSwap(swapState.quote);
      
      // Show success toast with transaction link
      toast.success('Swap completed successfully!', {
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')
        }
      });

      // Reset input amount after successful swap
      updateInputAmount('');

      // Refresh balances for both input and output tokens
      if (swapState.inputToken) {
        await loadTokenBalance(swapState.inputToken);
      }
      if (swapState.outputToken) {
        await loadTokenBalance(swapState.outputToken);
      }

    } catch (error: any) {
      console.error('Swap failed:', error);
      
      // Show the error message from ethers.js error handling
      toast.error(error.message || 'Transaction failed. Please try again', {
        duration: 5000,
        style: {
          backgroundColor: '#1E2335',
          border: '1px solid #2E324C',
          color: '#fff'
        },
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const isSwapDisabled = () => {
    if (!isConnected || !isCorrectNetwork || !swapState.inputToken || !swapState.outputToken || !swapState.inputAmount || isSwapping) {
      return true;
    }

    // Check if input amount is valid
    const inputAmount = parseFloat(swapState.inputAmount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      return true;
    }

    // Check if user has sufficient balance
    if (swapState.inputToken) {
      const balance = parseFloat(balances[swapState.inputToken.address] || '0');
      if (inputAmount > balance) {
        return true;
      }
    }

    // Check for quote and approval
    if (!swapState.quote || !!swapState.error) {
      return true;
    }

    // Check if approval is needed
    if (!approvalState.isApproved && swapState.inputToken.address !== 'NATIVE' && swapState.inputToken.symbol !== 'BNB') {
      return false; // Enable button for approval
    }

    return false;
  };

  const getSwapButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!isCorrectNetwork) return 'Switch to BSC Mainnet';
    if (!swapState.inputToken || !swapState.outputToken) return 'Select tokens';
    
    const inputAmount = parseFloat(swapState.inputAmount);
    const balance = swapState.inputToken ? parseFloat(balances[swapState.inputToken.address] || '0') : 0;
    
    if (!swapState.inputAmount || inputAmount <= 0) return 'Enter amount';
    if (inputAmount > balance) return 'Insufficient balance';
    if (swapState.isLoading) return 'Getting quote...';
    if (swapState.error) return swapState.error;
    if (!swapState.quote) return 'No liquidity';
    if (!approvalState.isApproved && swapState.inputToken.address !== 'NATIVE' && swapState.inputToken.symbol !== 'BNB') return 'Approve token';
    
    return 'Swap';
  };

  const shouldShowApprove = () => {
    return isConnected && 
           isCorrectNetwork && 
           swapState.inputToken && 
           swapState.inputAmount && 
           parseFloat(swapState.inputAmount) > 0 &&
           swapState.quote && 
           !approvalState.isApproved &&
           swapState.inputToken.symbol !== 'WBNB' &&
           swapState.inputToken.address !== 'NATIVE' &&
           swapState.inputToken.symbol !== 'BNB';
  };

  // Format balance with proper decimals
  const formatTokenBalance = (balance: string | undefined, token: Token | null) => {
    if (!balance || !token) return '0';
    const balanceNum = parseFloat(balance);
    if (balanceNum === 0) return '0';
    // For very small numbers, show all significant digits up to 8 decimals
    if (balanceNum < 0.00000001) return balanceNum.toExponential(4);
    if (balanceNum < 0.0001) return balanceNum.toFixed(8);
    if (balanceNum < 0.01) return balanceNum.toFixed(6);
    if (balanceNum < 1) return balanceNum.toFixed(4);
    // For larger numbers, show 4 decimals max
    return balanceNum.toFixed(4);
  };

  const formatDisplayAmount = (amount: string): string => {
    if (!amount) return '';
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    if (num < 0.000001) return '< 0.000001';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(3);
  };

  const formatMinReceived = (amount: string): string => {
    if (!amount) return '';
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return num.toFixed(4);
  };

  const formatPriceImpact = (impact: string) => {
    const numImpact = parseFloat(impact);
    if (numImpact < 0.01) return '<0.01%';
    return `${impact}%`;
  };



  return (
    <div className={cn("w-full")}>
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 lg:gap-2">
            <TabButton active>Swap</TabButton>
            <TabButton>Limit</TabButton>
            <TabButton>DCA</TabButton>
            <TabButton>Cross-Chain</TabButton>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl  text-gray-400 "
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          </Button>
        </div>

        {/* Main Swap Card */}
        <div className={cardStyles}>
          <div className="p-4 lg:p-5">
            {/* Sell Section */}
            <div className="mb-1">
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-400">Sell</span>
                <span className="text-sm text-gray-400 ml-auto">
                  Balance: {formatTokenBalance(balances[swapState.inputToken?.address || ''], swapState.inputToken)} {swapState.inputToken?.symbol}
                  {swapState.inputToken && parseFloat(balances[swapState.inputToken.address] || '0') > 0 && (
                    <button
                      onClick={handleMaxClick}
                      className="ml-2 text-yellow-400 hover:text-yellow-300 font-medium"
                    >
                      Use Max
                    </button>
                  )}
                </span>
              </div>

              <div className="bg-black/20 rounded-xl p-3 lg:p-4 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={swapState.inputAmount}
                      onChange={(e) => handleInputAmountChange(e.target.value)}
                      className="swap-input"
                      placeholder="0.00"
                      inputMode="numeric"
                    />
                    <div className="text-sm text-gray-500">~${swapState.inputUSDValue || '0.00'}</div>
                  </div>
                  <TokenButton
                    token={swapState.inputToken}
                    onClick={() => setShowInputTokenSelector(true)}
                    className="bg-black/40 hover:bg-black/60 border border-zinc-800 ml-2"
                  />
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center my-2 relative z-10">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-xl bg-black/20 border border-zinc-800 hover:bg-black/40 p-1.5"
                onClick={flipTokens}
              >
                <ArrowUpDown className="w-4 h-4 text-yellow-400" />
              </Button>
            </div>

            {/* Buy Section */}
            <div className="mt-1">
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-400">Buy</span>
                <span className="text-sm text-gray-400 ml-auto">
                  Balance: {formatTokenBalance(balances[swapState.outputToken?.address || ''], swapState.outputToken)} {swapState.outputToken?.symbol}
                </span>
              </div>

              <div className="bg-black/20 rounded-xl p-3 lg:p-4 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={swapState.outputAmount}
                      className="swap-input"
                      placeholder="0.00"
                      inputMode="numeric"
                      disabled
                    />
                    <div className="text-sm text-gray-500">~${swapState.outputUSDValue || '0.00'}</div>
                  </div>
                  <TokenButton
                    token={swapState.outputToken}
                    onClick={() => setShowOutputTokenSelector(true)}
                    className="bg-black/40 hover:bg-black/60 border border-zinc-800 ml-2"
                  />
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            {swapState.quote && (
              <div className="mt-4 space-y-2 text-sm px-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price impact</span>
                  <span className={cn(
                    "font-medium",
                    parseFloat(swapState.quote.priceImpact) > 5
                      ? "text-red-400"
                      : "text-green-400"
                  )}>
                    {formatPriceImpact(swapState.quote.priceImpact)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min. received</span>
                  <span className="text-gray-200">
                    {formatMinReceived(swapState.quote.minimumAmountOut)} {swapState.outputToken?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network fee</span>
                  <span className="text-gray-200">
                    {swapState.quote.gasEstimate} BNB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recipient</span>
                  <span className="text-gray-200">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-'}
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              className={cn(
                "w-full h-11 text-black font-medium rounded-xl mt-4",
                (!isSwapDisabled() || !isCorrectNetwork)
                  ? "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300"
                  : "bg-zinc-800/50 text-gray-400 cursor-not-allowed"
              )}
              disabled={isSwapDisabled() && isCorrectNetwork}
              onClick={!isCorrectNetwork ? switchToBSCMainnet : (shouldShowApprove() ? handleApprove : handleSwap)}
            >
              {isSwapping ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Swapping...
                </div>
              ) : (
                getSwapButtonText()
              )}
            </Button>
          </div>
        </div>

        {/* Token Selectors */}
        <TokenSelector
          isOpen={showInputTokenSelector}
          onClose={() => setShowInputTokenSelector(false)}
          onSelect={(token) => {
            updateInputToken(token);
            setShowInputTokenSelector(false);
          }}
          selectedToken={swapState.inputToken}
          otherToken={swapState.outputToken}
          balances={balances}
        />

        <TokenSelector
          isOpen={showOutputTokenSelector}
          onClose={() => setShowOutputTokenSelector(false)}
          onSelect={(token) => {
            updateOutputToken(token);
            setShowOutputTokenSelector(false);
          }}
          selectedToken={swapState.outputToken}
          otherToken={swapState.inputToken}
          balances={balances}
        />

        {/* Settings Modal */}
        <SwapSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={swapState.settings}
          onUpdate={updateSettings}
        />
      </div>
    </div>
  );
}; 