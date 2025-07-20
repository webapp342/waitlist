"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function XCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing X authentication...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for errors
        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          toast.error('X authentication failed');
          setTimeout(() => router.push('/x'), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required authentication parameters');
          toast.error('Invalid authentication response');
          setTimeout(() => router.push('/x'), 3000);
          return;
        }

        // Validate state parameter (CSRF protection)
        const savedState = localStorage.getItem('x_auth_state');
        const codeVerifier = localStorage.getItem('x_code_verifier');
        
        if (state !== savedState) {
          setStatus('error');
          setMessage('Invalid state parameter');
          toast.error('Security validation failed');
          setTimeout(() => router.push('/x'), 3000);
          return;
        }

        if (!codeVerifier) {
          setStatus('error');
          setMessage('Missing code verifier');
          toast.error('Authentication session expired');
          setTimeout(() => router.push('/x'), 3000);
          return;
        }

        // Check if wallet is connected
        if (!isConnected || !address) {
          setStatus('error');
          setMessage('Wallet not connected. Please connect your wallet first.');
          toast.error('Wallet connection required');
          setTimeout(() => router.push('/x'), 3000);
          return;
        }

        // Process the authentication
        setMessage('Connecting your X account...');
        
        const response = await fetch('/api/x/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            codeVerifier,
            walletAddress: address
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          if (data.isAlreadyConnected) {
            setMessage('X account already connected! Redirecting...');
            toast.success('X account already connected! 🎉');
          } else {
            setMessage('X account connected successfully! Redirecting...');
            toast.success('X account connected successfully! 🎉');
          }
          
          // Clean up
          localStorage.removeItem('x_auth_state');
          
          // Redirect after success
          setTimeout(() => router.push('/x'), 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to connect X account');
          toast.error(data.error || 'Failed to connect X account');
          setTimeout(() => router.push('/x'), 3000);
        }

      } catch (error) {
        console.error('Error processing X callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        toast.error('Authentication failed');
        setTimeout(() => router.push('/x'), 3000);
      }
    };

    processCallback();
  }, [searchParams, isConnected, address, router]);

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
            onClick={() => router.push('/x')}
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

export default function XCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <XCallbackContent />
    </Suspense>
  );
} 