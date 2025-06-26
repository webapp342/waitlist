'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

const queryClient = new QueryClient()

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

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 