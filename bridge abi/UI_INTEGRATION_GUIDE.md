# UI Integration Guide - BSC ↔ Holesky Token Bridge

Bu rehber, frontend uygulamanızda token bridge sistemiyle etkileşim kurmanız için gerekli tüm bilgileri içerir.

## 🏗️ Temel Konfigürasyon

### Network Bilgileri

```javascript
const NETWORKS = {
  BSC_TESTNET: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },
  HOLESKY: {
    chainId: 17000,
    name: 'Holesky',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    blockExplorerUrl: 'https://holesky.etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  }
}
```

### Contract Adresleri

```javascript
const CONTRACTS = {
  BSC_TESTNET: {
    originalToken: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235', // Mevcut tokeniniz
    oftAdapter: '0xb3449e4d0380386986113018c2f54854E2BaB41E',   // Bridge adapter
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f' // LayerZero endpoint
  },
  HOLESKY: {
    bridgedToken: '0x0BD4Aa369abdD720e98037Fb25f09707Ba764019',  // bBSC token
    layerzeroEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f' // LayerZero endpoint
  }
}

// LayerZero Endpoint IDs
const ENDPOINT_IDS = {
  BSC_TESTNET: 40102,
  HOLESKY: 40217
}
```

### Token Bilgileri

```javascript
const TOKEN_INFO = {
  BSC_ORIGINAL: {
    address: '0x49EdC0FA13e650BC430D8bc23e4aaC6323B4f235',
    symbol: 'YOUR_TOKEN', // Kendi token sembolünüz
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
```

## 📝 Contract ABI'lar

### ERC20 ABI (BSC Testnet Token için)
```javascript
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]
```

### BSC OFT Adapter ABI (Ana Bridge Contract)
```javascript
const BSC_OFT_ADAPTER_ABI = [
  // Send function - BSC'den Holesky'e token göndermek için
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
          {"internalType": "bytes32", "name": "to", "type": "bytes32"},
          {"internalType": "uint256", "name": "amountLD", "type": "uint256"},
          {"internalType": "uint256", "name": "minAmountLD", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptions", "type": "bytes"},
          {"internalType": "bytes", "name": "composeMsg", "type": "bytes"},
          {"internalType": "bytes", "name": "oftCmd", "type": "bytes"}
        ],
        "internalType": "struct SendParam",
        "name": "_sendParam",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
          {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
        ],
        "internalType": "struct MessagingFee",
        "name": "_fee",
        "type": "tuple"
      },
      {"internalType": "address", "name": "_refundAddress", "type": "address"}
    ],
    "name": "send",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "guid", "type": "bytes32"},
          {"internalType": "uint64", "name": "nonce", "type": "uint64"},
          {
            "components": [
              {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
              {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
            ],
            "internalType": "struct MessagingFee",
            "name": "fee",
            "type": "tuple"
          }
        ],
        "internalType": "struct MessagingReceipt",
        "name": "msgReceipt",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "amountSentLD", "type": "uint256"},
          {"internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
        ],
        "internalType": "struct OFTReceipt",
        "name": "oftReceipt",
        "type": "tuple"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  // Quote function - gas tahmini için
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
          {"internalType": "bytes32", "name": "to", "type": "bytes32"},
          {"internalType": "uint256", "name": "amountLD", "type": "uint256"},
          {"internalType": "uint256", "name": "minAmountLD", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptions", "type": "bytes"},
          {"internalType": "bytes", "name": "composeMsg", "type": "bytes"},
          {"internalType": "bytes", "name": "oftCmd", "type": "bytes"}
        ],
        "internalType": "struct SendParam",
        "name": "_sendParam",
        "type": "tuple"
      },
      {"internalType": "bool", "name": "_payInLzToken", "type": "bool"}
    ],
    "name": "quoteSend",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
          {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
        ],
        "internalType": "struct MessagingFee",
        "name": "msgFee",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Token address getter
  {
    "inputs": [],
    "name": "token",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Approval required check
  {
    "inputs": [],
    "name": "approvalRequired",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "pure",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "guid", "type": "bytes32"},
      {"indexed": false, "internalType": "uint32", "name": "dstEid", "type": "uint32"},
      {"indexed": true, "internalType": "address", "name": "fromAddress", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountSentLD", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
    ],
    "name": "OFTSent",
    "type": "event"
  }
]
```

