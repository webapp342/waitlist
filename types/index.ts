export interface Stake {
  amount: bigint;
  timestamp: bigint;
  rewardDebt: bigint;
  isActive: boolean;
  stakeId: bigint;
}

export interface BNBFeeInfo {
  stakingFeeBNB: string;
  unstakingFeeBNB: string;
  feeRecipient: string;
  totalBNBFeesCollected: string;
  maxFeeBNB: string;
}

export interface UserData {
  address: string;
  tokenBalance: string;
  stakedAmount: string;
  pendingRewards: string;
  stakes: Stake[];
  bnbBalance?: string;
  feeInfo?: BNBFeeInfo;
  minimumStakingPeriod?: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  loading: boolean;
  error: string;
}

export interface PaymentToken {
  token: string;
  priceUSD: bigint;
  enabled: boolean;
  decimals: number;
}

export interface PresaleInfo {
  saleTokenAddress: string;
  tokenPriceUSD: bigint;
  totalTokensSold: bigint;
  userTokensPurchased: bigint;
  isPaused: boolean;
}

export interface TokenPrices {
  bnb: number;
  usdt: number;
  busd: number;
} 