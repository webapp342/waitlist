"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Twitter, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BearerXPage() {
  const { address, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [xUsername, setXUsername] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Check existing X connection
  const checkXStatus = async () => {
    if (!isConnected || !address) return;

    try {
      const response = await fetch('/api/x/bearer/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setConnectionStatus('connected');
        setXUsername(data.xUsername);
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

    if (!xUsername.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

      const response = await fetch('/api/x/bearer/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          xUsername: xUsername.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus('connected');
        toast.success('X account connected successfully! 🎉');
      } else {
        setConnectionStatus('disconnected');
        toast.error(data.error || 'Failed to connect X account');
      }
    } catch (error) {
      console.error('Error connecting X account:', error);
      setConnectionStatus('disconnected');
      toast.error('Failed to connect X account');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectX = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/x/bearer/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        setConnectionStatus('disconnected');
        setXUsername('');
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
            Simply enter your X username to connect your account
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Twitter className="w-6 h-6 text-blue-400" />
                X Connection Status
              </CardTitle>
              <CardDescription>
                Connect your X account using your username
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {getConnectionStatusIcon()}
                <span className={`font-semibold ${getConnectionStatusColor()}`}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Not Connected'}
                </span>
              </div>

              {connectionStatus === 'connected' ? (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm">
                      ✅ Connected to @{xUsername}
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
                      <div className="space-y-2">
                        <Label htmlFor="xUsername">X Username</Label>
                        <Input
                          id="xUsername"
                          type="text"
                          placeholder="Enter your X username (without @)"
                          value={xUsername}
                          onChange={(e) => setXUsername(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <Button 
                        onClick={connectX}
                        disabled={isConnecting || !xUsername.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Twitter className="w-4 h-4 mr-2" />
                        {isConnecting ? 'Connecting...' : 'Connect X Account'}
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