### Holesky OFT ABI (Hedef Chain Contract)
```javascript
const HOLESKY_OFT_ABI = [
  // Standard ERC20 functions
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Send function - Holesky'den BSC'ye token göndermek için
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
          {"internalType": "bytes32", "name": "to", "type": "bytes32"},
          {"internalType": "uint256", "name": "amountLD", "type": "uint256"},
          {"internalType": "uint256", "name": "minAmountLD", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptions", "type": "bytes"},
          {"internalType": "bytes", "name": "composeMsg", "type": "bytes"},
          {"internalType": "bytes", "name": "oftCmd", "type": "bytes"}
        ],
        "internalType": "struct SendParam",
        "name": "_sendParam",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
          {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
        ],
        "internalType": "struct MessagingFee",
        "name": "_fee",
        "type": "tuple"
      },
      {"internalType": "address", "name": "_refundAddress", "type": "address"}
    ],
    "name": "send",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "guid", "type": "bytes32"},
          {"internalType": "uint64", "name": "nonce", "type": "uint64"},
          {
            "components": [
              {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
              {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
            ],
            "internalType": "struct MessagingFee",
            "name": "fee",
            "type": "tuple"
          }
        ],
        "internalType": "struct MessagingReceipt",
        "name": "msgReceipt",
        "type": "tuple"
      },
      {
        "components": [
          {"internalType": "uint256", "name": "amountSentLD", "type": "uint256"},
          {"internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
        ],
        "internalType": "struct OFTReceipt",
        "name": "oftReceipt",
        "type": "tuple"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  // Quote function
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
          {"internalType": "bytes32", "name": "to", "type": "bytes32"},
          {"internalType": "uint256", "name": "amountLD", "type": "uint256"},
          {"internalType": "uint256", "name": "minAmountLD", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptions", "type": "bytes"},
          {"internalType": "bytes", "name": "composeMsg", "type": "bytes"},
          {"internalType": "bytes", "name": "oftCmd", "type": "bytes"}
        ],
        "internalType": "struct SendParam",
        "name": "_sendParam",
        "type": "tuple"
      },
      {"internalType": "bool", "name": "_payInLzToken", "type": "bool"}
    ],
    "name": "quoteSend",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
          {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
        ],
        "internalType": "struct MessagingFee",
        "name": "msgFee",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "guid", "type": "bytes32"},
      {"indexed": false, "internalType": "uint32", "name": "dstEid", "type": "uint32"},
      {"indexed": true, "internalType": "address", "name": "fromAddress", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountSentLD", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
    ],
    "name": "OFTSent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "guid", "type": "bytes32"},
      {"indexed": false, "internalType": "uint32", "name": "srcEid", "type": "uint32"},
      {"indexed": true, "internalType": "address", "name": "toAddress", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountReceivedLD", "type": "uint256"}
    ],
    "name": "OFTReceived",
    "type": "event"
  }
]
```

## 🔧 Ana Fonksiyonlar

### 1. Wallet Balance Alma

```javascript
import { ethers } from 'ethers'

async function getTokenBalance(provider, tokenAddress, userAddress) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const balance = await contract.balanceOf(userAddress)
  return ethers.utils.formatEther(balance)
}

// Kullanım
const bscBalance = await getTokenBalance(bscProvider, CONTRACTS.BSC_TESTNET.originalToken, userAddress)
const holeskyBalance = await getTokenBalance(holeskyProvider, CONTRACTS.HOLESKY.bridgedToken, userAddress)
```

### 2. Token Approval (Sadece BSC için)

