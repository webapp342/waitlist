"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function SimpleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing X authentication...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for errors
        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);
          toast.error('X authentication failed');
          setTimeout(() => router.push('/x/simple'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required authentication parameters');
          toast.error('Invalid authentication response');
          setTimeout(() => router.push('/x/simple'), 3000);
          return;
        }

        // Validate state parameter
        const savedState = localStorage.getItem('x_oauth_state');
        const walletAddress = localStorage.getItem('x_wallet_address');

        if (state !== savedState) {
          setStatus('error');
          setMessage('Invalid state parameter');
          toast.error('Security validation failed');
          setTimeout(() => router.push('/x/simple'), 3000);
          return;
        }

        if (!walletAddress) {
          setStatus('error');
          setMessage('Wallet address not found');
          toast.error('Session expired');
          setTimeout(() => router.push('/x/simple'), 3000);
          return;
        }

        // Process the authentication
        setMessage('Connecting your X account...');
        
        const response = await fetch('/api/x/simple-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            walletAddress
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('X account connected successfully! Redirecting...');
          toast.success('X account connected successfully! 🎉');
          
          // Clean up
          localStorage.removeItem('x_oauth_state');
          localStorage.removeItem('x_wallet_address');
          
          // Redirect after success
          setTimeout(() => router.push('/x/simple'), 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to connect X account');
          toast.error(data.error || 'Failed to connect X account');
          setTimeout(() => router.push('/x/simple'), 3000);
        }

      } catch (error) {
        console.error('Error processing X callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        toast.error('Authentication failed');
        setTimeout(() => router.push('/x/simple'), 3000);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          {status === 'processing' && (
            <Loader2 className="w-16 h-16 mx-auto text-blue-400 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 mx-auto text-red-400" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          {status === 'processing' && 'Processing...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h1>
        
        <p className="text-gray-400 mb-8">
          {message}
        </p>
        
        {status === 'error' && (
          <button
            onClick={() => router.push('/x/simple')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to X Page
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <Loader2 className="w-16 h-16 mx-auto text-blue-400 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <p className="text-gray-400">Preparing authentication...</p>
      </div>
    </div>
  );
}

export default function SimpleCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SimpleCallbackContent />
    </Suspense>
  );
} 