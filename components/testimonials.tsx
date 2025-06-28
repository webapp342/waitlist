'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Container from './container'
import { useRef, useState, useEffect } from 'react'

interface Testimonial {
  name: string
  quote: string
  role?: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Alex R.',
    role: 'DeFi Researcher',
    quote:
      'With Bblip Card, I can finally spend my crypto in the real world without swapping to fiat first. The onboarding was seamless and totally private.'
  },
  {
    name: 'Maria T.',
    role: 'Early Adopter',
    quote:
      'I love the staking-to-card concept. My BBLIP tokens keep working for me while I pay for coffee. Genius!'
  },
  {
    name: 'Kenji S.',
    role: 'Crypto Nomad',
    quote:
      'Zero-KYC and instant approval? This is how crypto payments should be. I have recommended Bblip to all my friends.'
  },
  {
    name: 'Luca P.',
    role: 'DeFi Farmer',
    quote: 'Finally a card that doesn\'t force fiat ramps. Tap & pay straight from my wallet.'
  },
  {
    name: 'Sofia G.',
    role: 'NFT Artist',
    quote: 'Royalties in, lattes out. Bblip fits perfectly into my daily flow.'
  },
  {
    name: 'Omar H.',
    role: 'Liquidity Provider',
    quote: 'The privacy-first approach is what sold me. No forms, just freedom.'
  },
  {
    name: 'Chen W.',
    role: 'DAO Treasurer',
    quote: 'Corporate cards for on-chain orgs? Yes please.'
  },
  {
    name: 'Isabella F.',
    role: 'Web3 Dev',
    quote: 'Staking while spending feels like cheating the system—in a good way.'
  },
  {
    name: 'Diego S.',
    role: 'Arb Trader',
    quote: 'Zero FX markup saved me hundreds during Devcon week.'
  },
  {
    name: 'Priya K.',
    role: 'Yield Chaser',
    quote: 'Card activation took less than a minute. Unreal.'
  },
  {
    name: 'Tom J.',
    role: 'Bitcoin Maximalist',
    quote: 'Didn\'t think I\'d ever use a card again, Bblip changed my mind.'
  },
  {
    name: 'Elena V.',
    role: 'Content Creator',
    quote: 'Cashback in tokens? That\'s alpha.'
  },
  {
    name: 'Ravi D.',
    role: 'Validator Operator',
    quote: 'Runs flawlessly on every chain I\'ve tried.'
  },
  {
    name: 'Maya L.',
    role: 'Digital Nomad',
    quote: 'ATM withdrawals in Bali with my own keys was magical.'
  }
]

export default function Testimonials() {
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

  // Update active index based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = 320; // min-w-[320px] from our card class
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(newIndex);
    };

    container.addEventListener('scrollend', handleScrollEnd);
    return () => container.removeEventListener('scrollend', handleScrollEnd);
  }, []);

  return (
    <section className="w-full py-20">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Users. Unfiltered.
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Real voices from the community.
          </p>
        </motion.div>
        
        <div className="relative max-w-[1200px] mx-auto">
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-scroll overflow-y-hidden pb-4 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x"
          >
            {testimonials.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="relative min-w-[280px] md:min-w-[320px] lg:min-w-[380px] bg-black/40 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col hover:border-yellow-400/20 transition-colors duration-300 snap-start"
              >
                <p className="text-zinc-300 leading-relaxed flex-grow text-lg mb-6">
                  &quot;{item.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-200" />
                  <div>
                    <span className="font-semibold text-white block">{item.name}</span>
                    {item.role && (
                      <span className="text-sm text-zinc-400">{item.role}</span>
                    )}
                  </div>
                </div>
                {idx === 0 && (
                  <button
                    onClick={() => handleScroll('right')}
                    className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 flex items-center justify-center transition-colors duration-300"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight className="w-6 h-6 text-yellow-200" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!scrollContainerRef.current) return;
                  scrollContainerRef.current.scrollTo({
                    left: idx * (window.innerWidth >= 1024 ? 380 : 320),
                    behavior: 'smooth'
                  });
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-8 bg-yellow-200"
                    : "w-2 bg-zinc-600 hover:bg-zinc-500"
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
} 