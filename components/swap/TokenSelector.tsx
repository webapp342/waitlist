'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Token } from '@/types/swap';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwap } from '@/hooks/useSwap';
import Image from 'next/image';

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken: Token | null;
  otherToken: Token | null;
  balances: Record<string, string>;
}

interface TokenButtonProps {
  token: Token | null;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const formatBalance = (balance: string | undefined) => {
  if (!balance || balance === '0') return '0';
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '0';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(3);
  return num.toFixed(2);
};

const COMMON_TOKENS = [
  { symbol: 'BNB', name: 'Binance Coin', address: 'NATIVE' },
  { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7cea3dedca5984780bafc599bd69add087d56' },
  { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059ff775485246999027b3197955' }

] as const;

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  otherToken,
  balances
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);
  const [customTokenError, setCustomTokenError] = useState<string | null>(null);
  const { tokens, addCustomToken, loadVisibleTokensBalances } = useSwap();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load balances when token selector opens
  useEffect(() => {
    if (isOpen) {
      loadVisibleTokensBalances();
      // Only focus input on desktop
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, loadVisibleTokensBalances]);

  const handleSelect = (token: Token) => {
    onSelect(token);
    setSearchQuery('');
    setCustomTokenError(null);
  };

  // Check if search query is a valid address
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleCustomTokenAdd = async () => {
    if (!isValidAddress(searchQuery)) return;
    
    setIsLoadingCustomToken(true);
    setCustomTokenError(null);
    
    try {
      const customToken = await addCustomToken(searchQuery);
      if (customToken) {
        handleSelect(customToken);
      } else {
        setCustomTokenError('Failed to load token. Please check the address.');
      }
    } catch (error) {
      console.error('Failed to add custom token:', error);
      setCustomTokenError('Invalid token address or network error.');
    } finally {
      setIsLoadingCustomToken(false);
    }
  };

  // Filter out WBNB and filter by search query
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => 
      token.symbol !== 'WBNB' && // Filter out WBNB
      (token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
       token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       token.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tokens, searchQuery]);

  const showCustomTokenOption = isValidAddress(searchQuery) && 
    !tokens.some(token => token.address.toLowerCase() === searchQuery.toLowerCase());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md min-h-[80vh] flex flex-col bottom-20 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">Select a token</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder="Search name or paste address (0x...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCustomTokenError(null);
            }}
            className="pl-10 bg-black/20 border-zinc-800 text-white placeholder-gray-500 focus:ring-yellow-400/20"
          />
          
          {/* Error Message */}
          {customTokenError && (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-200">{customTokenError}</p>
            </div>
          )}
          
          {/* Address Format Helper */}
          {searchQuery && searchQuery.length > 0 && !isValidAddress(searchQuery) && searchQuery.startsWith('0x') && (
            <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-200">Token address should be 42 characters long (0x + 40 hex characters)</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 hide-scrollbar">
          {/* Custom Token Option */}
          {showCustomTokenOption && (
            <button
              onClick={handleCustomTokenAdd}
              disabled={isLoadingCustomToken}
              className={cn(
                "w-full p-3 rounded-xl text-left transition-colors",
                "bg-gradient-to-r from-yellow-400/10 to-yellow-300/10",
                "border border-yellow-400/20 hover:border-yellow-400/30",
                "hover:from-yellow-400/20 hover:to-yellow-300/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-300 flex items-center justify-center">
                    {isLoadingCustomToken ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-black text-xs font-bold">+</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {isLoadingCustomToken ? 'Loading Token...' : 'Add Custom Token'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {searchQuery.slice(0, 6)}...{searchQuery.slice(-4)}
                    </div>
                  </div>
                </div>
                {!isLoadingCustomToken && (
                  <div className="text-yellow-400 text-sm">Click to add</div>
                )}
              </div>
            </button>
          )}

          {/* Token List */}
          {filteredTokens.map((token) => {
            const isSelected = selectedToken && selectedToken.address === token.address;
            const isOtherToken = otherToken && otherToken.address === token.address;
            const isDisabled = isSelected || isOtherToken || token.disabled || token.comingSoon;
            const balance = balances[token.address];
            
            return (
              <button
                key={token.address}
                type="button"
                className={cn(
                  "flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/60 mb-2 gap-3 text-left",
                  isSelected && 'border-yellow-400 bg-yellow-400/10',
                  isOtherToken && 'opacity-50 pointer-events-none',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onClick={() => !isDisabled && handleSelect(token)}
                disabled={isDisabled}
              >
                {token.logoURI ? (
                  <Image src={token.logoURI} alt={token.symbol} width={28} height={28} className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-950" />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{token.symbol.slice(0, 2)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{token.symbol}</span>
                    {token.comingSoon && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-yellow-400 text-black text-xs font-bold">Coming Soon</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{token.name}</div>
                </div>
                
                {balance && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {formatBalance(balance)}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          
          {filteredTokens.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No tokens found
            </div>
          )}
        </div>

      
      </DialogContent>
    </Dialog>
  );
};

export const TokenButton: React.FC<TokenButtonProps> = ({ 
  token, 
  onClick, 
  disabled = false,
  className
}) => {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center space-x-2 py-1.5",
        className
      )}
    >
      <div className="relative w-6 h-6">
        {token?.logoURI ? (
          <Image
            src={token.logoURI}
            alt={token.symbol}
            width={24}
            height={24}
            className="rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : token ? (
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-200 to-yellow-400 flex items-center justify-center text-black text-xs font-semibold">
            {token.symbol.slice(0, 2)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-800" />
        )}
      </div>
      <span className="font-medium">{token?.symbol || 'Select'}</span>
      <ChevronDown className="w-4 h-4" />
    </Button>
  );
}; 