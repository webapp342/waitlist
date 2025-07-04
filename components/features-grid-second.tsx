'use client'

import { motion } from 'framer-motion'
import { 
  Fingerprint, 
  Rocket,
  Shield,
  Clock,
  ChevronRight,
  LucideIcon
} from 'lucide-react'
import Container from './container'
import { useRef, useState, useEffect } from 'react'

interface Feature {
  icon?: LucideIcon;
  title: string;
  description?: string;
  isMainCard?: boolean;
}

const secondSectionFeatures: Feature[] = [
  {
    title: 'All-in-one cards.',
    description: 'Zero compromises.',
    isMainCard: true
  },
  {
    icon: Fingerprint,
    title: '100% Private',
    description: 'No KYC, no personal data required. Your keys, your crypto, your freedom'
  },
  {
    icon: Rocket,
    title: 'Instant Approval',
    description: 'Get your card in under 60 seconds. No credit checks, no waiting periods'
  },
  {
    icon: Shield,
    title: 'Military-Grade Security',
    description: '256-bit encryption, biometric authentication, and fraud protection'
  },
  {
    icon: Clock,
    title: 'Real-Time Rewards',
    description: 'Earn up to 8% cashback in BBLP tokens on every transaction'
  }
]

export default function FeaturesGridSecond() {
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
    <section className="w-full py-20 bg-gradient-to-b from-transparent via-zinc-950/20 to-transparent">
      <Container size="lg">
     

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Desktop view - Small cards on left */}
          <div className="order-3 hidden lg:block col-span-2 lg:order-1">
            <div className="grid grid-cols-2 gap-6 h-full">
              {secondSectionFeatures.slice(1).map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-6 lg:p-8 bg-black/40 backdrop-blur-sm border border-zinc-800 rounded-2xl hover:border-yellow-400/30 transition-all duration-300 h-full flex flex-col"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                  
                  {feature.icon && <feature.icon className="w-10 h-10 lg:w-12 lg:h-12 text-yellow-200 mb-4" />}
                  
                  <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Feature cards - Swipeable on mobile and Tall card on desktop */}
          <div className="order-2 lg:order-2">
            <div className="block lg:hidden">
              <div className="relative">
                <div 
                  ref={scrollContainerRef}
                  className="flex gap-6 overflow-x-scroll overflow-y-hidden pb-4 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x"
                >
                  {secondSectionFeatures.map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className={`min-w-[280px] md:min-w-[320px] snap-start relative ${
                        feature.isMainCard 
                          ? "bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border-yellow-400/20" 
                          : "bg-black/40 hover:border-yellow-400/30"
                      } backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col transition-all duration-300`}
                    >
                      {!feature.isMainCard && (
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                      )}
                      
                      {feature.isMainCard ? (
                        <div className="flex flex-col h-full justify-center">
                          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            {feature.title}
                          </h2>
                          <p className="text-lg sm:text-xl text-zinc-300 mb-4">
                            {feature.description}
                          </p>
                          <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" />
                          {idx === 0 && (
                            <button
                              onClick={() => handleScroll('right')}
                              className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 flex items-center justify-center transition-colors duration-300"
                              aria-label="Next feature"
                            >
                              <ChevronRight className="w-6 h-6 text-yellow-200" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {feature.icon && <feature.icon className="w-10 h-10 lg:w-12 lg:h-12 text-yellow-200 mb-4" />}
                          
                          <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3">
                            {feature.title}
                          </h3>
                          
                          <p className="text-zinc-400 leading-relaxed">
                            {feature.description}
                          </p>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Navigation Dots */}
                <div className="flex justify-center gap-2 mt-4">
                  {secondSectionFeatures.map((_, idx) => (
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
                      aria-label={`Go to feature ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop view - Tall card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="hidden lg:flex items-center justify-center bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-8 lg:p-12 h-full"
            >
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  All-in-one cards.
                </h2>
                <p className="text-lg sm:text-xl text-zinc-300 mb-4">
                  Zero compromises.
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  )
} 