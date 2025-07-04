"use client";

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Users, 
  Coins, 
  Lock, 
  Unlock,
  ArrowRight,
  CheckCircle,
  Target,
  Zap,
  DollarSign,
  Globe,
  Flame
} from 'lucide-react'
import Header from '@/components/header'

export default function TokenomicsPage() {
  const [viewMode, setViewMode] = useState<'pie' | 'bar'>('pie')
  
  const TOTAL_SUPPLY = 100_000_000;
  const RAW_ALLOCATIONS = [
    { 
      name: 'Staking Rewards', 
      amount: 30_000_000, 
      color: '#FF6B35', 
      description: 'Long-term staking rewards for community and ecosystem participants.',
      vestingSchedule: '12-month cliff + 108-month vesting',
      lockPeriod: '12 months',
      icon: TrendingUp
    },
    { 
      name: 'ICO', 
      amount: 25_000_000, 
      color: '#FFD700', 
      description: 'Public sale (ICO) allocation for broad community distribution.',
      vestingSchedule: 'Immediate release',
      lockPeriod: 'No lock period',
      icon: Globe
    },
    { 
      name: 'Team', 
      amount: 15_000_000, 
      color: '#FFD93D', 
      description: 'Core team allocation with long-term vesting to ensure commitment and stability.',
      vestingSchedule: '12-month cliff + 48-month vesting',
      lockPeriod: '12 months',
      icon: Users
    },
    { 
      name: 'Private Sale', 
      amount: 10_000_000, 
      color: '#FFA500', 
      description: 'Private investors with extended vesting for sustainable growth.',
      vestingSchedule: '12-month cliff + 36-month vesting',
      lockPeriod: '12 months',
      icon: Shield
    },
    { 
      name: 'Initial Staking', 
      amount: 5_000_000, 
      color: '#F7FF9B', 
      description: 'Tokens allocated for initial staking pool to bootstrap network security and rewards.',
      vestingSchedule: 'Immediate release',
      lockPeriod: 'No lock period',
      icon: Zap
    },
    { 
      name: 'Liquidity', 
      amount: 5_000_000, 
      color: '#00BFFF', 
      description: 'Liquidity provision for DEX/CEX listings and market making.',
      vestingSchedule: 'Immediate release',
      lockPeriod: 'No lock period',
      icon: DollarSign
    },
    { 
      name: 'Business Partnerships', 
      amount: 5_000_000, 
      color: '#8A2BE2', 
      description: 'Strategic business partnerships with vesting to ensure long-term collaboration.',
      vestingSchedule: '6-month cliff + 12-month vesting',
      lockPeriod: '6 months',
      icon: Target
    },
    { 
      name: 'Airdrop', 
      amount: 5_000_000, 
      color: '#00FF7F', 
      description: 'Airdrop allocation for community engagement and marketing.',
      vestingSchedule: 'Immediate release',
      lockPeriod: 'No lock period',
      icon: Users
    },
  ];

  const tokenAllocations = RAW_ALLOCATIONS.map(a => ({
    ...a,
    percentage: (a.amount / TOTAL_SUPPLY) * 100
  }));

  const formatToMillion = (amount: number) => {
    return `${(amount / 1_000_000)}M`;
  };

  // Pie chart hesaplamaları
  const createPieChart = () => {
    let cumulativePercentage = 0;
    const radius = 120;
    const centerX = 140;
    const centerY = 140;
    
    return tokenAllocations.map((allocation, index) => {
      const startAngle = (cumulativePercentage * 360) / 100;
      cumulativePercentage += allocation.percentage;
      const endAngle = (cumulativePercentage * 360) / 100;
      
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);
      
      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      return {
        ...allocation,
        pathData,
        index
      };
    });
  };

  const pieChartData = createPieChart();

  const utilities = [
    {
      title: 'Governance',
      description: 'Participate in protocol decisions and shape the future of BBLP ecosystem.',
      icon: Users,
      color: '#FFD93D'
    },
    {
      title: 'Staking Rewards',
      description: 'Earn passive income by staking your BBLP tokens with 32% APR.',
      icon: TrendingUp,
      color: '#FF6B35'
    },
    {
      title: 'Burn Mechanism',
      description: 'Deflationary tokenomics through regular token burns to increase scarcity.',
      icon: Flame,
      color: '#FF4444'
    },
    {
      title: 'Liquidity Mining',
      description: 'Provide liquidity and earn rewards in our DeFi ecosystem.',
      icon: DollarSign,
      color: '#00BFFF'
    },
    {
      title: 'Revenue Sharing',
      description: 'Share in protocol revenues through token holder benefits.',
      icon: Coins,
      color: '#00FF7F'
    },
    {
      title: 'Gas Optimization',
      description: 'Optimized gas fees for transactions within the BBLP ecosystem.',
      icon: Zap,
      color: '#8A2BE2'
    }
  ];

  const economicMetrics = [
    { label: 'Total Supply', value: '100M', description: 'Fixed supply cap', icon: Coins },
    { label: 'Initial Circulating', value: '35M', description: 'Available at launch', icon: Unlock },
    { label: 'Locked Tokens', value: '65M', description: 'Vested over time', icon: Lock },
    { label: 'Staking APR', value: '32%', description: 'Annual percentage rate', icon: TrendingUp },
  ];

  const vestingSchedule = [
    { period: 'Month 0', unlocked: 35, description: 'TGE + Immediate Release' },
    { period: 'Month 6', unlocked: 40, description: 'Business Partnerships Cliff' },
    { period: 'Month 12', unlocked: 55, description: 'Major Unlock Event' },
    { period: 'Month 24', unlocked: 70, description: 'Mid-term Vesting' },
    { period: 'Month 36', unlocked: 85, description: 'Late-stage Vesting' },
    { period: 'Month 48+', unlocked: 100, description: 'Full Circulation' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10" />
        <div className="container mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-4 md:mb-6">
              BBLP Token
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {' '}Economics
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-6 md:mb-8 px-4">
              Comprehensive breakdown of BBLP&apos;s 100M token supply with fair distribution, 
              sustainable tokenomics, and long-term value creation mechanisms.
            </p>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1 text-xs md:text-sm">
                Fixed Supply: 100M
              </Badge>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-3 py-1 text-xs md:text-sm">
                32% Staking APR
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1 text-xs md:text-sm">
                Deflationary Model
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Economic Metrics */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-16">
          {economicMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-yellow-500/50 transition-all duration-300">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <metric.icon className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
                    <div className="text-right">
                      <div className="text-xl md:text-3xl font-bold text-white">{metric.value}</div>
                      <div className="text-xs md:text-sm text-zinc-400 hidden md:block">{metric.description}</div>
                    </div>
                  </div>
                  <div className="text-sm md:text-lg font-semibold text-zinc-200">{metric.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Token Distribution */}
        <Card className="bg-zinc-900/50 border-zinc-800 mb-8 md:mb-16">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl md:text-3xl text-white mb-2">Token Distribution</CardTitle>
                <CardDescription className="text-zinc-400 text-sm md:text-base">
                  Fair and transparent distribution of 100M BBLP tokens across key stakeholders
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('pie')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs md:text-sm"
                >
                  <PieChart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Pie View
                </Button>
                <Button
                  variant={viewMode === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('bar')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs md:text-sm"
                >
                  <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Bar View
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Distribution Chart */}
              <div className="space-y-4 md:space-y-6">
                {viewMode === 'pie' ? (
                  <div className="flex justify-center mb-6">
                    <svg width="280" height="280" viewBox="0 0 280 280" className="w-full max-w-sm">
                      {pieChartData.map((segment, index) => (
                        <motion.path
                          key={index}
                          d={segment.pathData}
                          fill={segment.color}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="hover:brightness-110 transition-all duration-200"
                        />
                      ))}
                    </svg>
                  </div>
                ) : null}
                
                {tokenAllocations.map((allocation, index) => (
                  <motion.div
                    key={allocation.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3 md:space-x-4 flex-1">
                      <div 
                        className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: allocation.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm md:text-base">{allocation.name}</div>
                        <div className="text-xs md:text-sm text-zinc-400 hidden md:block">{allocation.description}</div>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-lg md:text-xl font-bold text-yellow-400">{allocation.percentage}%</div>
                      <div className="text-xs md:text-sm text-zinc-400">{formatToMillion(allocation.amount)} BBLP</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Vesting Schedule */}
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4">Vesting Schedule</h3>
                {vestingSchedule.map((schedule, index) => (
                  <div key={schedule.period} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm md:text-base text-zinc-300">{schedule.period}</span>
                      <span className="text-sm md:text-base text-yellow-400 font-semibold">{schedule.unlocked}%</span>
                    </div>
                    <Progress value={schedule.unlocked} className="h-2" />
                    <div className="text-xs text-zinc-500">{schedule.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Utility - Mobilde daha kompakt */}
        <Card className="bg-zinc-900/50 border-zinc-800 mb-8 md:mb-16">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-white mb-2">Token Utility</CardTitle>
            <CardDescription className="text-zinc-400 text-sm md:text-base">
              Multiple use cases and benefits that drive demand and create value for BBLP holders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {utilities.map((utility, index) => (
                <motion.div
                  key={utility.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-800/50 border-zinc-700 hover:border-yellow-500/50 transition-all duration-300 h-full">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center mb-3 md:mb-4">
                        <div 
                          className="w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center mr-3 md:mr-4"
                          style={{ backgroundColor: `${utility.color}20` }}
                        >
                          <utility.icon className="w-4 h-4 md:w-6 md:h-6" style={{ color: utility.color }} />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-white">{utility.title}</h3>
                      </div>
                      <p className="text-sm md:text-base text-zinc-400">{utility.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Economic Model - Mobilde daha kompakt */}
        <Card className="bg-zinc-900/50 border-zinc-800 mb-8 md:mb-16">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-white mb-2">Economic Model</CardTitle>
            <CardDescription className="text-zinc-400 text-sm md:text-base">
              Deflationary tokenomics with sustainable incentives and long-term value creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 mr-2 text-green-400" />
                  Value Accrual Mechanisms
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">Token Burns</div>
                      <div className="text-xs md:text-sm text-zinc-400">Regular burns from transaction fees</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">Staking Rewards</div>
                      <div className="text-xs md:text-sm text-zinc-400">32% APR for long-term holders</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">Revenue Sharing</div>
                      <div className="text-xs md:text-sm text-zinc-400">Share in protocol revenues</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-400" />
                  Risk Mitigation
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">Vesting Schedules</div>
                      <div className="text-xs md:text-sm text-zinc-400">Prevents sudden supply shocks</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">Fair Distribution</div>
                      <div className="text-xs md:text-sm text-zinc-400">No single entity controls majority</div>
                    </div>
                  </div>
                 
             
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presale CTA */}
        <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6 md:p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Presale Now Live</h2>
            <p className="text-sm md:text-base text-zinc-300 mb-6 max-w-2xl mx-auto">
              Join the BBLP ecosystem early and benefit from our sustainable tokenomics model. 
              Limited time opportunity with exclusive presale pricing.
            </p>
          
            <Button 
              size="lg" 
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 md:px-8 py-3 text-sm md:text-base"
            >
              Join Presale Now
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 