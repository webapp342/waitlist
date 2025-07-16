import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, formatEther, parseUnits, formatUnits, createPublicClient, http } from 'viem'
import { toast } from 'sonner'
import { bsc, mainnet } from 'wagmi/chains'

// LayerZero Endpoints
const LAYERZERO_ENDPOINTS = {
  bsc: "0x1a44076050125825900e736c501f859c50fE728c",
  ethereum: "0x1a44076050125825900e736c501f859c50fE728c"
};

// Token Information
const TOKEN_INFO = {
  name: "Wrapped BBLIP Token",
  symbol: "WBBLP",
  decimals: 18,
  bsc: {
    address: "0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235",
    type: "original"
  },
  ethereum: {
    address: "0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235", 
    type: "wrapped"
  }
};

// Network Configuration
const NETWORKS = {
  bsc: {
    chainId: 56,
    name: "BSC Mainnet",
    rpc: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com",
    endpointId: 30102
  },
  ethereum: {
    chainId: 1,
    name: "Ethereum Mainnet", 
    rpc: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    endpointId: 30101
  }
};

// Contract Addresses
const CONTRACTS = {
  bsc: {
    originalToken: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235' as `0x${string}`,
    oftAdapter: '0xA4333C39B6E2779BF7Ae286bC4f91E0dC6e199c3' as `0x${string}`,
  },
  ethereum: {
    bridgedToken: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235' as `0x${string}`,
  }
}

// ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// Bridge Contract ABI (simplified for main functions)
const BRIDGE_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
          { name: 'extraOptions', type: 'bytes' },
          { name: 'composeMsg', type: 'bytes' },
          { name: 'oftCmd', type: 'bytes' }
        ],
        name: '_sendParam',
        type: 'tuple'
      },
      { name: '_payInLzToken', type: 'bool' }
    ],
    name: 'quoteSend',
    outputs: [
      {
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' }
        ],
        name: 'msgFee',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
          { name: 'extraOptions', type: 'bytes' },
          { name: 'composeMsg', type: 'bytes' },
          { name: 'oftCmd', type: 'bytes' }
        ],
        name: '_sendParam',
        type: 'tuple'
      },
      {
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' }
        ],
        name: '_fee',
        type: 'tuple'
      },
      { name: '_refundAddress', type: 'address' }
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const

export type BridgeDirection = 'bsc-to-ethereum' | 'ethereum-to-bsc'

interface TokenBalances {
  bsc: string
  ethereum: string
}

interface BridgeQuote {
  nativeFee: string
  sendParam: any
}

// Create dedicated clients for each network
const bscClient = createPublicClient({
  chain: bsc,
  transport: http()
})

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