```javascript
async function approveToken(signer, tokenAddress, spenderAddress, amount) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
  
  // Check current allowance
  const currentAllowance = await contract.allowance(await signer.getAddress(), spenderAddress)
  const amountWei = ethers.utils.parseEther(amount.toString())
  
  if (currentAllowance.lt(amountWei)) {
    const tx = await contract.approve(spenderAddress, amountWei)
    await tx.wait()
    return tx.hash
  }
  
  return null // Already approved
}
```

### 3. Bridge Quote (Gas Estimation)

```javascript
async function getBridgeQuote(provider, contractAddress, dstEid, amount, recipient, isAdapter = false) {
  // BSC için adapter ABI, Holesky için OFT ABI kullan
  const abi = isAdapter ? BSC_OFT_ADAPTER_ABI : HOLESKY_OFT_ABI
  const contract = new ethers.Contract(contractAddress, abi, provider)
  
  const sendParam = {
    dstEid: dstEid,
    to: ethers.utils.hexZeroPad(recipient, 32), // bytes32 format
    amountLD: ethers.utils.parseEther(amount.toString()),
    minAmountLD: ethers.utils.parseEther((amount * 0.95).toString()), // 5% slippage
    extraOptions: '0x00030100110100000000000000000000000000030d40', // Default options
    composeMsg: '0x',
    oftCmd: '0x'
  }
  
  const quote = await contract.quoteSend(sendParam, false)
  return {
    nativeFee: ethers.utils.formatEther(quote.nativeFee),
    sendParam
  }
}
```

### 4. Bridge Token Gönderme

```javascript
async function bridgeTokens(signer, contractAddress, sendParam, nativeFee, isAdapter = false) {
  // BSC için adapter ABI, Holesky için OFT ABI kullan
  const abi = isAdapter ? BSC_OFT_ADAPTER_ABI : HOLESKY_OFT_ABI
  const contract = new ethers.Contract(contractAddress, abi, signer)
  const userAddress = await signer.getAddress()
  
  const fee = {
    nativeFee: ethers.utils.parseEther(nativeFee),
    lzTokenFee: 0
  }
  
  const tx = await contract.send(sendParam, fee, userAddress, {
    value: fee.nativeFee
  })
  
  await tx.wait()
  return tx.hash
}
```

## 🎛️ Tam Bridge İşlemi

```javascript
class TokenBridge {
  constructor(bscProvider, holeskyProvider) {
    this.providers = {
      bsc: bscProvider,
      holesky: holeskyProvider
    }
  }
  
  async bridgeFromBSCToHolesky(signer, amount, recipient) {
    try {
      // 1. Approval (BSC'de gerekli)
      const approvalTx = await approveToken(
        signer,
        CONTRACTS.BSC_TESTNET.originalToken,
        CONTRACTS.BSC_TESTNET.oftAdapter,
        amount
      )
      
      if (approvalTx) {
        console.log('Approval tx:', approvalTx)
      }
      
      // 2. Quote alma
      const quote = await getBridgeQuote(
        this.providers.bsc,
        CONTRACTS.BSC_TESTNET.oftAdapter,
        ENDPOINT_IDS.HOLESKY,
        amount,
        recipient,
        true  // BSC adapter için true
      )
      
      // 3. Bridge işlemi
      const bridgeTx = await bridgeTokens(
        signer,
        CONTRACTS.BSC_TESTNET.oftAdapter,
        quote.sendParam,
        quote.nativeFee,
        true  // BSC adapter için true
      )
      
      return {
        approvalTx,
        bridgeTx,
        layerZeroUrl: `https://testnet.layerzeroscan.com/tx/${bridgeTx}`
      }
      
    } catch (error) {
      console.error('Bridge error:', error)
      throw error
    }
  }
  
  async bridgeFromHoleskyToBSC(signer, amount, recipient) {
    try {
      // 1. Quote alma
      const quote = await getBridgeQuote(
        this.providers.holesky,
        CONTRACTS.HOLESKY.bridgedToken,
        ENDPOINT_IDS.BSC_TESTNET,
        amount,
        recipient,
        false  // Holesky OFT için false
      )
      
      // 2. Bridge işlemi (Holesky'de approval gerektirmez)
      const bridgeTx = await bridgeTokens(
        signer,
        CONTRACTS.HOLESKY.bridgedToken,
        quote.sendParam,
        quote.nativeFee,
        false  // Holesky OFT için false
      )
      
      return {
        bridgeTx,
        layerZeroUrl: `https://testnet.layerzeroscan.com/tx/${bridgeTx}`
      }
      
    } catch (error) {
      console.error('Bridge error:', error)
      throw error
    }
  }
}
```

## 📱 React Hook Örneği

```javascript
import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'

