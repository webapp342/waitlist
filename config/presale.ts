export const PRESALE_ADDRESSES = {
  presale: "0x9CaA07D1Dfd324C60D2da82E7aB46D6f42ceeeBd",
  saleToken: "0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235",
  usdt: "0x55d398326f99059fF775485246999027B3197955",
  busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
} as const;

export const TOKEN_IDS = {
  eth: 3,
  bnb: 0,
  usdt: 1,
  busd: 2
} as const;

export const NETWORK_CONFIG = {
  chainId: 56, // BSC Mainnet
  rpcUrl: "https://bsc-dataseed.binance.org/",
  name: "BSC Mainnet"
} as const; 