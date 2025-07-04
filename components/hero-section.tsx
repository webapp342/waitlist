'use client'

import { motion } from 'framer-motion'
import { Shield, Lock, Zap, Globe, Rocket, AlertCircle } from 'lucide-react'
import Container from './container'



export default function HeroSection() {
  return (
    <section className="w-full pt-20 ">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-0 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
          <AlertCircle className="w-5 h-5 text-yellow-400" />

            <span className="text-sm text-yellow-200 font-medium">Limited Early Adopter Card Allocation </span>
          </div>
          
        
        </motion.div>
      </Container>
    </section>
  )
} 