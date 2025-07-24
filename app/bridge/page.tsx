'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { ArrowUpDown, Zap, AlertCircle, RefreshCw, ExternalLink, Network, ArrowRight, Info, TrendingUp, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/header'
import Particles from '@/components/ui/particles'
import WalletModal from '@/components/WalletModal'
import Image from 'next/image'
import { useBridge, type BridgeDirection } from '@/hooks/useBridge'

function BridgeContent() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const {
    balances,
    loading,
    quoting,
    allowance,
    balanceLoading,
    executeBridge,
    updateBalances,
    getBridgeQuote,
    networks,
    contracts
  } = useBridge()

  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<BridgeDirection>('bsc-to-ethereum')
  const [recipient, setRecipient] = useState('')
  const [quote, setQuote] = useState<{ nativeFee: string } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const isFromBSC = direction === 'bsc-to-ethereum'
  const fromNetwork = isFromBSC ? 'BSC Mainnet' : 'Ethereum Mainnet'
  const toNetwork = isFromBSC ? 'Ethereum Mainnet' : 'BSC Mainnet'
  const fromBalance = isFromBSC ? balances.bsc : balances.ethereum
  const requiredChainId = isFromBSC ? networks.bsc.chainId : networks.ethereum.chainId
  const isCorrectNetwork = chainId === requiredChainId



  // Initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Auto-fill recipient with connected address
  useEffect(() => {
    if (address && !recipient) {
      setRecipient(address)
    }
  }, [address, recipient])

  // Get quote when amount changes
  useEffect(() => {
    if (amount && recipient && parseFloat(amount) > 0) {
      const getQuote = async () => {
        try {
          setQuoteLoading(true)
          const quoteResult = await getBridgeQuote(direction, amount, recipient)
          setQuote({ nativeFee: quoteResult.nativeFee })
        } catch (error) {
          console.error('Quote error:', error)
          setQuote(null)
        } finally {
          setQuoteLoading(false)
        }
      }

      const timer = setTimeout(getQuote, 500) // Debounce
      return () => clearTimeout(timer)
    } else {
      setQuote(null)
    }
  }, [amount, recipient, direction, getBridgeQuote])

  const switchDirection = () => {
    setDirection(direction === 'bsc-to-ethereum' ? 'ethereum-to-bsc' : 'bsc-to-ethereum')
    setAmount('')
    setQuote(null)
  }

  const setMaxAmount = () => {
    setAmount(fromBalance)
  }

  const handleBridge = async () => {
    if (!amount || !recipient) {
      toast.error('Please fill all fields')
      return
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    if (parseFloat(amount) > parseFloat(fromBalance)) {
      toast.error('Insufficient balance')
      return
    }

    // Show confirmation modal first
    setShowConfirmModal(true)
  }

  const confirmBridge = async () => {
    setShowConfirmModal(false)
    
    try {
      const result = await executeBridge(direction, amount, recipient)
      toast.success('Bridge successful!', {
        description: `Transaction: ${result.hash.slice(0, 10)}...`,
        action: {
          label: 'View on LayerZero',
          onClick: () => window.open(result.layerZeroUrl, '_blank')
        }
      })
      setAmount('')
      setQuote(null)
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  const needsApproval = isFromBSC && parseFloat(allowance) < parseFloat(amount || '0')
  const hasEnoughBalance = parseFloat(amount || '0') <= parseFloat(fromBalance)

  // Handle chain switching
  const handleSwitchChain = async () => {
    if (!switchChain) return
    
    try {
      setIsSwitchingChain(true)
      await switchChain({ chainId: requiredChainId as any })
    } catch (err: any) {
      console.error('Failed to switch chain:', err)
      toast.error('Failed to switch network', {
        description: err.message || 'Please switch manually in your wallet'
      })
    } finally {
      setIsSwitchingChain(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
          <Header />
          <div className="flex items-center justify-center py-20 mt-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
              <Image 
                src="/logo.svg" 
                alt="BBLP" 
                width={32} 
                height={32} 
                className="absolute inset-0 m-auto animate-pulse" 
              />
            </div>
          </div>
        </section>
        <Particles
          quantityDesktop={80}
          quantityMobile={30}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
    )
  }

  return (
    <>
  
      <main className="flex min-h-screen flex-col items-center overflow-x-clip ">
      <Header />

        <div className="container mx-auto px-4 pt-20 sm:px-6 lg:px-8 max-w-2xl">
          
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-2">
              BBLP Bridge
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Bridge tokens between <span className="text-yellow-200 font-semibold">BSC Mainnet</span> and <span className="text-yellow-200 font-semibold">Ethereum Mainnet</span>
            </p>
          </div>



          {/* Main Bridge Card */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-800 px-4 py-6 md:p-8 mb-6 shadow-xl transition-all duration-300">
            
            {/* Bridge Overview Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                <ArrowUpDown className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Bridge Overview</h2>
                <p className="text-xs text-gray-500">Cross-chain token transfer</p>
              </div>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Image src="/bnb.svg" alt="BSC" width={18} height={18} />
                  <p className="text-xs text-gray-500">BSC Mainnet</p>
                </div>
                {balanceLoading ? (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
                    <p className="text-lg md:text-2xl font-bold text-gray-400">Loading...</p>
                  </div>
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-white mb-1">{parseFloat(balances.bsc).toFixed(6)}</p>
                )}
                <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="BBLP" width={16} height={16} />
                    <p className="text-xs md:text-sm text-gray-400">BBLP</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-3 md:p-6 rounded-xl md:rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Image src="/eth.png" alt="Ethereum" width={18} height={18} className="rounded-full" />
                  <p className="text-xs text-gray-500">ETH Mainnet</p>
                </div>
                {balanceLoading ? (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
                    <p className="text-lg md:text-2xl font-bold text-gray-400">Loading...</p>
                  </div>
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-white mb-1">{parseFloat(balances.ethereum).toFixed(6)}</p>
                )}
                <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="WBBLP" width={16} height={16} />
                    <p className="text-xs md:text-sm text-gray-400">WBBLP</p>
                </div>
              </div>
            </div>

                      {/* Bridge Direction - Always Active */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Bridge Direction</label>
              <button
                onClick={switchDirection}
                className="flex items-center gap-2 text-xs text-yellow-200 hover:text-yellow-300 transition-colors"
              >
                <ArrowUpDown className="w-3 h-3" />
                Switch
              </button>
            </div>
            
            <div className="p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-between gap-4 mb-8 shadow-lg">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Image src={isFromBSC ? "/bnb.svg" : "/eth.png"} alt={isFromBSC ? "BNB" : "ETH"} width={22} height={22} className="" />
                  <span className="text-sm md:text-base font-semibold text-white">{isFromBSC ? 'BSC Mainnet' : 'ETH Mainnet'}</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <ArrowRight className="w-7 h-7 text-yellow-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 4px #facc15)' }} />
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Image src={!isFromBSC ? "/bnb.svg" : "/eth.png"} alt={!isFromBSC ? "BNB" : "ETH"} width={22} height={22} className="" />
                  <span className="text-sm md:text-base font-semibold text-white">{!isFromBSC ? 'BSC Mainnet' : 'ETH Mainnet'}</span>
                </div>
              </div>
            </div>
            
            {/* Direction info */}
            {isConnected && !isCorrectNetwork && (
              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Info className="w-4 h-4" />
                  You&apos;ll need to switch to {fromNetwork} network to complete this bridge
                </div>
              </div>
            )}
          </div>

            {/* Amount Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Amount to Bridge</label>
                <button
                  onClick={setMaxAmount}
                  className="text-xs text-yellow-200 hover:text-yellow-300 transition-colors"
                  disabled={loading || balanceLoading}
                >
                  {balanceLoading ? 'Loading...' : `Use Max: ${parseFloat(fromBalance).toFixed(6)}`}
                </button>
              </div>
              
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="^[0-9]*[.,]?[0-9]*$"
                  placeholder="0.0"
                  value={amount}
                  onChange={e => {
                    let value = e.target.value.replace(',', '.');
                    // Only allow numbers and decimals
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      // Only allow values >= 0.1
                      if (value === '' || parseFloat(value) >= 0.1) {
                        setAmount(value);
                      } else {
                        setAmount('');
                      }
                    }
                  }}
                  className="h-12 md:h-14 text-lg font-semibold bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 pr-20 rounded-xl appearance-none"
                  disabled={loading}
                  min="0.1"
                  step="any"
                  autoComplete="off"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Image src="/logo.svg" alt="Token" width={16} height={16} />
                  <span className="text-sm text-gray-400">{isFromBSC ? 'BBLP' : 'WBBLP'}</span>
                </div>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Recipient Address</label>
                <button
                  onClick={() => setRecipient(address || '')}
                  className="text-xs text-yellow-200 hover:text-yellow-300 transition-colors"
                >
                  Use My Address
                </button>
              </div>
              
              <Input
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="h-12 font-mono bg-black/60 border-yellow-400/10 text-white placeholder:text-gray-500 rounded-xl"
                disabled={loading}
              />
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mb-6 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-400/10 border border-green-400/20">
                    <Info className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Bridge Quote</h3>
                    <p className="text-xs text-gray-500">Estimated fees and slippage</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <p className="text-xs text-gray-400 font-medium">LayerZero Fee</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-blue-400 mb-1">
                      {parseFloat(quote.nativeFee).toFixed(6)} {isFromBSC ? 'BNB' : 'ETH'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <p className="text-xs text-gray-400 font-medium">You&apos;ll Receive</p>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-yellow-400 mb-1">
                      ≈ {amount ? (parseFloat(amount) * 0.95).toFixed(6) : '0.0'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Bridge Button */}
            {!isConnected ? (
              <Button
                className={cn(
                  "w-full h-12 md:h-14 font-semibold text-black",
                  "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400",
                  "hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300",
                  "shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40",
                  "transition-all duration-300 transform hover:scale-[1.02]"
                )}
                size="lg"
                onClick={() => setShowWalletModal(true)}
              >
                <div className="flex items-center justify-center w-full gap-2">
                  <span className="text-sm md:text-base">Connect Wallet</span>
                </div>
              </Button>
            ) : !isCorrectNetwork ? (
              <Button
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                className={cn(
                  "w-full h-12 md:h-14 font-semibold text-white",
                  "bg-gradient-to-r from-orange-500 to-red-500",
                  "hover:from-orange-600 hover:to-red-600",
                  "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
                  "transition-all duration-300 transform hover:scale-[1.02]"
                )}
                size="lg"
              >
                {isSwitchingChain ? (
                  <div className="flex items-center justify-center w-full gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm md:text-base">Switching Network...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full gap-2">
                    <Network className="w-4 h-4" />
                    <span className="text-sm md:text-base">Switch to {fromNetwork}</span>
                  </div>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleBridge}
                  disabled={!amount || parseFloat(amount) <= 0 || loading || !hasEnoughBalance || quoteLoading || !recipient}
                  className={cn(
                    "w-full h-12 md:h-14 font-semibold transition-all duration-200",
                    hasEnoughBalance && amount && recipient && parseFloat(amount) > 0
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black"
                      : "bg-zinc-800 text-zinc-400 cursor-not-allowed hover:bg-zinc-800"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : quoteLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Getting Quote...</span>
                    </div>
                  ) : !amount || parseFloat(amount) <= 0 ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Enter Amount</span>
                    </div>
                  ) : !recipient ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Enter Recipient</span>
                    </div>
                  ) : !hasEnoughBalance ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Insufficient Balance</span>
                    </div>
                  ) : needsApproval ? (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Approve & Bridge</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Bridge Tokens</span>
                    </div>
                  )}
                </Button>

                {/* Refresh Balance */}
                <Button
                  variant="ghost"
                  onClick={updateBalances}
                  className="w-full mt-3 text-gray-400 hover:text-white"
                  disabled={loading || balanceLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", balanceLoading && "animate-spin")} />
                  {balanceLoading ? 'Refreshing...' : 'Refresh Balances'}
                </Button>
              </>
            )}
          </div>

          {/* Secured by */}
          <div className="flex text-center justify-center items-center gap-2 mt-2 mb-8">
            <span className="text-xs text-gray-400">Powered by</span>
            <a 
              href="https://layerzero.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-xs"
            >
              LayerZero
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Bridge Details Accordion */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden mb-6 shadow-xl">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                  <Info className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Bridge Details</h3>
                  <p className="text-xs text-gray-500">Bridge information and terms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden md:inline">
                  {showDetails ? 'Hide' : 'Show'}
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
            
            {showDetails && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-zinc-700">
                <div className="space-y-4 pt-4 md:pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-green-400/10 border border-green-400/20 mt-0.5">
                        <Clock className="w-3 h-3 text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Bridge Time</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">~2-5 minutes cross-chain transfer</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 mt-0.5">
                        <Shield className="w-3 h-3 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Security</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Secured by LayerZero protocol</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-purple-400/10 border border-purple-400/20 mt-0.5">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Slippage</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">5% maximum slippage protection</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30">
                      <div className="p-1.5 rounded-lg bg-orange-400/10 border border-orange-400/20 mt-0.5">
                        <Network className="w-3 h-3 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Networks</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">BSC Mainnet ↔ Ethereum Mainnet</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Particles
          quantityDesktop={150}
          quantityMobile={50}
          ease={120}
          color={"#F7FF9B"}
          refresh
        />
      </main>
      
      {/* Bridge Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ArrowUpDown className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm Bridge Transaction</h3>
              <p className="text-gray-400 text-sm">Please review your bridge details</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">From</span>
                  <div className="flex items-center gap-2">
                    <Image 
                      src={isFromBSC ? "/bnb.svg" : "/eth.png"} 
                      alt={isFromBSC ? "BNB" : "ETH"} 
                      width={16} 
                      height={16}
                      className={!isFromBSC ? "rounded-full" : ""}
                    />
                    <span className="text-gray-400 text-sm">{fromNetwork}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{parseFloat(amount || '0').toFixed(6)} {isFromBSC ? 'WBBLP' : 'WBBLP'}</div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4 text-zinc-400" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">To</span>
                  <div className="flex items-center gap-2">
                    <Image 
                      src={!isFromBSC ? "/bnb.svg" : "/eth.png"} 
                      alt={!isFromBSC ? "BNB" : "ETH"} 
                      width={16} 
                      height={16}
                      className={isFromBSC ? "rounded-full" : ""}
                    />
                    <span className="text-gray-400 text-sm">{toNetwork}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-400">{parseFloat(amount || '0').toFixed(6)} {!isFromBSC ? 'WBBLP' : 'WBBLP'}</div>
              </div>

              {quote && (
                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Bridge Fee</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-orange-400">{parseFloat(quote.nativeFee).toFixed(6)} ETH</div>
                      <div className="text-xs text-gray-500">LayerZero Fee</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Recipient</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-400 font-mono">{recipient.slice(0, 6)}...{recipient.slice(-4)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBridge}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Bridging...
                  </div>
                ) : (
                  'Confirm Bridge'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Modal */}
      <WalletModal 
        open={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </>
  )
}

export default function BridgePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-200"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <BridgeContent />
    </Suspense>
  )
} 