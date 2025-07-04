export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
  balance?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  minimumAmountOut: string;
  route: string[];
  gasEstimate?: string;
}

export interface SwapTransaction {
  to: string;
  value: string;
  data: string;
  gasLimit: string;
}

export interface SwapSettings {
  slippageTolerance: number; // 0.1 = 0.1%
  deadline: number; // minutes
  gasPrice?: string;
}

export interface SwapState {
  inputToken: Token | null;
  outputToken: Token | null;
  inputAmount: string;
  outputAmount: string;
  inputUSDValue: string;
  outputUSDValue: string;
  isLoading: boolean;
  error: string | null;
  quote: SwapQuote | null;
  settings: SwapSettings;
}

export interface TokenListResponse {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: Token[];
}

export enum SwapError {
  INSUFFICIENT_BALANCE = 'Insufficient balance',
  INSUFFICIENT_LIQUIDITY = 'Insufficient liquidity',
  EXCESSIVE_SLIPPAGE = 'Excessive slippage',
  INVALID_AMOUNT = 'Invalid amount',
  APPROVAL_REQUIRED = 'Approval required',
  NETWORK_ERROR = 'Network error',
  UNKNOWN_ERROR = 'Unknown error'
}

export interface ApprovalState {
  isApproved: boolean;
  isApproving: boolean;
  approvalHash?: string;
} 