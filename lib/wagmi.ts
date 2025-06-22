import { http, createConfig } from 'wagmi'
import { 
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
  bscTestnet,
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

// Define all chains - both mainnet and testnet
const chains = [
  // Mainnets
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
  // Testnets
  holesky,
  sepolia,
  bscTestnet,
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
    walletConnect({ projectId }),
  ],
  transports,
  // Enable multi injected provider discovery
  multiInjectedProviderDiscovery: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
} 