'use client'

import { motion } from 'framer-motion'
import { 
  Rocket, 
  Target, 
  Trophy,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
  Zap,
  Globe,
  Shield,
  Users,
  Coins
} from 'lucide-react'
import Container from './container'
import { useState } from 'react'

interface Milestone {
  quarter: string;
  year: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  title: string;
  items: string[];
  icon: any;
}

const roadmapData: Milestone[] = [
  {
    quarter: 'Q2',
    year: '2025',
    status: 'completed',
    title: 'Platform Launch',
    icon: Rocket,
    items: [
      'Web application development',
      'Swap system implementation',
      'Staking platform launch',
      'Crypto card system beta launch',

      'Referral system deployment'
    ]
  },
  {
    quarter: 'Q3',
    year: '2025',
    status: 'in-progress',
    title: 'Presale & Expansion',
    icon: Target,
    items: [
      'Public presale campaign',
      'DEX listing on PancakeSwap , Uniswap, dYdX',
      'Community growth initiatives',
      'Strategic partnerships (Binance, Coinbase, Kraken)',

    ]
  },
  {
    quarter: 'Q4',
    year: '2025',
    status: 'upcoming',
    title: 'Card System & DEX',
    icon: Shield,
    items: [
      'Crypto card system public launch',
      'Integration with top DEXs (Uniswap, dYdX, PancakeSwap)',
      'iOS & Android app beta release',
      'Mobile app development kickoff',
      'Tier 2 CEX listings (Gate.io, KuCoin)',

      'Enhanced security features',
    ]
  },
  {
    quarter: 'Q1',
    year: '2026',
    status: 'upcoming',
    title: 'Exchange Listings',
    icon: Globe,
    items: [
      'Crypto card public launch',
      'Institutional partnerships',
      'Cross-chain bridge development',
      'Tier 1 CEX listing (Binance, Coinbase, Kraken)',

      'Global marketing campaign'
    ]
  },
  {
    quarter: 'Q2',
    year: '2026',
    status: 'upcoming',
    title: 'Major Exchange Integration',
    icon: Zap,
    items: [
      'Advanced DeFi features',
      'Fiat on/off ramp expansion',
      'Enterprise solutions launch',
      'Regional card partnerships'
    ]
  },
  {
    quarter: 'Q3',
    year: '2026',
    status: 'upcoming',
    title: 'Global Expansion',
    icon: Trophy,
    items: [
      'Additional Tier 1 CEX listings',
      'Global card system rollout',
      'Multi-chain ecosystem expansion',
      'DAO governance implementation',
      'Advanced trading features'
    ]
  }
]

export default function RoadmapSection() {
  const [selectedMilestone, setSelectedMilestone] = useState<number>(0) // Default to current presale milestone

  return (
    <section className="w-full py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 " />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <Container size="lg" className="relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
        
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Our Journey to
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600"> Excellence</span>
          </h2>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto">
            From presale to global adoption - a comprehensive roadmap with transparent progress 
            and ambitious milestones for the Bblip ecosystem
          </p>
        </motion.div>

        {/* Timeline Navigation - Desktop */}
        <div className="hidden lg:block mb-20 pb-10">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800 -translate-y-1/2" />
            
            {/* Progress line */}
            <motion.div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 -translate-y-1/2"
              initial={{ width: '0%' }}
              whileInView={{ width: '15%' }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
            />

            {/* Timeline dots */}
            <div className="relative flex justify-between">
              {roadmapData.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex flex-col items-center cursor-pointer group"
                  onClick={() => setSelectedMilestone(index)}
                >
                  {/* Dot */}
                  <div className={`w-6 h-6 rounded-full border-4 transition-all duration-300
                    ${milestone.status === 'completed' 
                      ? 'bg-yellow-400 border-yellow-400' 
                      : milestone.status === 'in-progress'
                      ? 'bg-yellow-600 border-yellow-600 animate-pulse'
                      : 'bg-zinc-800 border-zinc-700 group-hover:border-yellow-400/50'
                    }`}
                  >
                    {milestone.status === 'completed' && (
                      <CheckCircle2 className="w-full h-full text-black" />
                    )}
                  </div>

                  {/* Label */}
                  <div className={`absolute top-8 text-center transition-all duration-300
                    ${selectedMilestone === index ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                  >
                    <p className="text-sm font-semibold text-white">{milestone.quarter} {milestone.year}</p>
                    <p className="text-xs text-zinc-400 mt-1">{milestone.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="lg:hidden mb-12">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {roadmapData.map((milestone, index) => (
              <button
                key={index}
                onClick={() => setSelectedMilestone(index)}
                className={`flex-shrink-0 px-4 py-2 rounded-full transition-all duration-300
                  ${selectedMilestone === index
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
              >
                <span className="font-semibold">{milestone.quarter} {milestone.year}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Milestone Details */}
        <motion.div
          key={selectedMilestone}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 md:p-12">
            <div className="flex items-start gap-6 mb-8">
              {/* Icon */}
              <div className={`p-4 rounded-xl
                ${roadmapData[selectedMilestone].status === 'completed'
                  ? 'bg-yellow-400/20'
                  : roadmapData[selectedMilestone].status === 'in-progress'
                  ? 'bg-yellow-600/20'
                  : 'bg-zinc-800'
                }`}
              >
                {(() => {
                  const Icon = roadmapData[selectedMilestone].icon
                  return <Icon className={`w-8 h-8
                    ${roadmapData[selectedMilestone].status === 'completed'
                      ? 'text-yellow-400'
                      : roadmapData[selectedMilestone].status === 'in-progress'
                      ? 'text-yellow-600'
                      : 'text-zinc-400'
                    }`} 
                  />
                })()}
              </div>

              {/* Header */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    {roadmapData[selectedMilestone].title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium
                    ${roadmapData[selectedMilestone].status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : roadmapData[selectedMilestone].status === 'in-progress'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {roadmapData[selectedMilestone].status === 'completed' ? 'Completed' :
                     roadmapData[selectedMilestone].status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-zinc-400">
                  {roadmapData[selectedMilestone].quarter} {roadmapData[selectedMilestone].year}
                </p>
              </div>
            </div>

            {/* Milestone Items */}
            <div className="space-y-4">
              {roadmapData[selectedMilestone].items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-zinc-800"
                >
                  {roadmapData[selectedMilestone].status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : roadmapData[selectedMilestone].status === 'in-progress' && index <= 2 ? (
                    <div className="w-5 h-5 rounded-full bg-yellow-600 animate-pulse flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className="text-white">{item}</span>
                </motion.div>
              ))}
            </div>

            {/* Progress indicator for in-progress */}
            {roadmapData[selectedMilestone].status === 'in-progress' && (
              <div className="mt-8 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <p className="text-sm text-yellow-200">Currently in progress - Presale active with staking and referral systems operational</p>
                </div>
              </div>
            )}

            {/* Current Status Badge for presale phase */}
            {roadmapData[selectedMilestone].status === 'in-progress' && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-200">Presale Now Live!</p>
                    <p className="text-xs text-zinc-400">Join our community and secure your BBLP tokens at presale prices</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

     
      </Container>
    </section>
  )
} 