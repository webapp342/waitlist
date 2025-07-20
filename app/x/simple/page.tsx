"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Twitter, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SimpleXPage() {
  const { address, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectX = () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Simple OAuth 2.0 flow without PKCE
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const redirectUri = 'https://www.bblip.io/x/callback';
    const state = Math.random().toString(36).substring(2, 15);
    const scope = 'tweet.read users.read offline.access';

    // Store state for verification
    localStorage.setItem('x_oauth_state', state);
    localStorage.setItem('x_wallet_address', address);

    // Build OAuth URL
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}`;

    console.log('Simple OAuth URL:', authUrl);
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Connect X Account
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Simple X OAuth connection
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Twitter className="w-6 h-6 text-blue-400" />
                X Connection
              </CardTitle>
              <CardDescription>
                Connect your X account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Please connect your wallet first
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={connectX}
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect X Account'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 