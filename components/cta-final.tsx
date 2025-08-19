'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Users, TrendingUp } from 'lucide-react'
import { EnhancedButton } from './ui/enhanced-btn'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Container from './container'
import WalletModal from './WalletModal'
import { useState, useMemo } from 'react'
import Image from 'next/image'

// Daha açık ve canlı pastel renkler
const colorPalettes = [
  ['#FFE082', '#81D4FA', '#FFAB91'],  // Açık sarı, açık mavi, açık turuncu
  ['#B2EBF2', '#FFCCBC', '#C5CAE9'],  // Açık turkuaz, açık somon, açık mor
  ['#F8BBD0', '#B2DFDB', '#FFE0B2'],  // Açık pembe, açık yeşil, açık amber
  ['#DCEDC8', '#B3E5FC', '#F8BBD0'],  // Açık lime, açık mavi, açık pembe
  ['#B3E5FC', '#FFE0B2', '#C5CAE9'],  // Açık mavi, açık amber, açık mor
  ['#FFCCBC', '#DCEDC8', '#B2EBF2'],  // Açık somon, açık lime, açık turkuaz
]

const getRandomAngle = () => Math.floor(Math.random() * 360)
const getRandomColors = () => {
  const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)]
  return palette.sort(() => Math.random() - 0.5).slice(0, 2)
}

const SplitColorAvatar = ({ seed }: { seed: number }) => {
  const style = useMemo(() => {
    const angle1 = getRandomAngle()
    const angle2 = getRandomAngle()
    const [color1, color2] = getRandomColors()
    
    return {
      background: `
        linear-gradient(${angle1}deg, ${color1} 25%, transparent 65%),
        linear-gradient(${angle2}deg, ${color2} 50%, transparent 90%)
      `,
      transform: `rotate(${seed * 45}deg)`,
    }
  }, [seed])

  return (
    <div className="w-8 h-8 rounded-full border-2 border-black relative overflow-hidden backdrop-blur-sm">
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={style}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
    </div>
  )
}

function generateShortAddress() {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 4; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

export default function CTAFinal() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)
  const avatarSeeds = useMemo(() => Array(5).fill(0).map(() => Math.random()), [])

  const handleConnect = () => {
    if (isConnected) {
      router.push('/dashboard')
    } else {
      setOpenModal(true)
    }
  }

  return (
    <section className="relative w-full py-20">
      <Container>
        <div className="relative rounded-3xl bg-[#0A0A0A] border border-zinc-800/50 p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 via-transparent to-transparent" />
          
          <div className="relative flex flex-col items-center text-center">
         

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 font-bold mb-6"
            >
             Invite Friends, Earn Together
            </motion.h2>

           

            {/* Referral Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 w-full max-w-4xl"
            >
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-1">Instant Withdrawal</h3>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-1">No Lockups</h3>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-white mb-1">Real Time</h3>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-400 text-lg mb-8 max-w-2xl"
            >
              No waiting, no lockups! Earn $76 USDT per every referral 
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="flex -space-x-3">
                {avatarSeeds.map((seed, index) => (
                  <SplitColorAvatar key={index} seed={seed} />
                ))}
                <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-xs">
                  +
                </div>
              </div>
              <span className="text-zinc-400">
                <strong className="text-white">18,647</strong> users earned rewards today
              </span>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              onClick={handleConnect}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-200"
            >
              {isConnected ? 'Go to Dashboard →' : 'Start Earning Now →'}
            </motion.button>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-zinc-500 text-sm mt-6"
            >
              Join in under 30 seconds • No KYC required
            </motion.p>
          </div>
        </div>
        <WalletModal open={openModal} onClose={() => setOpenModal(false)} />
      </Container>
    </section>
  )
} 