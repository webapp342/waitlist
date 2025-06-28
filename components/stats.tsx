'use client'

import { useQuery } from '@tanstack/react-query'
import { userService, cardService } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Stats() {
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userService.getUserStats(),
    staleTime: 60 * 1000, // 1 minute
  })

  const { data: cardStats } = useQuery({
    queryKey: ['card-stats'],
    queryFn: () => cardService.getCardStats(),
    staleTime: 60 * 1000,
  })

  const statItems = [
    {
      label: 'Registered Users',
      value: userStats?.totalUsers ?? 0,
    },
    {
      label: 'Cards Issued',
      value: cardStats?.totalCards ?? 0,
    },
    {
      label: 'Supported Chains',
      value: 28, // static placeholder — update as needed
    },
  ]

  return (
    <div className="w-full mt-24 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {statItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <span className="text-4xl md:text-5xl font-extrabold text-yellow-300 drop-shadow-lg">
              {Number(stat.value).toLocaleString()}
            </span>
            <span className="mt-2 text-sm sm:text-base text-zinc-400 tracking-wide uppercase">
              {stat.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
} 