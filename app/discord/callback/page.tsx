"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DiscordCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Discord connection...');

  useEffect(() => {
    // This page handles the OAuth callback
    // The actual processing is done in the API route
    // This is just a loading page that will redirect
    const timer = setTimeout(() => {
      // Redirect back to main Discord page
      window.location.href = '/discord';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 max-w-md w-full mx-4">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <MessageSquare className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Discord Connection</h1>
            <p className="text-gray-300">{message}</p>
          </div>
          
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
          
          <p className="text-sm text-gray-400 mt-4">
            Redirecting you back to Discord page...
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 