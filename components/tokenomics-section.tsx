'use client'

import { motion } from 'framer-motion'
import { 
  Coins, 
  Shield,
  TrendingUp,
  ChartPie,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import Container from './container'
import Link from 'next/link'

const keyAllocations = [
  { name: 'Staking Rewards', percentage: 30, color: '#FF6B35' },
  { name: 'ICO & Presale', percentage: 25, color: '#FFD700' },
  { name: 'Team & Development', percentage: 15, color: '#FFD93D' },
  { name: 'Private Sale', percentage: 10, color: '#FFA500' },
  { name: 'Initial Staking', percentage: 5, color: '#F7FF9B' },
  { name: 'Liquidity', percentage: 5, color: '#00BFFF' },
  { name: 'Business Partnerships', percentage: 5, color: '#8A2BE2' },
  { name: 'Airdrop', percentage: 5, color: '#00FF7F' }
]

const keyUtilities = [
  { icon: Shield, title: 'Governance', description: 'Participate in protocol decisions' },
  { icon: Coins, title: 'Staking Rewards', description: 'Earn up to 32% APR' },
  { icon: TrendingUp, title: 'Burn Mechanism', description: 'Deflationary tokenomics' }
]

export default function TokenomicsSection() {
  return (
    <section className="w-full py-16 md:py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 " />
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl" />
      </div>

      <Container size="lg" className="relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
    
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Sustainable 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600"> Token Economy</span>
          </h2>
          
          <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto">
            Fair distribution, strong utility, and long-term sustainability with a fixed supply of 100 million tokens
          </p>
        </motion.div>

        {/* Main Content - Compact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Token Supply */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 text-center"
          >
            <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Coins className="w-6 h-6 text-yellow-200" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Total Supply</h3>
            <p className="text-2xl font-bold text-yellow-200 mb-2">100M BBLP</p>
            <p className="text-sm text-zinc-400">Fixed supply with deflationary burn mechanics</p>
          </motion.div>

          {/* Key Allocation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4 text-center">Distribution</h3>
            <div className="space-y-3">
              {keyAllocations.map((allocation, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: allocation.color }}
                    />
                    <span className="text-sm text-zinc-300">{allocation.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-yellow-200">{allocation.percentage}%</span>
                    <div className="text-xs text-zinc-500">{(allocation.percentage * 1).toFixed(1)}M BBLP</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border border-yellow-400/20 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4 text-center">Key Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Presale Price</span>
                <span className="text-sm font-semibold text-yellow-200">$0.10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Initial Circulating</span>
                <span className="text-sm font-semibold text-yellow-200">35M BBLP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Launch Price</span>
                <span className="text-sm font-semibold text-yellow-200">$0.14</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Staking APR</span>
                <span className="text-sm font-semibold text-yellow-200">Up to 32%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Referral Rewards</span>
                <span className="text-sm font-semibold text-yellow-200">5 Tiers</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Key Utilities - Horizontal Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 hidden md:block"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">Token Utility</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {keyUtilities.map((utility, index) => {
              const Icon = utility.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black/40 border border-zinc-800 rounded-xl p-6 text-center hover:border-yellow-400/30 transition-all duration-200"
                >
                  <Icon className="w-8 h-8 text-yellow-200 mx-auto mb-3" />
                  <h4 className="font-semibold text-white mb-2">{utility.title}</h4>
                  <p className="text-sm text-zinc-400">{utility.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* CTA to Full Tokenomics Page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <Link
              href="/tokenomics"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
            >
              View Full Tokenomics
              <ArrowRight className="w-4 h-4" />
            </Link>
          
          </div>
        </motion.div>
      </Container>
    </section>
  )
} 