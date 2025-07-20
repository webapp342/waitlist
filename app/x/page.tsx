"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Trophy, 
  Zap, 
  Users, 
  TrendingUp, 
  Crown,
  Star,
  Activity,
  Gift,
  ExternalLink,
  CheckCircle,
  XCircle,
  Twitter
} from 'lucide-react';
import Image from 'next/image';

interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
}

export default function XPage() {
  const { address, isConnected } = useAccount();
  const [xUser, setXUser] = useState<XUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showXWidget, setShowXWidget] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Check X connection status on mount
  useEffect(() => {
    if (isConnected && address) {
      checkXStatus();
    }
  }, [isConnected, address]);

  const checkXStatus = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/x/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();
      
      if (response.ok && data.connected) {
        setXUser(data.xUser);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking X status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleXLogin = async (code: string, state: string) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/x/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state,
          walletAddress: address
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.isAlreadyConnected) {
          toast.success('X account already connected! 🎉');
        } else {
          toast.success('X account connected successfully! 🎉');
        }
        
        await checkXStatus();
        setShowXWidget(false);
      } else {
        toast.error(data.error || 'Failed to connect X account');
      }
    } catch (error) {
      console.error('Error connecting X account:', error);
      toast.error('Failed to connect X account');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectX = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/x/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        setXUser(null);
        setConnectionStatus('disconnected');
        toast.success('X account disconnected successfully');
      } else {
        toast.error('Failed to disconnect X account');
      }
    } catch (error) {
      console.error('Error disconnecting X account:', error);
      toast.error('Failed to disconnect X account');
    }
  };

  const initiateXAuth = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('x_auth_state', state);

    // X OAuth URL
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    
    // Debug logging
    console.log('Client ID:', clientId);
    console.log('Environment check:', {
      NEXT_PUBLIC_X_CLIENT_ID: process.env.NEXT_PUBLIC_X_CLIENT_ID,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // Check if client ID is available
    if (!clientId) {
      toast.error('X OAuth configuration is missing. Please check environment variables.');
      console.error('NEXT_PUBLIC_X_CLIENT_ID is not defined');
      return;
    }
    
    // Use exact redirect URI that matches X Developer settings
    const redirectUri = 'https://www.bblip.io/x/callback';
    const scope = 'tweet.read users.read offline.access';
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    localStorage.setItem('x_code_verifier', codeVerifier);
    
    // Generate personalization_id (required by X API)
    const personalizationId = 'v1_' + Math.random().toString(36).substring(2, 15) + '==';
    
    // Build OAuth URL according to latest X documentation
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `code_challenge_method=S256&` +
      `code_challenge=${codeChallenge}&` +
      `personalization_id=${encodeURIComponent(personalizationId)}`;

    console.log('Auth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    console.log('Code Verifier:', codeVerifier);
    console.log('Code Challenge:', codeChallenge);
    
    // Try opening in new window first, fallback to redirect
    try {
      const authWindow = window.open(authUrl, '_blank', 'width=600,height=700');
      if (!authWindow) {
        // Fallback to redirect if popup blocked
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Error opening auth window:', error);
      window.location.href = authUrl;
    }
  };

  // Generate PKCE code verifier
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Generate PKCE code challenge from verifier
  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Alternative OAuth method using web-based flow
  const initiateXAuthAlternative = () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    if (!clientId) {
      toast.error('X OAuth configuration is missing.');
      return;
    }

    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('x_auth_state', state);
    
    // Use exact redirect URI that matches X Developer settings
    const redirectUri = 'https://www.bblip.io/x/callback';
    
    // Use web-based OAuth flow
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=tweet.read%20users.read%20offline.access&` +
      `state=${state}`;

    console.log('Alternative Auth URL:', authUrl);
    console.log('Alternative Redirect URI:', redirectUri);
    window.location.href = authUrl;
  };

  // Server-side OAuth method
  const initiateServerSideAuth = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsConnecting(true);
      
      const response = await fetch('/api/x/auth');
      const data = await response.json();
      
      if (response.ok) {
        console.log('Server Auth URL:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || 'Failed to generate OAuth URL');
      }
    } catch (error) {
      console.error('Error initiating server-side auth:', error);
      toast.error('Failed to start authentication');
    } finally {
      setIsConnecting(false);
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
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Connect Your X Account
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Link your X (Twitter) account to your wallet and start earning XP rewards for your social activity!
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Connection Status Card */}
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Twitter className="w-6 h-6 text-blue-400" />
                X Account Status
              </CardTitle>
              <CardDescription>
                Connect your X account to start earning rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {getConnectionStatusIcon()}
                  <span className={`font-semibold ${getConnectionStatusColor()}`}>
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Not Connected'}
                  </span>
                </div>
                
                {connectionStatus === 'connected' ? (
                  <Button 
                    variant="outline" 
                    onClick={disconnectX}
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={initiateXAuth}
                      disabled={!isConnected || isConnecting}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Twitter className="w-4 h-4 mr-2" />
                      {isConnecting ? 'Connecting...' : 'Connect X Account'}
                    </Button>
                    
                    <Button 
                      onClick={initiateXAuthAlternative}
                      disabled={!isConnected || isConnecting}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Twitter className="w-4 h-4 mr-2" />
                      Alternative Connect Method
                    </Button>
                    
                    <Button 
                      onClick={initiateServerSideAuth}
                      disabled={!isConnected || isConnecting}
                      variant="outline"
                      className="border-green-600 text-green-300 hover:bg-green-800"
                    >
                      <Twitter className="w-4 h-4 mr-2" />
                      Server-Side OAuth
                    </Button>
                  </div>
                )}
              </div>

              {!isConnected && (
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Please connect your wallet first to link your X account
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected User Info */}
          {xUser && (
            <Card className="bg-gray-900 border-gray-800 mb-8">
              <CardHeader>
                <CardTitle>Connected X Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  {xUser.profile_image_url && (
                    <Image
                      src={xUser.profile_image_url}
                      alt={xUser.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {xUser.name}
                      {xUser.verified && (
                        <Badge className="bg-blue-500">Verified</Badge>
                      )}
                    </h3>
                    <p className="text-gray-400">@{xUser.username}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{xUser.followers_count?.toLocaleString() || 0}</p>
                    <p className="text-gray-400 text-sm">Followers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{xUser.following_count?.toLocaleString() || 0}</p>
                    <p className="text-gray-400 text-sm">Following</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{xUser.tweet_count?.toLocaleString() || 0}</p>
                    <p className="text-gray-400 text-sm">Tweets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Card */}
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-green-400" />
                X Integration Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Social XP Rewards</h4>
                      <p className="text-gray-400 text-sm">Earn XP for your X activity and engagement</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">BBLP Token Rewards</h4>
                      <p className="text-gray-400 text-sm">Get daily BBLP tokens based on your social influence</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Influence Multiplier</h4>
                      <p className="text-gray-400 text-sm">Higher follower count = higher rewards</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Community Integration</h4>
                      <p className="text-gray-400 text-sm">Connect with other BBLIP users on X</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-purple-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Real-time Updates</h4>
                      <p className="text-gray-400 text-sm">Get instant notifications about rewards and updates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Exclusive Perks</h4>
                      <p className="text-gray-400 text-sm">Access to exclusive features for connected users</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>How X Integration Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Connect Your Wallet</h4>
                    <p className="text-gray-400">First, connect your crypto wallet to establish your identity</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Link X Account</h4>
                    <p className="text-gray-400">Connect your X account securely using OAuth 2.0</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Start Earning</h4>
                    <p className="text-gray-400">Earn XP and BBLP tokens based on your social activity and influence</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Track Progress</h4>
                    <p className="text-gray-400">Monitor your rewards and level up in the BBLIP ecosystem</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 