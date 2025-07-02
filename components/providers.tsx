'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

const queryClient = new QueryClient()

// Debug log for config
console.log('🔍 Providers - Config loaded:', config ? 'Yes' : 'No')

export function Providers({ children }: { children: React.ReactNode }) {
  // Clear any existing toasts on provider mount
  useEffect(() => {
    toast.dismiss();
    
    // Also clear any lingering toast elements
    const clearToasts = () => {
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      toasts.forEach(toast => toast.remove());
    };
    
    clearToasts();
    
    // Clear again after a short delay to catch any late toasts
    const timeout = setTimeout(clearToasts, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  // Check if config is loaded
  if (!config) {
    console.error('❌ Wagmi config is undefined! Check your .env.local file');
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Configuration Error</h2>
          <p className="text-gray-400">Please check your .env.local file and restart the server</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 