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
              className="text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 font-bold mb-6"
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

           
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center md:justify-end w-full"
          >
            <div className="relative w-32 -h-10 -mb-20 md:mb-0 md:w-[420px] md:h-[420px] flex items-center justify-center">
              <Shield className="hidden md:block -mt-20 w-48 h-48 md:w-64 md:h-64 text-yellow-200 w-200 " strokeWidth={1.5} />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
} 