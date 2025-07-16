export interface Stake {
  amount: bigint;
  timestamp: bigint;
  rewardDebt: bigint;
  isActive: boolean;
  stakeId: bigint;
}

export interface BNBFeeInfo {
  stakingFeeBNB: string; // Actually BNB or ETH depending on network
  unstakingFeeBNB: string; // Actually BNB or ETH depending on network
  feeRecipient: string;
  totalBNBFeesCollected: string; // Actually BNB or ETH depending on network
  maxFeeBNB: string; // Actually BNB or ETH depending on network
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
  priceFeed: string;
  enabled: boolean;
  decimals: number;
  useStaticPrice: boolean;
  staticPriceUSD: bigint;
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