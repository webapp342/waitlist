'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function XCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setError(`OAuth error: ${error}`);
          toast.error(`OAuth error: ${error}`);
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          setStatus('error');
          setError('Missing required OAuth parameters');
          toast.error('Missing required OAuth parameters');
          return;
        }

        // Get session ID from localStorage
        const sessionId = localStorage.getItem('x_oauth_session_id');
        if (!sessionId) {
          setStatus('error');
          setError('No active OAuth session found');
          toast.error('No active OAuth session found');
          return;
        }

        // Process the OAuth callback
        const response = await fetch('/api/x/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            sessionId
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          toast.success('X account connected successfully!');
          
          // Clear session ID
          localStorage.removeItem('x_oauth_session_id');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/social-connections');          }, 2000);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to connect X account');
          toast.error(data.error || 'Failed to connect X account');
        }

      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        setStatus('error');
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
      }
    };

    processCallback();
  }, [searchParams, router]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Activity className="w-8 h-8 text-blue-500 animate-spin" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'success':
        return 'Connection Successful!';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'success':
        return 'Your X account has been successfully connected. ';
      case 'error':
        return error || 'Failed to connect your X account. Please try again.';
      default:
        return 'Please wait while we process your X authentication...';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl">
                {getStatusTitle()}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {getStatusDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {status === 'error' && (
                <button
                  onClick={() => router.push('/x')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Activity className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <CardTitle className="text-2xl">
                Loading...
              </CardTitle>
              <CardDescription className="text-gray-400">
                Please wait while we load the callback page...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function XCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <XCallbackContent />
    </Suspense>
  );
} 