'use client'

import { Shield } from 'lucide-react'
import Container from './container'
import { motion } from 'framer-motion'

export default function SecurityFeatures() {
  return (
    <section className="w-full py-20">
      <Container>
       

        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] items-center gap-12 md:gap-24">
          <div className="max-w-xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              YOUR MONEY&apos;S<br />SAFE SPACE
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-400 text-lg mb-8"
            >
              With BBLIP Secure, you&apos;re entering a new era of money security — where our proactive, purpose-built defences and team of fraud specialists help protect every account, 24/7.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="px-6 py-3 bg-yellow-200 text-black rounded-xl font-medium hover:bg-yellow-300 transition-colors"
            >
              Learn more
            </motion.button>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center md:justify-end w-full"
          >
            <div className="relative w-64 h-64 md:w-[420px] md:h-[420px] flex items-center justify-center">
              <Shield className="w-48 h-48 md:w-64 md:h-64 text-yellow-200" strokeWidth={1.5} />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
} 