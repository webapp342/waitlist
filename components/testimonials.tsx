'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Container from './container'
import { useRef } from 'react'

interface Testimonial {
  name: string
  role: string
  content: string
  seed: number
}

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
  const style = {
    background: `
      linear-gradient(${getRandomAngle()}deg, ${getRandomColors()[0]} 25%, transparent 65%),
      linear-gradient(${getRandomAngle()}deg, ${getRandomColors()[1]} 50%, transparent 90%)
    `,
    transform: `rotate(${seed * 45}deg)`,
  }

  return (
    <div className="w-12 h-12 rounded-full border-2 border-black relative overflow-hidden backdrop-blur-sm">
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={style}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
    </div>
  )
}

const testimonials: Testimonial[] = [
  {
    name: "Alex T.",
    role: "Early Adopter",
    content: "The instant approval process is a game-changer. Got my card within minutes and the rewards are incredible!",
    seed: Math.random()
  },
  {
    name: "Sarah C.",
    role: "Crypto Enthusiast",
    content: "Finally, a card that understands crypto users. The staking rewards make this an absolute no-brainer.",
    seed: Math.random()
  },
  {
    name: "Marcus R.",
    role: "DeFi Trader",
    content: "The security features are top-notch. I feel confident using this card for all my crypto transactions.",
    seed: Math.random()
  },
  {
    name: "Emma W.",
    role: "Tech Professional",
    content: "Love how seamlessly it integrates with my existing crypto portfolio. The rewards program is exceptional.",
    seed: Math.random()
  },
  {
    name: "David P.",
    role: "Blockchain Developer",
    content: "The multi-chain support is impressive. This is exactly what the crypto community has been waiting for.",
    seed: Math.random()
  }
]

export default function Testimonials() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollAmount = container.clientWidth
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section className="w-full py-20">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 font-bold mb-6">
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
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-none w-[300px] sm:w-[350px] bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 snap-center"
              >
                <div className="flex items-center gap-4 mb-4">
                  <SplitColorAvatar seed={testimonial.seed} />
                  <div>
                    <h3 className="font-semibold text-white">{testimonial.name}</h3>
                    <p className="text-sm text-zinc-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {testimonial.content}
                </p>
              </motion.div>
            ))}
          </div>
          
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </Container>
    </section>
  )
} 