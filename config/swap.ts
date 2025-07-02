// BSC Mainnet Swap Configuration
export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_MAINNET_CONFIG = {
  chainId: '0x38', // 56 in hex
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com']
};

// PancakeSwap Contract Addresses on BSC Mainnet
export const PANCAKESWAP_CONTRACTS = {
  ROUTER_V2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  FACTORY_V2: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
} as const;

// Default tokens for BSC Mainnet
export const DEFAULT_TOKENS = {
  BNB: {
    name: 'Binance Coin',
    symbol: 'BNB',
    address: 'NATIVE',
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: 'https://tokens.pancakeswap.finance/images/symbol/bnb.png'
  },
  CAKE: {
    name: 'PancakeSwap Token',
    symbol: 'CAKE',
    address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: 'https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png'
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: 'https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png'
  },
  BUSD: {
    name: 'Binance USD',
    symbol: 'BUSD',
    address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: 'https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png'
  },
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    decimals: 18,
    chainId: BSC_MAINNET_CHAIN_ID,
    logoURI: 'https://tokens.pancakeswap.finance/images/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d.png'
  }
} as const;

// PancakeSwap Token List URL
export const TOKEN_LIST_URL = 'https://tokens.pancakeswap.finance/pancakeswap-extended.json';

// Swap Settings
export const DEFAULT_SWAP_SETTINGS = {
  slippageTolerance: 0.5, // 0.5%
  deadline: 20, // 20 minutes
};

export const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0, 2.0, 5.0]; // %

// Router V2 ABI - minimal for swapping
export const ROUTER_V2_ABI = [
  // Read functions
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'WETH',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'pure',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// ERC20 ABI - minimal for approvals and balance
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

export const TOKENS = [
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    address: 'NATIVE',
    decimals: 18,
    logoURI: '/bnb.svg'
  },
  {
    symbol: 'BUSD',
    name: 'Binance USD',
    address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    decimals: 18,
    logoURI: '/busd.svg'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18,
    logoURI: '/usdt.svg'
  },
  {
    symbol: 'CAKE',
    name: 'PancakeSwap Token',
    address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    decimals: 18,
    logoURI: '/cake.svg'
  }
] as const; 