export function useBridge() {
  const { account, library } = useWeb3React()
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(false)
  
  const bridge = new TokenBridge(bscProvider, holeskyProvider)
  
  const updateBalances = async () => {
    if (!account) return
    
    try {
      const [bscBalance, holeskyBalance] = await Promise.all([
        getTokenBalance(library, CONTRACTS.BSC_TESTNET.originalToken, account),
        getTokenBalance(library, CONTRACTS.HOLESKY.bridgedToken, account)
      ])
      
      setBalances({ bsc: bscBalance, holesky: holeskyBalance })
    } catch (error) {
      console.error('Balance update error:', error)
    }
  }
  
  const sendBridge = async (direction, amount, recipient) => {
    setLoading(true)
    try {
      const signer = library.getSigner()
      
      if (direction === 'bsc-to-holesky') {
        return await bridge.bridgeFromBSCToHolesky(signer, amount, recipient)
      } else {
        return await bridge.bridgeFromHoleskyToBSC(signer, amount, recipient)
      }
    } finally {
      setLoading(false)
      await updateBalances()
    }
  }
  
  useEffect(() => {
    updateBalances()
  }, [account])
  
  return {
    balances,
    loading,
    sendBridge,
    updateBalances
  }
}
```

## 🔄 Event Listening

```javascript
function listenToOFTEvents(provider, contractAddress, isAdapter = false) {
  const abi = isAdapter ? BSC_OFT_ADAPTER_ABI : HOLESKY_OFT_ABI
  const contract = new ethers.Contract(contractAddress, abi, provider)
  
  // Token gönderildi
  contract.on('OFTSent', (guid, dstEid, fromAddress, amountSent, amountReceived) => {
    console.log('Token sent:', {
      guid,
      dstEid,
      fromAddress,
      amountSent: ethers.utils.formatEther(amountSent),
      amountReceived: ethers.utils.formatEther(amountReceived)
    })
  })
  
  // Token alındı
  contract.on('OFTReceived', (guid, srcEid, toAddress, amountReceived) => {
    console.log('Token received:', {
      guid,
      srcEid,
      toAddress,
      amountReceived: ethers.utils.formatEther(amountReceived)
    })
  })
}
```

## 🛠️ Gerekli NPM Paketleri

```json
{
  "dependencies": {
    "ethers": "^5.7.2",
    "@web3-react/core": "^6.1.9",
    "@web3-react/injected-connector": "^6.0.7",
    "@web3-react/walletconnect-connector": "^6.2.13"
  }
}
```

## ⚠️ Önemli Notlar

1. **Network Switching**: Kullanıcının doğru network'te olduğundan emin olun
2. **Gas Fees**: Her işlem için yeterli native token (BNB/ETH) olduğunu kontrol edin
3. **Slippage**: Quote alırken %5 slippage ekledik, bunu kullanıcıya gösterebilirsiniz
4. **Error Handling**: Network hatalarını ve user rejection'larını handle edin
5. **Loading States**: İşlemler uzun sürebilir, loading state'leri gösterin

Bu bilgilerle artık tam fonksiyonel bir bridge UI'sı oluşturabilirsiniz! 🚀 