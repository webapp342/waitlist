export const PRESALE_ADDRESSES = {
  presale: "0xBe3A99DD9B9677B90288b2fE9796e99D1B3a7e5a",
  saleToken: "0x65D25C1e3BD1D64a42E4Cc729695A7EfB1632a1C",
  usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
  busd: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee"
} as const;

export const TOKEN_IDS = {
  bnb: 0,
  usdt: 1,
  busd: 2
} as const;

export const NETWORK_CONFIG = {
  chainId: 97, // BSC Testnet
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
  name: "BSC Testnet"
} as const; 