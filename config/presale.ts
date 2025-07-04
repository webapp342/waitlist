export const PRESALE_ADDRESSES = {
  presale: "0x7B76a6311259f1b455d41C81320A1471d446A06D",
  saleToken: "0x38f5e5902AA2FC1170653f764D5C0A79C7c0a254",
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