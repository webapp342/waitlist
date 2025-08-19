'use client'

import { motion } from 'framer-motion'
import { Shield, Lock, Zap, Globe, Rocket, AlertCircle, ArrowRight } from 'lucide-react'
import Container from './container'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="w-full  ">
      <Container size="lg">
        {/* Trust Badges */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-5"
        >
         
        </motion.div>

        {/* Value Proposition */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link href="/presale">
            <motion.div 
              className="inline-flex items-center gap-3 px-2 py-1 mb-0 bg-gradient-to-r from-yellow-400/10 via-yellow-400/15 to-yellow-400/10 border border-yellow-400/30 rounded-full cursor-pointer group transition-all duration-300 hover:bg-yellow-400/20 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
              
              <span className="text-sm font-semibold text-yellow-200 tracking-wide">
                Presale is live
              </span>
              
              <ArrowRight className="w-4 h-4 text-yellow-400 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.div>
          </Link>
        </motion.div>
      </Container>
    </section>
  )
} 