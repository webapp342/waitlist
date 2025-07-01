"use client";

import { motion } from 'framer-motion'
import { 
  Coins, 
  Lock, 
  Flame, 
  Users, 
  Award,
  TrendingUp,
  Shield,
  Zap,
  ChartPie,
  ArrowLeft,
  BarChart3,
  Download,
  ExternalLink,
  Target,
  DollarSign,
  Calendar,
  Percent
} from 'lucide-react'
import Container from '@/components/container'
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { useState } from 'react'

interface TokenAllocation {
  name: string;
  percentage: number;
  color: string;
  description: string;
  vestingSchedule?: string;
  lockPeriod?: string;
}

const tokenAllocations: TokenAllocation[] = [
  {
    name: 'Community & Rewards',
    percentage: 35,
    color: '#F7FF9B',
    description: 'Staking rewards, referral incentives, and community growth programs',
    vestingSchedule: 'Linear over 4 years',
    lockPeriod: 'No lock period'
  },
  {
    name: 'Liquidity & Exchange',
    percentage: 25,
    color: '#FFD93D',
    description: 'DEX liquidity pools and CEX listing reserves',
    vestingSchedule: 'Immediate release',
    lockPeriod: 'No lock period'
  },
  {
    name: 'Team & Development',
    percentage: 25,
    color: '#FFA500',
    description: 'Core team allocation with vesting schedule',
    vestingSchedule: 'Linear after 12-month cliff',
    lockPeriod: '12 months'
  },
  {
    name: 'Treasury & Public',
    percentage: 15,
    color: '#FF6B35',
    description: 'Presale, public sale, and treasury reserves',
    vestingSchedule: 'Controlled release',
    lockPeriod: 'Based on sale phase'
  }
]

const utilities = [
  {
    icon: Shield,
    title: 'Governance',
    description: 'Vote on protocol upgrades and treasury allocations',
    details: 'Token holders can propose and vote on key protocol decisions including parameter changes, treasury spending, and future development directions.'
  },
  {
    icon: Coins,
    title: 'Staking Rewards',
    description: 'Earn up to 25% APY by staking your tokens',
    details: 'Stake tokens to secure the network and earn rewards. Higher stake amounts and longer lock periods provide better rewards.'
  },
  {
    icon: Flame,
    title: 'Burn Mechanism',
    description: '2% of all transactions burned automatically',
    details: 'Deflationary mechanism that removes tokens from circulation permanently, creating scarcity and potential value appreciation.'
  },
  {
    icon: Award,
    title: 'Referral System',
    description: '5-tier referral program with up to 10% rewards',
    details: 'Multi-level referral system allowing users to earn from their network. Higher tiers unlock better rewards and bonuses.'
  },
  {
    icon: Users,
    title: 'Revenue Sharing',
    description: '30% of protocol fees distributed to holders',
    details: 'Passive income through protocol fee sharing. Distributed proportionally to all token holders based on their stake.'
  },
  {
    icon: Zap,
    title: 'Gas Optimization',
    description: 'Reduced fees for token holders',
    details: 'Token holders enjoy discounted transaction fees and priority processing for their transactions.'
  }
]

const metrics = [
  { label: 'Total Supply', value: '220,000,000', suffix: 'BBLIP' },
  { label: 'Presale Price', value: '$0.08', suffix: 'per token' },
  { label: 'Initial Circulating Supply', value: '12%', suffix: 'of total' },
  { label: 'Burn Rate', value: '2%', suffix: 'per transaction' },
  { label: 'Maximum Staking APY', value: '25%', suffix: 'annually' },
  { label: 'Revenue Share', value: '30%', suffix: 'of protocol fees' },
  { label: 'Referral Tiers', value: '5', suffix: 'reward levels' },
  { label: 'Market Cap (Presale)', value: '$17.6M', suffix: 'at presale price' }
]

