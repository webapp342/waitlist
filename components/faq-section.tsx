'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Container from './container'

const faqs = [
  {
    question: 'How does Bblip Card work without KYC?',
    answer: 'Bblip Card operates on a decentralized infrastructure where your crypto wallet serves as your identity. We use smart contracts and blockchain technology to verify ownership without collecting personal data.'
  },
  {
    question: 'What are the card limits?',
    answer: 'Card limits depend on your staking tier. Bronze cards start at $1,000/day, Silver at $5,000/day, and Black cards have $25,000/day spending limits. ATM withdrawals are limited to $1,000/day across all tiers.'
  },
  {
    question: 'Which cryptocurrencies can I spend?',
    answer: 'Currently, you can spend BBLP, BNB, USDT, USDC, and ETH. We automatically convert your crypto to fiat at the point of sale using real-time exchange rates with zero markup.'
  },
  {
    question: 'How fast can I get my card?',
    answer: 'Virtual cards are issued instantly upon staking. Physical cards are shipped within 7-10 business days worldwide. Express shipping (2-3 days) is available for Black tier members.'
  },
  {
    question: 'Is my crypto safe?',
    answer: 'Yes. Bblip uses non-custodial technology, meaning you always maintain control of your private keys. Your crypto stays in your wallet until the moment of transaction.'
  },
  {
    question: 'What happens to my staked tokens?',
    answer: 'Staked tokens remain in a smart contract earning rewards. You can unstake anytime instantly with no cooldown period or penalties. Complete flexibility for your staking strategy.'
  }
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="w-full py-20 bg-gradient-to-b from-transparent via-zinc-950/10 to-transparent">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Need answers?
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            We&apos;ve got you.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-black/40 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden hover:border-yellow-400/20 transition-colors duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 lg:px-8 py-6 flex items-center justify-between text-left hover:bg-zinc-800/20 transition-colors"
              >
                <span className="font-semibold text-white text-lg">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-zinc-400 transition-transform duration-200 flex-shrink-0 ml-4 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 lg:px-8 pb-6 text-zinc-400 leading-relaxed text-lg">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
} 