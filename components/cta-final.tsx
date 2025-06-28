'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Users, TrendingUp } from 'lucide-react'
import { EnhancedButton } from './ui/enhanced-btn'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Container from './container'
import WalletModal from './WalletModal'
import { useState } from 'react'

export default function CTAFinal() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)

  const handleConnect = () => {
    if (isConnected) {
      router.push('/dashboard')
    } else {
      setOpenModal(true)
    }
  }

  return (
    <section className="w-full py-20">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-yellow-400/10 via-black/40 to-yellow-400/5 backdrop-blur-xl border border-yellow-400/20 rounded-3xl p-8 lg:p-16"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-green-400/10 border border-green-400/30 rounded-full"
            >
              <span className="text-sm text-green-400 font-medium">
              2x Staking Rewards at Early Access
              </span>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6">
              Join the Revolution.
            </h2>
            
            <p className="text-lg sm:text-xl text-zinc-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Get your card in under a minute.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-12">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-200" />
                <span className="text-sm sm:text-base text-zinc-300">
                  <span className="font-semibold text-white">2,847</span> joined today
                </span>
              </div>
              
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-yellow-200 border-2 border-black"
                  />
                ))}
                <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center">
                  <span className="text-sm text-zinc-400">+</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="group px-8 py-3 bg-yellow-200 hover:bg-yellow-300 text-black font-medium rounded-xl transition-all duration-200 mb-8"
            >
              <span className="flex items-center gap-2">
                Get Your Card Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <p className="text-sm sm:text-base text-zinc-500">
              Average processing time: 47 seconds
            </p>
          </div>
        </motion.div>
        <WalletModal open={openModal} onClose={() => setOpenModal(false)} />
      </Container>
    </section>
  )
} 