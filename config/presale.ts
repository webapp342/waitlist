export const PRESALE_ADDRESSES = {
  presale: "0x7b0C62bb975FcB5cC7cCF76e37FB3235753410dF",
  saleToken: "0xbB7Adc4303857A388ba3BFb52fe977f696A2Ca72",
  usdt: "0x690419A4f1B5320c914f41b44CE10EB0BAC70908",
  busd: "0xD7D767dB964C36B41EfAABC02669169eDF513eAb"
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