export default function TokenomicsPage() {
  const [viewMode, setViewMode] = useState<'chart' | 'bars'>('chart')
  const [selectedAllocation, setSelectedAllocation] = useState<number | null>(null)

  // Calculate pie chart segments
  let cumulativePercentage = 0
  const segments = tokenAllocations.map((allocation, index) => {
    const startAngle = (cumulativePercentage * 360) / 100
    cumulativePercentage += allocation.percentage
    const endAngle = (cumulativePercentage * 360) / 100
    
    const startAngleRad = (startAngle - 90) * (Math.PI / 180)
    const endAngleRad = (endAngle - 90) * (Math.PI / 180)
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    const x1 = 200 + 160 * Math.cos(startAngleRad)
    const y1 = 200 + 160 * Math.sin(startAngleRad)
    const x2 = 200 + 160 * Math.cos(endAngleRad)
    const y2 = 200 + 160 * Math.sin(endAngleRad)
    
    return {
      path: `M 200 200 L ${x1} ${y1} A 160 160 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      ...allocation,
      index
    }
  })

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-20">
        <Container size="lg">
          {/* Breadcrumb */}
        

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
              <ChartPie className="w-4 h-4 text-yellow-200" />
              <span className="text-sm text-yellow-200 font-medium">Full Tokenomics</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              BBLIP Token
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600"> Economics</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-8">
              Comprehensive breakdown of BBLIP's 220 million token distribution, utility mechanisms, 
              and economic design principles for sustainable growth
            </p>

            {/* Download Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300">
                <Download className="w-4 h-4" />
                Download Whitepaper
              </button>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-yellow-400/30 text-yellow-200 font-semibold rounded-full hover:bg-yellow-400/10 transition-all duration-300">
                <ExternalLink className="w-4 h-4" />
                Audit Report
              </button>
            </div>
          </motion.div>

          {/* Key Metrics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-4 text-center hover:border-yellow-400/30 transition-all duration-200"
              >
                <p className="text-xs text-zinc-400 mb-1">{metric.label}</p>
                <p className="text-lg md:text-xl font-bold text-yellow-200">{metric.value}</p>
                {metric.suffix && <p className="text-xs text-zinc-500">{metric.suffix}</p>}
              </div>
            ))}
          </motion.div>

          {/* Token Distribution Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Token Distribution</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Fair and transparent allocation of 220 million BBLIP tokens designed to support long-term ecosystem growth
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex justify-center mb-8">
              <div className="flex bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${viewMode === 'chart' 
                      ? 'bg-yellow-400 text-black' 
                      : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  <ChartPie className="w-4 h-4 mr-2 inline" />
                  Pie Chart
                </button>
                <button
                  onClick={() => setViewMode('bars')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${viewMode === 'bars' 
                      ? 'bg-yellow-400 text-black' 
                      : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  <BarChart3 className="w-4 h-4 mr-2 inline" />
                  Bar Chart
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Chart/Bars View */}
              <div>
                {viewMode === 'chart' ? (
                  <div className="relative">
                    <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
                      {segments.map((segment, index) => (
                        <motion.path
                          key={index}
                          d={segment.path}
                          fill={segment.color}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ 
                            scale: selectedAllocation === index ? 1.05 : 1,
                            opacity: 1
                          }}
                          transition={{ 
                            scale: { duration: 0.2 },
                            opacity: { duration: 0.5, delay: index * 0.1 }
                          }}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setSelectedAllocation(index)}
                          onMouseLeave={() => setSelectedAllocation(null)}
                          style={{
                            filter: selectedAllocation === index ? 'brightness(1.2)' : 'brightness(1)',
                            transformOrigin: '200px 200px'
                          }}
                        />
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenAllocations.map((allocation, index) => (
                      <div
                        key={index}
                        className="bg-black/40 border border-zinc-800 rounded-xl p-4 hover:border-yellow-400/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: allocation.color }}
                            />
                            <span className="font-semibold text-white">{allocation.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-yellow-200">{allocation.percentage}%</span>
                            <div className="text-xs text-zinc-500">{(allocation.percentage * 2.2).toFixed(1)}M BBLIP</div>
                          </div>
                        </div>
                        
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <motion.div
                            className="h-2 rounded-full"
                            style={{ backgroundColor: allocation.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${allocation.percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Allocation Details */}
              <div className="space-y-4">
                {tokenAllocations.map((allocation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 rounded-xl border transition-all duration-200 cursor-pointer
                      ${selectedAllocation === index 
                        ? 'bg-yellow-400/10 border-yellow-400/30' 
                        : 'bg-black/40 border-zinc-800 hover:border-zinc-700'
                      }`}
                    onMouseEnter={() => setSelectedAllocation(index)}
                    onMouseLeave={() => setSelectedAllocation(null)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: allocation.color }}
                        />
                        <h3 className="font-semibold text-white">{allocation.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-yellow-200">{allocation.percentage}%</span>
                        <div className="text-xs text-zinc-500">{(allocation.percentage * 2.2).toFixed(1)}M</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-400 mb-4">{allocation.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-zinc-500 mb-1">Vesting Schedule</p>
                        <p className="text-zinc-300">{allocation.vestingSchedule}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 mb-1">Lock Period</p>
                        <p className="text-zinc-300">{allocation.lockPeriod}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Token Utility Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-20 hidden md:block"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Token Utility</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Multiple use cases and mechanisms that drive demand and create value for BBLIP token holders
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {utilities.map((utility, index) => {
                const Icon = utility.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-yellow-200" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{utility.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{utility.description}</p>
                    <p className="text-xs text-zinc-500">{utility.details}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Economic Model */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Economic Model</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Deflationary tokenomics with sustainable incentive mechanisms for long-term value creation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Flame className="w-6 h-6 text-orange-400" />
                  Deflationary Mechanisms
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Transaction Burn</span>
                    <span className="text-yellow-200 font-semibold">2% per TX</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Staking Penalty Burn</span>
                    <span className="text-yellow-200 font-semibold">Early unstake</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Buyback & Burn</span>
                    <span className="text-yellow-200 font-semibold">10% profits</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-zinc-300">Expected Annual Burn</span>
                    <span className="text-green-400 font-semibold">3-5%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  Value Accrual
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Revenue Sharing</span>
                    <span className="text-yellow-200 font-semibold">30% of fees</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Staking Rewards</span>
                    <span className="text-yellow-200 font-semibold">15-25% APY</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-300">Referral Rewards</span>
                    <span className="text-yellow-200 font-semibold">Up to 10%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-zinc-300">Governance Power</span>
                    <span className="text-green-400 font-semibold">1 token = 1 vote</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Presale Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-20"
          >
            <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">🚀 Presale Now Active</h3>
                <p className="text-zinc-400 max-w-2xl mx-auto">
                  Join the BBLIP presale and secure your tokens at the early bird price of $0.08 per token
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-200 mb-2">$0.08</div>
                  <div className="text-sm text-zinc-400">Presale Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-200 mb-2">26.4M</div>
                  <div className="text-sm text-zinc-400">Tokens Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-200 mb-2">12%</div>
                  <div className="text-sm text-zinc-400">of Total Supply</div>
                </div>
              </div>
              
              <div className="text-center">
                <Link
                  href="/presale"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-full hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
                >
                  Join Presale Now
                  <Target className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center pb-20"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </motion.div>
        </Container>
      </main>

      <Footer />
    </div>
  )
} 