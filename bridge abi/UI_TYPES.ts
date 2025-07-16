// TypeScript Types for Bridge UI Integration

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  blockExplorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export interface ContractAddresses {
  BSC_TESTNET: {
    originalToken: string
    oftAdapter: string
    layerzeroEndpoint: string
  }
  HOLESKY: {
    bridgedToken: string
    layerzeroEndpoint: string
  }
}

export interface TokenInfo {
  address: string
  symbol: string
  decimals: number
  name: string
}

export interface SendParam {
  dstEid: number
  to: string // bytes32 format
  amountLD: string // BigNumber as string
  minAmountLD: string // BigNumber as string
  extraOptions: string
  composeMsg: string
  oftCmd: string
}

export interface MessagingFee {
  nativeFee: string
  lzTokenFee: string
}

export interface BridgeQuote {
  nativeFee: string
  sendParam: SendParam
}

export interface BridgeResult {
  approvalTx?: string
  bridgeTx: string
  layerZeroUrl: string
}

export interface TokenBalances {
  bsc: string
  holesky: string
}

export interface OFTEvent {
  guid: string
  eid: number
  address: string
  amount: string
}

export type BridgeDirection = 'bsc-to-holesky' | 'holesky-to-bsc'

export interface BridgeHookReturn {
  balances: TokenBalances
  loading: boolean
  sendBridge: (direction: BridgeDirection, amount: number, recipient: string) => Promise<BridgeResult>
  updateBalances: () => Promise<void>
}

// Network ve contract konfigürasyonları
export const NETWORKS: Record<string, NetworkConfig> = {
  BSC_TESTNET: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
  },
  HOLESKY: {
    chainId: 17000,
    name: 'Holesky',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    blockExplorerUrl: 'https://holesky.etherscan.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }
}

export const CONTRACTS: ContractAddresses = {
  BSC_TESTNET: {
    originalToken: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235',
    oftAdapter: '0xb3449e4d0380386986113018c2f54854E2BaB41E',
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  },
  HOLESKY: {
    bridgedToken: '0x0BD4Aa369abdD720e98037Fb25f09707Ba764019',
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
  }
}

export const ENDPOINT_IDS = {
  BSC_TESTNET: 40102,
  HOLESKY: 40217
} as const

export const TOKEN_INFO: Record<string, TokenInfo> = {
  BSC_ORIGINAL: {
    address: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235',
    symbol: 'YOUR_TOKEN', // Kendi token sembolünüzü buraya yazın
    decimals: 18,
    name: 'Your Token Name'
  },
  HOLESKY_BRIDGED: {
    address: '0x0BD4Aa369abdD720e98037Fb25f09707Ba764019',
    symbol: 'bBSC',
    decimals: 18,
    name: 'Bridged BSC Token'
  }
} 