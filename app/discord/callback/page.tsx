"use client";

import { useEffect } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DiscordCallbackPage() {
  useEffect(() => {
    // Simple redirect to main Discord page
    // This page is kept for backward compatibility
    // Discord OAuth now redirects directly to /api/discord/callback
    const timer = setTimeout(() => {
      window.location.href = '/discord';
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 max-w-md w-full mx-4">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <MessageSquare className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Discord Connection</h1>
            <p className="text-gray-300">Redirecting to Discord page...</p>
          </div>
          
          <div className="flex justify-center mb-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
          
          <p className="text-sm text-gray-400">
            If you're not redirected automatically, <a href="/discord" className="text-purple-400 hover:underline">click here</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 