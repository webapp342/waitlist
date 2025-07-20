"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Twitter, CheckCircle, XCircle, Activity, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerifiedXPage() {
  const { address, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [xUser, setXUser] = useState<any>(null);

  // Check existing X connection
  const checkXStatus = async () => {
    if (!isConnected || !address) return;

    try {
      const response = await fetch('/api/x/verified/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setConnectionStatus('connected');
        setXUser(data.xUser);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking X status:', error);
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    checkXStatus();
  }, [isConnected, address]);

  const connectX = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

      // Create OAuth session
      const response = await fetch('/api/x/verified/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store session ID for callback
        localStorage.setItem('x_verified_session_id', data.sessionId);
        
        // Redirect to X OAuth
        window.location.href = data.authUrl;
      } else {
        setConnectionStatus('disconnected');
        toast.error(data.error || 'Failed to start X authentication');
      }
    } catch (error) {
      console.error('Error initiating X auth:', error);
      setConnectionStatus('disconnected');
      toast.error('Failed to start X authentication');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectX = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/x/verified/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        setConnectionStatus('disconnected');
        setXUser(null);
        toast.success('X account disconnected successfully');
      } else {
        toast.error('Failed to disconnect X account');
      }
    } catch (error) {
      console.error('Error disconnecting X account:', error);
      toast.error('Failed to disconnect X account');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-5 h-5" />;
      case 'connecting': return <Activity className="w-5 h-5 animate-spin" />;
      default: return <XCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Connect X Account
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Securely connect your own X account with OAuth verification
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-400" />
                Verified X Connection
              </CardTitle>
              <CardDescription>
                Connect your own X account securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {getConnectionStatusIcon()}
                <span className={`font-semibold ${getConnectionStatusColor()}`}>
                  {connectionStatus === 'connected' ? 'Verified & Connected' : 
                   connectionStatus === 'connecting' ? 'Verifying...' : 'Not Connected'}
                </span>
              </div>

              {connectionStatus === 'connected' && xUser ? (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm">
                      ✅ Verified: @{xUser.username}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      This is your own X account
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={disconnectX}
                    className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isConnected ? (
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Please connect your wallet first
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400 text-sm">
                          🔒 Secure OAuth verification required
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          You'll be redirected to X to verify your account
                        </p>
                      </div>
                      <Button 
                        onClick={connectX}
                        disabled={isConnecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Twitter className="w-4 h-4 mr-2" />
                        {isConnecting ? 'Connecting...' : 'Connect & Verify X Account'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 