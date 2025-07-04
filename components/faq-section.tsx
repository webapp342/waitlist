'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Container from './container'

const faqs = [
  {
    question: 'How does Bblip Card work without KYC?',
    answer: 'Bblip Card leverages a unique regulatory-compliant escrow protocol: when you connect your wallet, our system issues a virtual card linked to a pooled, licensed entity that acts as a legal intermediary. This structure satisfies regulatory requirements without collecting your personal data. All spending is authorized by your wallet signature, so you enjoy true KYC-free payments—legally and instantly.'
  },
  {
    question: 'What are the card limits?',
    answer: 'Card limits depend on your staking tier. Bronze and Silver cards are virtual only, with daily spending limits of $200 and $1,000 respectively. Black Card is available as both virtual and physical, with a $25,000/day spending limit. ATM withdrawals (only with Black Card) are limited to $10,000/day. Only Black Card holders are eligible for a physical card and ATM access; all other tiers are virtual-only.'
  },
  {
    question: 'Which cryptocurrencies can I spend?',
    answer: 'Currently, you can spend BBLP, BNB, USDT, and BUSD. Ethereum, Solana, and Bitcoin network support is coming soon! We automatically convert your crypto to fiat at the point of sale using real-time exchange rates with zero markup.'
  },
  {
    question: 'How fast can I get my card?',
    answer: 'Virtual cards are issued instantly upon staking. Physical delivery is only available for Black Card holders. Card production is completed within 1 business day and shipped to your delivery address. Shipping time may vary depending on your location.'
  },
  {
    question: 'Is my crypto safe?',
    answer: 'Yes. Bblip uses non-custodial technology, meaning you always maintain control of your private keys. Your crypto stays in your wallet until the moment of transaction. When you make a purchase, you receive a notification and must approve the exact amount in your wallet—just like other secure checkout systems. Nothing leaves your wallet without your explicit permission, ensuring 100% self-custody at all times.'
  },
  {
    question: 'What happens to my staked tokens?',
    answer: 'Staking is the core of the Bblip ecosystem. Without staking, users cannot access card services. When you stake your tokens, they are securely held in a smart contract, earning a competitive 32% APY. This not only provides you with attractive staking rewards, but also unlocks the freedom to spend with your Bblip Card—no KYC required. You can unstake instantly at any time, with no cooldowns or penalties, ensuring maximum flexibility and control over your assets.'
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