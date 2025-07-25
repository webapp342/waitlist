"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Activity, 
  Gift, 
  Star, 
  Trophy, 
  TrendingUp, 
  Users, 
  Zap 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XUser, redirectToXApp } from '@/lib/xOAuth';

export default function XPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [xUser, setXUser] = useState<XUser | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check X connection status
  const checkXStatus = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/x/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await response.json();
      if (response.ok) {
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        setXUser(data.xUser);
      } else {
        setConnectionStatus('disconnected');
        setXUser(null);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setXUser(null);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  // Check status on mount and wallet connection
  useEffect(() => {
    checkXStatus();
  }, [checkXStatus]);

  // Otomatik yönlendirme: X bağlıysa
  useEffect(() => {
    if (isConnected && connectionStatus === 'connected') {
      router.replace('/social-connections');
    }
  }, [isConnected, connectionStatus, router]);

  // Disconnect X account
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

  // Initiate X OAuth
  const initiateXAuth = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

      // Create OAuth session
      const response = await fetch('/api/x/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store session ID for callback
        localStorage.setItem('x_oauth_session_id', data.sessionId);
        
        // Mobil cihazlarda kullanıcıya seçenek sun
        if (data.isMobile && typeof window !== 'undefined') {
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          if (isAndroid || isIOS) {
            // Kullanıcıya seçenek sun
            const useApp = confirm(
              'Do you want to open the X app?\n\n' +
              '✅ "YES" \n' +
              '❌ "NO" '
            );
            
            if (useApp) {
              // X uygulamasında aç
              redirectToXApp(data.authUrl, true);
              return;
            } else {
              // Web sayfasında aç
              window.location.href = data.authUrl;
              return;
            }
          } else {
            // Diğer mobil cihazlarda normal yönlendirme
            redirectToXApp(data.authUrl, data.isMobile);
            return;
          }
        } else {
          // Desktop'ta normal yönlendirme
          redirectToXApp(data.authUrl, data.isMobile);
          return;
        }
      } else {
        setConnectionStatus('disconnected');
        toast.error(data.error || 'Failed to start X authentication');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error initiating X auth:', error);
      setConnectionStatus('disconnected');
      toast.error('Failed to start X authentication');
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

  // Gateway ve loading mantığı
  if (loading || isConnecting || isConnected === undefined || isConnected === null || address === undefined) {
    return (
      <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-2 md:pt-2 bg-black">
        <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-center py-20 mt-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
              <Image 
                src="/logo.svg" 
                alt="BBLP" 
                width={32} 
                height={32} 
                className="absolute inset-0 m-auto animate-pulse" 
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isConnected === false || !address) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">Connect X</h1>
        <p className="text-gray-300 text-lg mb-8 text-center max-w-md">Connect your X (Twitter) account to start earning XP and Points rewards for your social activity.</p>
        <Button 
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-lg"
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (connectionStatus !== 'connected') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">Connect X</h1>
        <p className="text-gray-300 text-lg mb-8 text-center max-w-md">Connect your X (Twitter) account to start earning XP and Points rewards for your social activity.</p>
        <Button
          onClick={initiateXAuth}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-lg"
        >
          {isConnecting ? 'Connecting...' : 'Connect X'}
        </Button>
      </div>
    );
  }

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
                      {isConnecting ? 'Connecting...' : 'Connect X Account'}
                    </Button>
                    
                    {/* Mobil cihazlarda ek bilgi */}
                    {typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                      <div className="text-xs text-gray-400 text-center mt-2">
                        📱 X uygulaması açılacak. Uygulama yüklü değilse web sayfasına yönlendirileceksiniz.
                      </div>
                    )}
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
                      <h4 className="font-semibold">Points Token Rewards</h4>
                      <p className="text-gray-400 text-sm">Get daily Points tokens based on your social influence</p>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 