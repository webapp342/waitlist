import { http, createConfig } from 'wagmi'
import { 
  bscTestnet,
  bsc, 
  mainnet, 
  arbitrum, 
  polygon, 
  avalanche,
  optimism,
  base,
  linea,
  scroll,
  fantom,
  celo,
  gnosis,
  zkSync,
  moonbeam,
  moonriver,
  cronos,
  mantle,
  blast,
  metis,
  aurora,
  harmonyOne,
  klaytn,
  polygonZkEvm,
  arbitrumNova,
  coreDao,
  telos,
  zetachain,
  manta,
  mode,
  kava,
  fuse,
  okc,
  meter,
  wanchain,
  boba,
  syscoin,
  ronin,
  holesky,
  sepolia,
  scrollSepolia,
  lineaTestnet,
  polygonMumbai,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji,
  fantomTestnet,
  celoAlfajores,
  gnosisChiado,
  mantleTestnet,
  blastSepolia,
} from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '8854ffe902172613202b1442500a8f1e'

// Debug log to check if projectId is loaded
if (typeof window === 'undefined') {
  console.log('🔧 Wagmi Config Loading...')
  console.log('📋 Project ID:', projectId ? 'Found' : 'Missing')
}

// BSC Mainnet Configuration
export const BSC_MAINNET_CHAIN_ID = '0x38'; // 56 in hex
export const BSC_MAINNET_CONFIG = {
  chainId: BSC_MAINNET_CHAIN_ID,
  chainName: 'BSC Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed1.binance.org'],
  blockExplorerUrls: ['https://bscscan.com']
};

// Define chains with BSC Mainnet as primary
const chains = [
  bsc,
  bscTestnet,
  mainnet,
  arbitrum,
  polygon,
  avalanche,
  optimism,
  base,
  linea,
  scroll,
  fantom,
  celo,
  gnosis,
  zkSync,
  moonbeam,
  moonriver,
  cronos,
  mantle,
  blast,
  metis,
  aurora,
  harmonyOne,
  klaytn,
  polygonZkEvm,
  arbitrumNova,
  coreDao,
  telos,
  zetachain,
  manta,
  mode,
  kava,
  fuse,
  okc,
  meter,
  wanchain,
  boba,
  syscoin,
  ronin,
  holesky,
  sepolia,
  scrollSepolia,
  lineaTestnet,
  polygonMumbai,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji,
  fantomTestnet,
  celoAlfajores,
  gnosisChiado,
  mantleTestnet,
  blastSepolia,
] as const;

// Create transports for all chains
const transports = chains.reduce((acc, chain) => {
  acc[chain.id] = http();
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const config = createConfig({
  chains,
  connectors: [
    injected({
      // This enables detection of chains not in our config
      shimDisconnect: true,
    }),
    walletConnect({ 
      projectId,
      metadata: {
        name: 'Bblip Labs',
        description: 'Spend Any Crypto, Anywhere',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://bblip.io',
        icons: [
          typeof window !== 'undefined' ? `${window.location.origin}/bblip-logo.svg` : 'https://bblip.io/bblip-logo.svg',
          typeof window !== 'undefined' ? `${window.location.origin}/logo.svg` : 'https://bblip.io/logo.svg'
        ]
      }
    }),
  ],
  transports,
  // Enable multi injected provider discovery
  multiInjectedProviderDiscovery: true,
})

// Debug log to verify config is created
if (typeof window === 'undefined') {
  console.log('✅ Wagmi Config Created:', config ? 'Success' : 'Failed')
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
} 