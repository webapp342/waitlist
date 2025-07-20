"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DiscordCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Discord connection...');

  useEffect(() => {
    // Get the current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    console.log('Discord callback received:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error: error || 'none'
    });

    if (error) {
      setStatus('error');
      setMessage(`Discord connection failed: ${error}`);
      setTimeout(() => {
        window.location.href = '/discord?error=' + encodeURIComponent(error);
      }, 3000);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing required parameters');
      setTimeout(() => {
        window.location.href = '/discord?error=missing_parameters';
      }, 3000);
      return;
    }

    // Forward the OAuth callback to the API endpoint
    const processCallback = async () => {
      try {
        const apiUrl = `/api/discord/callback?${window.location.search}`;
        console.log('Forwarding to API endpoint:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          setStatus('success');
          setMessage('Discord connected successfully!');
          setTimeout(() => {
            window.location.href = '/discord?success=connected';
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Failed to process Discord connection');
          setTimeout(() => {
            window.location.href = '/discord?error=callback_error';
          }, 3000);
        }
      } catch (error) {
        console.error('Error processing Discord callback:', error);
        setStatus('error');
        setMessage('Error processing Discord connection');
        setTimeout(() => {
          window.location.href = '/discord?error=callback_error';
        }, 3000);
      }
    };

    processCallback();
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
          
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-green-400" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-red-400" />}
          </div>
          
          <p className="text-sm text-gray-400">
            {status === 'loading' && 'Processing Discord connection...'}
            {status === 'success' && 'Redirecting you back to Discord page...'}
            {status === 'error' && 'Redirecting you back to Discord page...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 