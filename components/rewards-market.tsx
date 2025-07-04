'use client'

import { motion } from 'framer-motion'
import { 
  ChevronRight,
  LucideIcon
} from 'lucide-react'
import Container from './container'
import { useRef, useState, useEffect } from 'react'

interface RewardTier {
  name: string;
  color: string;
  benefits: string[];
  stakeAmount: string;
  cashbackRate: string;
  isSpecial: boolean;
}

const rewardTiers: RewardTier[] = [
  {
    name: 'Bronze',
    color: 'bronze',
    benefits: [
      'Digital subscriptions only',
      '1% BBLP rewards on subscriptions',
      '$200 monthly subscription limit',
      'Virtual card only',
      'Subscription management dashboard'
    ],
    stakeAmount: '1,000 BBLP',
    cashbackRate: '1%',
    isSpecial: false
  },
  {
    name: 'Silver',
    color: 'slate',
    benefits: [
      'Online shopping specialized',
      '1.5% BBLP rewards on e-commerce',
      '$1,000 daily online limit',
      'E-commerce protection insurance',
      'Shopping analytics dashboard'
    ],
    stakeAmount: '2,000 BBLP',
    cashbackRate: '1.5%',
    isSpecial: false
  },
  {
    name: 'Black',
    color: 'yellow',
    benefits: [
      'NFC enabled physical card',
      '$25,000 daily payment limit',
      'Apple Pay / Google Pay ready',
      'Premium metal card design',
      'Unlimited monthly spending'
    ],
    stakeAmount: '3,500 BBLP',
    cashbackRate: '2%',
    isSpecial: true
  }
]

export default function RewardsMarket() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = direction === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = 320;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(newIndex);
    };

    container.addEventListener('scrollend', handleScrollEnd);
    return () => container.removeEventListener('scrollend', handleScrollEnd);
  }, []);

  return (
    <section className="w-full py-20 bg-gradient-to-b from-transparent via-zinc-950/20 to-transparent">
      <Container size="lg">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Card Tiers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto"
          >
            Stake BBLP tokens to unlock premium benefits and earn higher rewards. The more you stake, the more you earn.
          </motion.p>
        </div>

        {/* Desktop view - Tier Cards */}
        <div className="hidden lg:grid grid-cols-3 gap-6 mb-16">
          {rewardTiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-6 lg:p-8 rounded-2xl border transition-all duration-300
                ${tier.isSpecial 
                  ? "bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border-yellow-400/20 hover:border-yellow-400/40" 
                  : "bg-black/40 border-zinc-800 hover:border-yellow-400/30"}
              `}
            >
              {tier.isSpecial && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-xs font-semibold text-black">
                  Premium
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-2xl font-bold ${tier.isSpecial ? 'text-yellow-200' : 'text-white'}`}>
                    {tier.name}
                  </h3>
                  <p className="text-zinc-400 mt-1">Stake {tier.stakeAmount}</p>
                </div>
                <div className={`text-lg font-semibold ${tier.isSpecial ? 'text-yellow-200' : 'text-white'}`}>
                  {tier.cashbackRate}
                  <span className="text-sm text-zinc-400 ml-1">Cashback</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.benefits.map((benefit, featureIndex) => (
                  <li key={featureIndex} className="flex items-start text-zinc-400">
                    <span className={`mr-2 text-lg ${tier.isSpecial ? 'text-yellow-400' : 'text-zinc-600'}`}>•</span>
                    {benefit}
                  </li>
                ))}
              </ul>

              {tier.isSpecial && (
                <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Mobile view - Swipeable cards */}
        <div className="block lg:hidden mb-16">
          <div className="relative">
            <div 
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-scroll overflow-y-hidden pb-4 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x"
            >
              {rewardTiers.map((tier, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`min-w-[280px] md:min-w-[320px] snap-start relative p-6 lg:p-8 bg-black/40 backdrop-blur-sm border border-${tier.color}-800 rounded-2xl flex flex-col transition-all duration-300`}
                >
                  
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {tier.name}
                  </h3>
                  
                  <p className={`text-${tier.color}-200 text-sm mb-4`}>
                    Stake {tier.stakeAmount}
                  </p>

                  <div className="space-y-2 mb-6">
                    {tier.benefits.map((benefit, benefitIdx) => (
                      <p key={benefitIdx} className="text-zinc-400 text-sm flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2" />
                        {benefit}
                      </p>
                    ))}
                  </div>

                  <div className={`text-${tier.color}-200 text-xl font-semibold`}>
                    {tier.cashbackRate} Cashback
                  </div>

                  {idx === 0 && (
                    <button
                      onClick={() => handleScroll('right')}
                      className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 flex items-center justify-center transition-colors duration-300"
                      aria-label="Next tier"
                    >
                      <ChevronRight className="w-6 h-6 text-yellow-200" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {rewardTiers.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!scrollContainerRef.current) return;
                    scrollContainerRef.current.scrollTo({
                      left: idx * 320,
                      behavior: 'smooth'
                    });
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeIndex
                      ? "w-8 bg-yellow-200"
                      : "w-2 bg-zinc-600 hover:bg-zinc-500"
                  }`}
                  aria-label={`Go to tier ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
} 