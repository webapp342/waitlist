'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { 
  Token, 
  SwapState, 
  SwapQuote, 
  SwapSettings, 
  SwapError, 
  ApprovalState,
  TokenListResponse
} from '@/types/swap';
import { 
  BSC_MAINNET_CHAIN_ID,
  BSC_MAINNET_CONFIG,
  PANCAKESWAP_CONTRACTS,
  DEFAULT_TOKENS,
  DEFAULT_SWAP_SETTINGS,
  TOKEN_LIST_URL,
  ROUTER_V2_ABI,
  ERC20_ABI
} from '@/config/swap';

export const useSwap = () => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [swapState, setSwapState] = useState<SwapState>({
    inputToken: DEFAULT_TOKENS.BNB,
    outputToken: DEFAULT_TOKENS.USDT,
    inputAmount: '',
    outputAmount: '',
    inputUSDValue: '0.00',
    outputUSDValue: '0.00',
    isLoading: false,
    error: null,
    quote: null,
    settings: DEFAULT_SWAP_SETTINGS
  });

  const [tokens, setTokens] = useState<Token[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [approvalState, setApprovalState] = useState<ApprovalState>({
    isApproved: false,
    isApproving: false
  });

  // BBLP token tanımı
  const BBLP_TOKEN = {
    name: 'BBLP Token',
    symbol: 'BBLP',
    address: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235', // Updated to real address
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: '/logo.svg',
    comingSoon: true, // Keep as coming soon
    disabled: true    // Keep as disabled
  };

  // Load token list
  const loadTokenList = useCallback(async () => {
    try {
      const response = await fetch(TOKEN_LIST_URL);
      const data: TokenListResponse = await response.json();
      
      // Filter only BSC mainnet tokens, now allowing WBNB
      const bscTokens = data.tokens
        .filter(token => token.chainId === BSC_MAINNET_CHAIN_ID)
        .filter(token => 
          token.symbol !== 'BNB' // Only exclude native BNB
        )
        .slice(0, 500); // Increased to 500 tokens for more options
      
      // Create WBNB token if not in the list
      const wbnbToken: Token = {
        address: PANCAKESWAP_CONTRACTS.WBNB,
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        logoURI: '/bnb.svg', // Using BNB logo for WBNB
        chainId: BSC_MAINNET_CHAIN_ID
      };
      
      setTokens([
        BBLP_TOKEN,
        DEFAULT_TOKENS.BNB,
        wbnbToken, // Add WBNB right after BNB
        DEFAULT_TOKENS.CAKE,
        DEFAULT_TOKENS.USDT,
        DEFAULT_TOKENS.BUSD,
        DEFAULT_TOKENS.USDC,
        ...bscTokens.filter(token => 
          !Object.values(DEFAULT_TOKENS).some(defaultToken => 
            defaultToken.address.toLowerCase() === token.address.toLowerCase()
          ) &&
          token.address.toLowerCase() !== PANCAKESWAP_CONTRACTS.WBNB.toLowerCase() // Prevent duplicate WBNB
        )
      ]);
    } catch (error) {
      console.error('Failed to load token list:', error);
      // Include WBNB in fallback tokens as well
      const wbnbToken: Token = {
        address: PANCAKESWAP_CONTRACTS.WBNB,
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        logoURI: '/bnb.svg',
        chainId: BSC_MAINNET_CHAIN_ID
      };
      setTokens([
        BBLP_TOKEN,
        DEFAULT_TOKENS.BNB,
        wbnbToken,
        DEFAULT_TOKENS.CAKE,
        DEFAULT_TOKENS.USDT,
        DEFAULT_TOKENS.BUSD,
        DEFAULT_TOKENS.USDC
      ]);
    }
  }, []);

  // Check if user is on correct network
  const isCorrectNetwork = chain?.id === BSC_MAINNET_CHAIN_ID;

  // Switch to BSC mainnet
  const switchToBSCMainnet = useCallback(async () => {
    if (!switchChain) return;
    
    try {
      await switchChain({ chainId: BSC_MAINNET_CHAIN_ID });
    } catch (error: any) {
      // If the network is not added, add it
      if (error.code === 4902) {
        try {
          await walletClient?.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_MAINNET_CONFIG]
          });
        } catch (addError) {
          console.error('Failed to add BSC mainnet:', addError);
          toast.error('Failed to add BSC mainnet to wallet');
        }
      } else {
        console.error('Failed to switch to BSC mainnet:', error);
        toast.error('Failed to switch to BSC mainnet');
      }
    }
  }, [switchChain, walletClient]);

  // Get token balance
  const getTokenBalance = useCallback(async (token: Token, userAddress: string) => {
    if (!walletClient || !isCorrectNetwork) return '0';

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      
      if (token.address === 'NATIVE' || token.symbol === 'BNB') {
        // For native BNB
        const balance = await provider.getBalance(userAddress);
        return ethers.formatEther(balance);
      } else if (token.address.toLowerCase() === PANCAKESWAP_CONTRACTS.WBNB.toLowerCase()) {
        // For WBNB token
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(userAddress);
        return ethers.formatUnits(balance, token.decimals);
      } else {
        // For other ERC20 tokens
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(userAddress);
        return ethers.formatUnits(balance, token.decimals);
      }
    } catch (error) {
      console.error(`Failed to get balance for ${token.symbol}:`, error);
      return '0';
    }
  }, [walletClient, isCorrectNetwork]);

  // Load balances for specific tokens only
  const loadTokenBalance = useCallback(async (token: Token): Promise<string> => {
    if (!address || !isConnected) return '0';
    
    try {
      const balance = await getTokenBalance(token, address);
      setBalances(prev => ({
        ...prev,
        [token.address]: balance
      }));
      return balance;
    } catch (error) {
      console.error(`Failed to load balance for ${token.symbol}:`, error);
      setBalances(prev => ({
        ...prev,
        [token.address]: '0'
      }));
      return '0';
    }
  }, [address, isConnected, getTokenBalance]);

  // Load balances for selected tokens only (fast startup)
  const loadSelectedTokensBalances = useCallback(async () => {
    if (!address || !isConnected) return;

    const tokensToLoad = [];
    if (swapState.inputToken) tokensToLoad.push(swapState.inputToken);
    if (swapState.outputToken && swapState.outputToken.address !== swapState.inputToken?.address) {
      tokensToLoad.push(swapState.outputToken);
    }

    // Load in parallel for speed
    await Promise.all(tokensToLoad.map(token => loadTokenBalance(token)));
  }, [address, isConnected, swapState.inputToken, swapState.outputToken, loadTokenBalance]);

  // Batch load balances for token selector (when user opens it)
  const loadVisibleTokensBalances = useCallback(async (tokenList: Token[] = tokens) => {
    if (!address || !isConnected) {
      // Set all as 0 if no wallet
      const newBalances: Record<string, string> = {};
      tokenList.forEach(token => {
        if (!balances[token.address]) {
          newBalances[token.address] = '0';
        }
      });
      if (Object.keys(newBalances).length > 0) {
        setBalances(prev => ({ ...prev, ...newBalances }));
      }
      return;
    }

    // Load first 20 tokens with balance check
    const tokensToCheck = tokenList.slice(0, 20);
    
    // Load in batches of 5 for better performance
    const batchSize = 5;
    for (let i = 0; i < tokensToCheck.length; i += batchSize) {
      const batch = tokensToCheck.slice(i, i + batchSize);
      await Promise.all(batch.map(token => loadTokenBalance(token)));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tokensToCheck.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Set remaining tokens as 0 for faster UI
    const remainingTokens = tokenList.slice(20);
    const zeroBalances: Record<string, string> = {};
    remainingTokens.forEach(token => {
      if (!balances[token.address]) {
        zeroBalances[token.address] = '0';
      }
    });
    
    if (Object.keys(zeroBalances).length > 0) {
      setBalances(prev => ({ ...prev, ...zeroBalances }));
    }
  }, [address, isConnected, tokens, balances, loadTokenBalance]);

  // Get swap quote
  const getQuote = useCallback(async (
    inputToken: Token,
    outputToken: Token,
    amountIn: string
  ): Promise<SwapQuote | null> => {
    if (!walletClient || !isCorrectNetwork || !amountIn || parseFloat(amountIn) <= 0) {
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      const router = new ethers.Contract(
        PANCAKESWAP_CONTRACTS.ROUTER_V2,
        ROUTER_V2_ABI,
        provider
      );

      const amountInWei = ethers.parseUnits(amountIn, inputToken.decimals);
      
      // Handle native BNB
      const inputAddress = inputToken.address === 'NATIVE' ? PANCAKESWAP_CONTRACTS.WBNB : inputToken.address;
      const outputAddress = outputToken.address === 'NATIVE' ? PANCAKESWAP_CONTRACTS.WBNB : outputToken.address;
      
      const path = [inputAddress, outputAddress];

      // Get amounts out
      const amounts = await router.getAmountsOut(amountInWei, path);
      const amountOut = amounts[amounts.length - 1];
      const outputAmount = ethers.formatUnits(amountOut, outputToken.decimals);

      // Calculate minimum amount out with slippage
      const slippageBasisPoints = Math.floor(swapState.settings.slippageTolerance * 100);
      const minAmountOut = amountOut * BigInt(10000 - slippageBasisPoints) / BigInt(10000);
      const minimumAmountOut = ethers.formatUnits(minAmountOut, outputToken.decimals);

      // Calculate price impact using spot price
      const spotPrice = await router.getAmountsOut(
        ethers.parseUnits('1', inputToken.decimals),
        path
      );
      const spotOutputAmount = ethers.formatUnits(spotPrice[spotPrice.length - 1], outputToken.decimals);
      const expectedRate = parseFloat(spotOutputAmount);
      const actualRate = parseFloat(outputAmount) / parseFloat(amountIn);
      const priceImpact = ((expectedRate - actualRate) / expectedRate * 100).toFixed(2);

      // Estimate gas
      let gasEstimate = '0';
      try {
        const gasPrice = await provider.getFeeData();
        const maxFeePerGas = gasPrice.maxFeePerGas || gasPrice.gasPrice;
        if (maxFeePerGas) {
          const estimatedGas = BigInt(inputToken.address === 'NATIVE' || outputToken.address === 'NATIVE'
            ? 200000 // Native BNB transfers use more gas
            : 150000); // Token to token
          const gasCostWei = maxFeePerGas * estimatedGas;
          gasEstimate = ethers.formatEther(gasCostWei);
        }
      } catch (error) {
        console.error('Failed to estimate gas:', error);
      }

      return {
        inputAmount: amountIn,
        outputAmount,
        minimumAmountOut,
        priceImpact,
        gasEstimate,
        route: path.map(addr => {
          const token = tokens.find(t => t.address.toLowerCase() === addr.toLowerCase());
          return token?.symbol || addr;
        })
      };
    } catch (error) {
      console.error('Failed to get quote:', error);
      throw new Error(SwapError.INSUFFICIENT_LIQUIDITY);
    }
  }, [walletClient, isCorrectNetwork, tokens, swapState.settings.slippageTolerance]);

  // Check token approval
  const checkApproval = useCallback(async (token: Token, amount: string) => {
    if (!walletClient || !address || !isCorrectNetwork) return false;

         try {
       // Native BNB doesn't need approval
       if (token.address === 'NATIVE' || token.symbol === 'BNB') {
         return true;
       }

      const provider = new ethers.BrowserProvider(walletClient);
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      
      const allowance = await contract.allowance(address, PANCAKESWAP_CONTRACTS.ROUTER_V2);
      const amountWei = ethers.parseUnits(amount, token.decimals);
      
      return allowance >= amountWei;
    } catch (error) {
      console.error('Failed to check approval:', error);
      return false;
    }
  }, [walletClient, address, isCorrectNetwork]);

  // Approve token
  const approveToken = useCallback(async (token: Token, amount: string) => {
    if (!walletClient || !address || !isCorrectNetwork) return;

    setApprovalState({ isApproved: false, isApproving: true });

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
      
      const amountWei = ethers.parseUnits(amount, token.decimals);
      const tx = await contract.approve(PANCAKESWAP_CONTRACTS.ROUTER_V2, amountWei);
      
      setApprovalState({ isApproved: false, isApproving: true, approvalHash: tx.hash });
      toast.info('Approval transaction sent...');
      
      await tx.wait();
      
      setApprovalState({ isApproved: true, isApproving: false });
      toast.success('Token approved successfully!');
    } catch (error) {
      console.error('Failed to approve token:', error);
      setApprovalState({ isApproved: false, isApproving: false });
      toast.error('Failed to approve token');
      throw error;
    }
  }, [walletClient, address, isCorrectNetwork]);

  // Execute swap
  const executeSwap = useCallback(async (quote: SwapQuote) => {
    if (!walletClient || !address || !isCorrectNetwork || !swapState.inputToken || !swapState.outputToken) {
      throw new Error('Wallet not connected or wrong network');
    }

    const { inputToken, outputToken } = swapState;

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      const router = new ethers.Contract(PANCAKESWAP_CONTRACTS.ROUTER_V2, ROUTER_V2_ABI, signer);

      const amountIn = ethers.parseUnits(quote.inputAmount, inputToken.decimals);
      const amountOutMin = ethers.parseUnits(quote.minimumAmountOut, outputToken.decimals);
      const deadline = Math.floor(Date.now() / 1000) + (swapState.settings.deadline * 60);

      const path = [
        inputToken.address === 'NATIVE' ? PANCAKESWAP_CONTRACTS.WBNB : inputToken.address,
        outputToken.address === 'NATIVE' ? PANCAKESWAP_CONTRACTS.WBNB : outputToken.address
      ];

      // Get fee data (legacy mode for BSC)
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      if (!gasPrice) {
        throw new Error('Failed to get gas price');
      }

      let tx;
      const txOptions = {
        gasPrice: gasPrice,
        gasLimit: 300000 // Safe gas limit for swaps
      };

      try {
        if (inputToken.address === 'NATIVE' || inputToken.symbol === 'BNB') {
          // Swapping from BNB
          tx = await router.swapExactETHForTokens(
            amountOutMin,
            path,
            address,
            deadline,
            { ...txOptions, value: amountIn }
          );
        } else if (outputToken.address === 'NATIVE' || outputToken.symbol === 'BNB') {
          // Swapping to BNB
          tx = await router.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            address,
            deadline,
            txOptions
          );
        } else {
          // Token to token swap
          tx = await router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address,
            deadline,
            txOptions
          );
        }

        const receipt = await tx.wait();
        return receipt.hash;
      } catch (error: any) {
        console.error('Swap execution failed:', error);
        
        // Handle specific error cases
        if (error.data?.message?.includes('TRANSFER_FROM_FAILED')) {
          // Check if it's an allowance issue
          const allowance = await checkApproval(inputToken, quote.inputAmount);
          if (!allowance) {
            throw new Error('Insufficient allowance. Please approve the tokens first.');
          }
          
          // If not allowance, then it's likely insufficient balance
          const balance = await getTokenBalance(inputToken, address);
          const formattedBalance = ethers.formatUnits(balance || '0', inputToken.decimals);
          if (parseFloat(formattedBalance) < parseFloat(quote.inputAmount)) {
            throw new Error(`Insufficient ${inputToken.symbol} balance. You have ${formattedBalance} but trying to swap ${quote.inputAmount}`);
          }
          
          throw new Error(`Failed to transfer ${inputToken.symbol}. Please try again or contact support if the issue persists.`);
        }

        // Handle user rejection
        if (error.code === 'ACTION_REJECTED' || error.message?.includes('User rejected')) {
          throw new Error('Transaction was cancelled by user');
        }

        // Handle other errors
        throw new Error(error.reason || error.message || 'Swap failed. Please try again.');
      }
    } catch (error: any) {
      throw error; // Re-throw to be handled by the UI
    }
  }, [walletClient, address, isCorrectNetwork, swapState, checkApproval, getTokenBalance]);

  // Update quote when inputs change
  useEffect(() => {
    const updateQuote = async () => {
      if (!swapState.inputToken || !swapState.outputToken || !swapState.inputAmount || parseFloat(swapState.inputAmount) <= 0) {
        setSwapState(prev => ({ ...prev, quote: null, outputAmount: '', error: null }));
        return;
      }

      setSwapState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const quote = await getQuote(swapState.inputToken, swapState.outputToken, swapState.inputAmount);
        
        if (quote) {
          setSwapState(prev => ({ 
            ...prev, 
            quote, 
            outputAmount: quote.outputAmount, 
            isLoading: false 
          }));
        } else {
          setSwapState(prev => ({ 
            ...prev, 
            quote: null, 
            outputAmount: '', 
            isLoading: false 
          }));
        }
      } catch (error: any) {
        setSwapState(prev => ({ 
          ...prev, 
          error: error.message, 
          quote: null, 
          outputAmount: '', 
          isLoading: false 
        }));
      }
    };

    const timeoutId = setTimeout(updateQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [swapState.inputToken, swapState.outputToken, swapState.inputAmount, getQuote]);

  // Load token list on mount
  useEffect(() => {
    loadTokenList();
  }, [loadTokenList]);

  // Load balances for selected tokens when user changes
  useEffect(() => {
    loadSelectedTokensBalances();
  }, [loadSelectedTokensBalances]);

  // Update approval state when input changes
  useEffect(() => {
    const updateApprovalState = async () => {
      if (!swapState.inputToken || !swapState.inputAmount || parseFloat(swapState.inputAmount) <= 0) {
        setApprovalState({ isApproved: true, isApproving: false });
        return;
      }

      const isApproved = await checkApproval(swapState.inputToken, swapState.inputAmount);
      setApprovalState({ isApproved, isApproving: false });
    };

    updateApprovalState();
  }, [swapState.inputToken, swapState.inputAmount, checkApproval]);

  const updateInputToken = (token: Token) => {
    // If user selects a BNB token that's not our native BNB, switch to native BNB
    if (token.symbol === 'BNB' && token.address !== 'NATIVE') {
      setSwapState(prev => ({ ...prev, inputToken: DEFAULT_TOKENS.BNB }));
    } else {
      setSwapState(prev => ({ ...prev, inputToken: token }));
    }
  };

  const updateOutputToken = (token: Token) => {
    // If user selects a BNB token that's not our native BNB, switch to native BNB
    if (token.symbol === 'BNB' && token.address !== 'NATIVE') {
      setSwapState(prev => ({ ...prev, outputToken: DEFAULT_TOKENS.BNB }));
    } else {
      setSwapState(prev => ({ ...prev, outputToken: token }));
    }
  };

  const updateInputAmount = (amount: string) => {
    setSwapState(prev => ({ ...prev, inputAmount: amount }));
  };

  const updateSettings = (settings: Partial<SwapSettings>) => {
    setSwapState(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, ...settings } 
    }));
  };

  const flipTokens = () => {
    setSwapState(prev => ({
      ...prev,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
      inputAmount: prev.outputAmount,
      outputAmount: prev.inputAmount
    }));
  };

  // Get token price in USD
  const getTokenPrice = useCallback(async (token: Token): Promise<number> => {
    if (!walletClient || !isCorrectNetwork) return 0;

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      const router = new ethers.Contract(
        PANCAKESWAP_CONTRACTS.ROUTER_V2,
        ROUTER_V2_ABI,
        provider
      );

      // Use USDT as price reference (more stable than BUSD)
      const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
      
      // If token is USDT or BUSD, return 1
      if (token.address.toLowerCase() === USDT_ADDRESS.toLowerCase() || 
          token.address.toLowerCase() === '0xe9e7cea3dedca5984780bafc599bd69add087d56') {
        return 1;
      }

      // Get amount out for 1 token
      const amountIn = ethers.parseUnits('1', token.decimals);
      let path: string[];

      if (token.address === 'NATIVE' || token.symbol === 'BNB' || 
          token.address.toLowerCase() === PANCAKESWAP_CONTRACTS.WBNB.toLowerCase()) {
        // For native BNB and WBNB: WBNB -> USDT
        path = [PANCAKESWAP_CONTRACTS.WBNB, USDT_ADDRESS];
      } else {
        // For all other tokens, always go through WBNB for consistency
        path = [token.address, PANCAKESWAP_CONTRACTS.WBNB, USDT_ADDRESS];
      }

      const amounts = await router.getAmountsOut(amountIn, path);
      const priceInUSD = parseFloat(ethers.formatUnits(amounts[amounts.length - 1], 18));
      return priceInUSD;
    } catch (error) {
      console.error(`Failed to get price for ${token.symbol}:`, error);
      return 0;
    }
  }, [walletClient, isCorrectNetwork]);

  // Get USD values for display
  const getUSDValue = useCallback(async (amount: string, token: Token | null): Promise<string> => {
    if (!token || !amount || parseFloat(amount) === 0) return '0.00';
    
    try {
      const price = await getTokenPrice(token);
      return (parseFloat(amount) * price).toFixed(2);
    } catch (error) {
      console.error('Failed to calculate USD value:', error);
      return '0.00';
    }
  }, [getTokenPrice]);

  // Update USD values when amounts or tokens change
  useEffect(() => {
    const updateUSDValues = async () => {
      if (!swapState.inputToken || !swapState.outputToken) return;

      try {
        const [inputUSD, outputUSD] = await Promise.all([
          getUSDValue(swapState.inputAmount, swapState.inputToken),
          getUSDValue(swapState.outputAmount, swapState.outputToken)
        ]);

        setSwapState(prev => ({
          ...prev,
          inputUSDValue: inputUSD,
          outputUSDValue: outputUSD
        }));
      } catch (error) {
        console.error('Failed to update USD values:', error);
      }
    };

    updateUSDValues();
  }, [swapState.inputAmount, swapState.outputAmount, swapState.inputToken, swapState.outputToken, getUSDValue]);

  // Load custom token by address
  const loadCustomToken = useCallback(async (address: string): Promise<Token | null> => {
    if (!walletClient || !isCorrectNetwork) return null;

    try {
      const provider = new ethers.BrowserProvider(walletClient);
      const contract = new ethers.Contract(address, ERC20_ABI, provider);

      // Get token info
      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);

      const customToken: Token = {
        name,
        symbol,
        address,
        decimals: Number(decimals),
        chainId: BSC_MAINNET_CHAIN_ID,
        logoURI: `https://tokens.pancakeswap.finance/images/${address}.png` // Try PancakeSwap logo first
      };

      return customToken;
    } catch (error) {
      console.error('Failed to load custom token:', error);
      return null;
    }
  }, [walletClient, isCorrectNetwork]);

  // Add custom token to list
  const addCustomToken = useCallback(async (address: string): Promise<Token | null> => {
    const customToken = await loadCustomToken(address);
    
    if (customToken) {
      // Check if token already exists
      const exists = tokens.some(token => 
        token.address.toLowerCase() === address.toLowerCase()
      );
      
      if (!exists) {
        setTokens(prev => [...prev, customToken]);
        
        // Load balance for new token
        if (address) {
          await loadTokenBalance(customToken);
        }
      }
      
      return customToken;
    }
    
    return null;
  }, [loadCustomToken, tokens, loadTokenBalance]);

  const shouldShowApprove = () => {
    return isConnected && 
           isCorrectNetwork && 
           swapState.inputToken && 
           swapState.inputAmount && 
           parseFloat(swapState.inputAmount) > 0 &&
           swapState.quote && 
           !approvalState.isApproved &&
           swapState.inputToken.address !== 'NATIVE' &&
           swapState.inputToken.symbol !== 'BNB';
  };

  return {
    // State
    swapState,
    tokens,
    balances,
    approvalState,
    isCorrectNetwork,
    
    // Actions
    updateInputToken,
    updateOutputToken,
    updateInputAmount,
    updateSettings,
    flipTokens,
    switchToBSCMainnet,
    approveToken,
    executeSwap,
    getTokenPrice,
    checkApproval,
    loadCustomToken,
    addCustomToken,
    
    // Balance Actions
    loadTokenBalance,
    loadSelectedTokensBalances,
    loadVisibleTokensBalances
  };
}; 