export function useBridge() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [balances, setBalances] = useState<TokenBalances>({ bsc: '0', ethereum: '0' })
  const [loading, setLoading] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [allowance, setAllowance] = useState('0')
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Get token balance using dedicated clients
  const getTokenBalance = useCallback(async (tokenAddress: `0x${string}`, userAddress: `0x${string}`, targetChainId: number) => {
    try {
      // Use appropriate client based on chain ID
      const client = targetChainId === NETWORKS.bsc.chainId ? bscClient : ethereumClient

      const balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      })

      return formatEther(balance as bigint)
    } catch (error) {
      console.error(`Balance fetch error for chain ${targetChainId}:`, error)
      return '0'
    }
  }, [])

  // Update balances from both networks simultaneously
  const updateBalances = useCallback(async () => {
    if (!address) return

    setBalanceLoading(true)
    try {
      // Fetch balances from both networks in parallel
      const [bscBalance, ethereumBalance] = await Promise.all([
        getTokenBalance(CONTRACTS.bsc.originalToken, address, NETWORKS.bsc.chainId),
        getTokenBalance(CONTRACTS.ethereum.bridgedToken, address, NETWORKS.ethereum.chainId)
      ])

      setBalances({ bsc: bscBalance, ethereum: ethereumBalance })
    } catch (error) {
      console.error('Balance update error:', error)
      // Set fallback values on error
      setBalances({ bsc: '0', ethereum: '0' })
    } finally {
      setBalanceLoading(false)
    }
  }, [address, getTokenBalance])

  // Check allowance for BSC token
  const checkAllowance = useCallback(async () => {
    if (!address || !publicClient || chainId !== NETWORKS.bsc.chainId) return

    try {
      const allowanceAmount = await publicClient.readContract({
        address: CONTRACTS.bsc.originalToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACTS.bsc.oftAdapter]
      })

      setAllowance(formatEther(allowanceAmount as bigint))
    } catch (error) {
      console.error('Allowance check error:', error)
    }
  }, [address, publicClient, chainId])

  // Approve token for bridge
  const approveToken = useCallback(async (amount: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')

    try {
      toast.info('Preparing approval...', {
        description: 'Please confirm token approval in your wallet'
      })

      const hash = await walletClient.writeContract({
        address: CONTRACTS.bsc.originalToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.bsc.oftAdapter, parseEther(amount)]
      })

      toast.info('Approval submitted!', {
        description: `Waiting for confirmation... ${hash.slice(0, 10)}...`
      })

      // Wait for approval transaction receipt
      const receipt = await bscClient.waitForTransactionReceipt({ 
        hash,
        timeout: 60000
      })

      if (receipt.status === 'success') {
        toast.success('Approval successful!', {
          description: 'Tokens approved for bridging'
        })
        
        // Update allowance after successful approval
        setTimeout(checkAllowance, 2000)
      } else {
        throw new Error('Approval transaction failed')
      }

      return hash
    } catch (error: any) {
      console.error('Approval error:', error)
      
      let errorMessage = 'Approval failed'
      let errorDescription = ''

      if (error.message?.includes('User rejected')) {
        errorMessage = 'Approval rejected'
        errorDescription = 'You cancelled the approval in your wallet'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds'
        errorDescription = 'Not enough BNB to pay for gas fees'
      } else {
        errorDescription = error.message || 'Transaction rejected'
      }

      toast.error(errorMessage, {
        description: errorDescription
      })
      throw error
    }
  }, [walletClient, address, checkAllowance])

  // Get bridge quote
  const getBridgeQuote = useCallback(async (direction: BridgeDirection, amount: string, recipient: string): Promise<BridgeQuote> => {
    if (!publicClient || !address) throw new Error('Client not available')

    const isFromBSC = direction === 'bsc-to-ethereum'
    const contractAddress = isFromBSC ? CONTRACTS.bsc.oftAdapter : CONTRACTS.ethereum.bridgedToken
    const dstEid = isFromBSC ? NETWORKS.ethereum.endpointId : NETWORKS.bsc.endpointId

    // Convert recipient address to bytes32
    const recipientBytes32 = `0x${'0'.repeat(24)}${recipient.slice(2)}` as `0x${string}`

    const sendParam = {
      dstEid,
      to: recipientBytes32,
      amountLD: parseEther(amount),
      minAmountLD: parseEther((parseFloat(amount) * 0.95).toString()), // 5% slippage
      extraOptions: '0x00030100110100000000000000000000000000030d40' as `0x${string}`,
      composeMsg: '0x' as `0x${string}`,
      oftCmd: '0x' as `0x${string}`
    }

    try {
      const quote = await publicClient.readContract({
        address: contractAddress,
        abi: BRIDGE_ABI,
        functionName: 'quoteSend',
        args: [sendParam, false]
      })

      const nativeFee = formatEther((quote as any).nativeFee)

      return {
        nativeFee,
        sendParam
      }
    } catch (error) {
      console.error('Quote error:', error)
      throw new Error('Failed to get bridge quote')
    }
  }, [publicClient, address])

  // Execute bridge transaction
  const executeBridge = useCallback(async (direction: BridgeDirection, amount: string, recipient: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected')

    setLoading(true)
    try {
      const targetChainId = direction === 'bsc-to-ethereum' ? NETWORKS.bsc.chainId : NETWORKS.ethereum.chainId
      
      // Check and switch network if needed
      if (chainId !== targetChainId) {
        await switchChain({ chainId: targetChainId as any })
        // Wait a bit for network switch
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // For BSC -> Ethereum, check approval first
      if (direction === 'bsc-to-ethereum') {
        const needsApproval = parseFloat(allowance) < parseFloat(amount)
        if (needsApproval) {
          await approveToken(amount)
          // Approval function now waits for receipt, so we can continue immediately
          await new Promise(resolve => setTimeout(resolve, 1000)) // Just a short delay for UI
        }
      }

      // Get quote
      setQuoting(true)
      const quote = await getBridgeQuote(direction, amount, recipient)
      setQuoting(false)

      const isFromBSC = direction === 'bsc-to-ethereum'
      const contractAddress = isFromBSC ? CONTRACTS.bsc.oftAdapter : CONTRACTS.ethereum.bridgedToken

      // Execute bridge transaction
      toast.info('Preparing bridge transaction...', {
        description: 'Please confirm in your wallet'
      })

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: BRIDGE_ABI,
        functionName: 'send',
        args: [
          quote.sendParam,
          { nativeFee: parseEther(quote.nativeFee), lzTokenFee: BigInt(0) },
          address
        ],
        value: parseEther(quote.nativeFee)
      })

      toast.info('Transaction submitted!', {
        description: `Waiting for confirmation... ${hash.slice(0, 10)}...`
      })

      // Wait for transaction receipt using publicClient
      const client = direction === 'bsc-to-ethereum' ? bscClient : ethereumClient
      const receipt = await client.waitForTransactionReceipt({ 
        hash,
        timeout: 60000 // 60 seconds timeout
      })

      if (receipt.status === 'success') {
        toast.success('Bridge transaction successful!', {
          description: `Tokens bridged successfully`,
          action: {
            label: 'View on LayerZero',
            onClick: () => window.open(`https://layerzeroscan.com/tx/${hash}`, '_blank')
          }
        })
      } else {
        throw new Error('Transaction failed on blockchain')
      }

      // Update balances after successful transaction
      setTimeout(updateBalances, 3000)

      return {
        hash,
        layerZeroUrl: `https://layerzeroscan.com/tx/${hash}`
      }

    } catch (error: any) {
      console.error('Bridge error details:', error)
      
      let errorMessage = 'Bridge transaction failed'
      let errorDescription = ''

      // Handle specific error types
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected'
        errorDescription = 'You cancelled the transaction in your wallet'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds'
        errorDescription = 'Not enough balance to pay for gas fees'
      } else if (error.message?.includes('ContractFunctionExecutionError')) {
        errorMessage = 'Contract execution failed'
        errorDescription = 'The bridge contract encountered an error. Please try again.'
      } else if (error.message?.includes('Internal JSON-RPC error')) {
        errorMessage = 'Network error'
        errorDescription = 'Please check your connection and try again'
      } else if (error.name === 'TimeoutError') {
        errorMessage = 'Transaction timeout'
        errorDescription = 'Transaction took too long to confirm. Please check your wallet.'
      } else {
        errorDescription = error.message || 'Unknown error occurred'
      }

      toast.error(errorMessage, {
        description: errorDescription
      })
      
      throw error
    } finally {
      setLoading(false)
      setQuoting(false)
    }
  }, [walletClient, address, chainId, switchChain, allowance, approveToken, getBridgeQuote, updateBalances])

  // Effects
  useEffect(() => {
    updateBalances()
  }, [updateBalances])

  useEffect(() => {
    if (chainId === NETWORKS.bsc.chainId) {
      checkAllowance()
    }
  }, [checkAllowance, chainId])

  return {
    balances,
    loading,
    quoting,
    allowance,
    balanceLoading,
    executeBridge,
    updateBalances,
    getBridgeQuote,
    approveToken,
    chainId,
    networks: NETWORKS,
    contracts: CONTRACTS
  }
} 