'use client'

import { motion } from 'framer-motion'
import { 
  CreditCard, 
  Smartphone, 
  DollarSign, 
  Globe2, 
  Fingerprint, 
  Rocket,
  Shield,
  Clock,
  Users
} from 'lucide-react'
import Container from './container'

const features = [
  {
    icon: CreditCard,
    title: 'Virtual & Physical Cards',
    description: 'Get instant virtual cards and order premium physical cards in multiple designs'
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Manage everything from our intuitive mobile app. Apple Pay & Google Pay ready'
  },
  {
    icon: DollarSign,
    title: 'Zero Hidden Fees',
    description: 'Transparent pricing with no monthly fees, no FX markups, just simple staking'
  },
  {
    icon: Globe2,
    title: 'Spend Globally',
    description: 'Accepted at 40M+ merchants worldwide. ATM withdrawals in 180+ countries'
  },
  {
    icon: Fingerprint,
    title: '100% Private',
    description: 'No KYC, no personal data required. Your keys, your crypto, your freedom'
  },
  {
    icon: Rocket,
    title: 'Instant Approval',
    description: 'Get your card in under 60 seconds. No credit checks, no waiting periods'
  },
  {
    icon: Shield,
    title: 'Military-Grade Security',
    description: '256-bit encryption, biometric authentication, and fraud protection'
  },
  {
    icon: Clock,
    title: 'Real-Time Rewards',
    description: 'Earn up to 8% cashback in BBLIP tokens on every transaction'
  },
  {
    icon: Users,
    title: 'Multi-Chain Support',
    description: 'Connect wallets from Ethereum, BSC, Polygon, and 25+ other chains'
  }
]

export default function FeaturesGrid() {
  return (
    <section className="w-full py-20 bg-gradient-to-b from-transparent via-zinc-950/20 to-transparent">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Built for Crypto.
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            All-in-one cards. Zero compromises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group relative p-6 lg:p-8 bg-black/40 backdrop-blur-sm border border-zinc-800 rounded-2xl hover:border-yellow-400/30 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              
              <feature.icon className="w-10 h-10 lg:w-12 lg:h-12 text-yellow-200 mb-4" />
              
              <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              
              <p className="text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
} 