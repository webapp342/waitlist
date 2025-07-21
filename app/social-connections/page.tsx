"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Twitter, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Activity,
  Zap,
  Star,
  Trophy,
  Gift
} from 'lucide-react';
import Image from 'next/image';

interface ConnectionStatus {
  isConnected: boolean;
  platform: 'x' | 'telegram' | 'discord';
  username?: string;
  avatarUrl?: string;
  verified?: boolean;
  canClaimReward?: boolean;
  discordId?: string;
  stats?: {
    followers?: number;
    messages?: number;
    xp?: number;
    level?: string;
    dailyReward?: number;
  };
}

interface SocialConnections {
  x: ConnectionStatus;
  telegram: ConnectionStatus;
  discord: ConnectionStatus;
}

export default function SocialConnectionsPage() {
  const { address, isConnected } = useAccount();
  const [connections, setConnections] = useState<SocialConnections>({
    x: { isConnected: false, platform: 'x' },
    telegram: { isConnected: false, platform: 'telegram' },
    discord: { isConnected: false, platform: 'discord' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Check all social connections
  const checkAllConnections = async () => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    
    try {
      // Check X connection
      const xResponse = await fetch('/api/x/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      if (xResponse.ok) {
        const xData = await xResponse.json();
        setConnections(prev => ({
          ...prev,
          x: {
            isConnected: xData.connected,
            platform: 'x',
            username: xData.xUser?.username,
            avatarUrl: xData.xUser?.profile_image_url,
            verified: xData.xUser?.verified,
            stats: {
              followers: xData.xUser?.followers_count,
              messages: xData.xUser?.tweet_count
            }
          }
        }));
      }

      // Check Telegram connection
      const telegramResponse = await fetch(`/api/telegram/stats?walletAddress=${address}`);
      
      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();
        console.log('Telegram API Response:', telegramData);
        setConnections(prev => ({
          ...prev,
          telegram: {
            isConnected: telegramData.isConnected,
            platform: 'telegram',
            username: telegramData.username,
            canClaimReward: telegramData.canClaimReward,
            stats: {
              messages: telegramData.messageCount,
              xp: telegramData.totalXP,
              level: `Level ${telegramData.currentLevel}`,
              dailyReward: telegramData.dailyReward
            }
          }
        }));
      }

      // Check Discord connection
      const discordResponse = await fetch(`/api/discord/stats?walletAddress=${address}`);
      
      if (discordResponse.ok) {
        const discordData = await discordResponse.json();
        console.log('Discord API Response:', discordData);
        setConnections(prev => ({
          ...prev,
          discord: {
            isConnected: discordData.isConnected,
            platform: 'discord',
            username: discordData.username,
            avatarUrl: discordData.avatarUrl,
            verified: discordData.verified,
            canClaimReward: discordData.canClaimReward,
            discordId: discordData.discordId,
            stats: {
              messages: discordData.messageCount,
              xp: discordData.totalXP,
              level: discordData.currentLevel,
              dailyReward: discordData.dailyReward
            }
          }
        }));
      }

    } catch (error) {
      console.error('Error checking social connections:', error);
      toast.error('Failed to check social connections');
    } finally {
      setIsLoading(false);
    }
  };

  // Check connections on mount and wallet connection
  useEffect(() => {
    checkAllConnections();
  }, [isConnected, address]);

  const getPlatformInfo = (platform: 'x' | 'telegram' | 'discord') => {
    switch (platform) {
      case 'x':
        return {
          name: 'X (Twitter)',
          icon: Twitter,
          color: 'text-blue-400',
          bgColor: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
          description: 'Connect your X account to earn social rewards',
          connectUrl: '/x'
        };
      case 'telegram':
        return {
          name: 'Telegram',
          icon: MessageSquare,
          color: 'text-blue-500',
          bgColor: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
          description: 'Connect your Telegram account to earn community rewards',
          connectUrl: '/telegram'
        };
      case 'discord':
        return {
          name: 'Discord',
          icon: Users,
          color: 'text-purple-400',
          bgColor: 'bg-purple-600',
          hoverColor: 'hover:bg-purple-700',
          description: 'Connect your Discord account to earn community rewards',
          connectUrl: '/discord'
        };
    }
  };

  const getConnectedCount = () => {
    return Object.values(connections).filter(conn => conn.isConnected).length;
  };

  const getTotalRewards = () => {
    let total = 0;
    if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
      total += connections.telegram.stats?.dailyReward || 0;
    }
    if (connections.discord.isConnected && connections.discord.canClaimReward) {
      total += connections.discord.stats?.dailyReward || 0;
    }
    return total;
  };

  const hasClaimableRewards = () => {
    const telegramClaimable = connections.telegram.isConnected && connections.telegram.canClaimReward;
    const discordClaimable = connections.discord.isConnected && connections.discord.canClaimReward;
    
    console.log('Claimable Rewards Debug:', {
      telegram: {
        isConnected: connections.telegram.isConnected,
        canClaimReward: connections.telegram.canClaimReward,
        claimable: telegramClaimable
      },
      discord: {
        isConnected: connections.discord.isConnected,
        canClaimReward: connections.discord.canClaimReward,
        claimable: discordClaimable
      },
      totalClaimable: telegramClaimable || discordClaimable
    });
    
    return telegramClaimable || discordClaimable;
  };

  const claimAllRewards = async () => {
    if (!address || !hasClaimableRewards()) return;

    setIsClaiming(true);
    const claimedRewards = [];

    try {
      // Claim Telegram reward if available
      if (connections.telegram.isConnected && connections.telegram.canClaimReward) {
        try {
          const response = await fetch('/api/telegram/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address }),
          });

          if (response.ok) {
            const data = await response.json();
            claimedRewards.push(`Telegram: ${data.reward.amount} BBLP`);
          }
        } catch (error) {
          console.error('Error claiming Telegram reward:', error);
        }
      }

      // Claim Discord reward if available
      if (connections.discord.isConnected && connections.discord.canClaimReward) {
        try {
          const response = await fetch('/api/discord/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              discordId: connections.discord.discordId 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            claimedRewards.push(`Discord: ${data.rewardAmount} BBLP`);
          }
        } catch (error) {
          console.error('Error claiming Discord reward:', error);
        }
      }

      if (claimedRewards.length > 0) {
        toast.success(`Successfully claimed: ${claimedRewards.join(', ')}`);
        // Refresh connections to update claim status
        await checkAllConnections();
      } else {
        toast.error('No rewards available to claim');
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error('Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  function isValidImageUrl(url?: string) {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center">Connect Wallet First</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Please connect your wallet to manage social connections
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Social Connections
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Connect your social media accounts to maximize your rewards and community engagement
          </p>
        </div>

        {/* Connection Overview */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-400" />
                Connection Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {getConnectedCount()}/3
                  </div>
                  <p className="text-gray-400">Platforms Connected</p>
                </div>
                <div className="text-center p-4 bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {getTotalRewards()} BBLP
                  </div>
                  <p className="text-gray-400">Daily Check In</p>
                </div>
                <div className="text-center p-4 bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {getConnectedCount() === 3 ? '100%' : `${Math.round((getConnectedCount() / 3) * 100)}%`}
                  </div>
                  <p className="text-gray-400">Completion Rate</p>
                </div>
              </div>
              
              {/* Daily Check In Button */}
              <div className="mt-6 text-center">
                <Button
                  onClick={claimAllRewards}
                  disabled={!hasClaimableRewards() || isClaiming}
                  className={`w-full max-w-md ${
                    hasClaimableRewards() 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isClaiming ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Claiming...
                    </div>
                  ) : hasClaimableRewards() ? (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Claim Daily Rewards
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      All Rewards Claimed
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['x', 'telegram', 'discord'] as const).map((platform) => {
            const connection = connections[platform];
            const platformInfo = getPlatformInfo(platform);
            const IconComponent = platformInfo.icon;

            return (
              <Card key={platform} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <IconComponent className={`w-6 h-6 ${platformInfo.color}`} />
                    {platformInfo.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {platformInfo.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {connection.isConnected ? (
                    <div className="space-y-4">
                      {/* Connected Status */}
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-500">Connected</span>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold">{connection.username}</p>
                          {connection.verified && (
                            <Badge className="bg-blue-500 text-xs">Verified</Badge>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      {connection.stats && (
                        <div className="grid grid-cols-2 gap-3">
                          {connection.stats.followers && (
                            <div className="text-center p-2 bg-gray-800 rounded">
                              <p className="text-lg font-bold text-blue-400">
                                {connection.stats.followers.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400">Followers</p>
                            </div>
                          )}
                          {connection.stats.messages && (
                            <div className="text-center p-2 bg-gray-800 rounded">
                              <p className="text-lg font-bold text-green-400">
                                {connection.stats.messages.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400">Messages</p>
                            </div>
                          )}
                          {connection.stats.xp && (
                            <div className="text-center p-2 bg-gray-800 rounded">
                              <p className="text-lg font-bold text-yellow-400">
                                {connection.stats.xp.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400">XP</p>
                            </div>
                          )}
                          {connection.stats.level && (
                            <div className="text-center p-2 bg-gray-800 rounded">
                              <p className="text-lg font-bold text-purple-400">
                                {connection.stats.level}
                              </p>
                              <p className="text-xs text-gray-400">Level</p>
                            </div>
                          )}
                          {connection.stats.dailyReward && (
                            <div className="text-center p-2 bg-gray-800 rounded">
                              <p className="text-lg font-bold text-pink-400">
                                {connection.stats.dailyReward} BBLP
                              </p>
                              <p className="text-xs text-gray-400">Daily Reward</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Not Connected Status */}
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="font-semibold text-red-500">Not Connected</span>
                      </div>

                      <p className="text-gray-400 text-sm">
                        Connect your {platformInfo.name} account to start earning rewards
                      </p>

                      {/* Connect Button */}
                      <Button 
                        onClick={() => window.location.href = platformInfo.connectUrl}
                        className={`w-full ${platformInfo.bgColor} ${platformInfo.hoverColor}`}
                      >
                        <IconComponent className="w-4 h-4 mr-2" />
                        Connect {platformInfo.name}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Star className="w-6 h-6 text-yellow-400" />
                Benefits of Connecting All Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Maximum Daily Rewards</h4>
                      <p className="text-gray-400 text-sm">Earn up to 11 BBLP tokens daily across all platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Multi-Platform Activity</h4>
                      <p className="text-gray-400 text-sm">Track your engagement across X, Telegram, and Discord</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Community Integration</h4>
                      <p className="text-gray-400 text-sm">Connect with BBLIP community across all social platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-purple-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">Exclusive Perks</h4>
                      <p className="text-gray-400 text-sm">Unlock special rewards and features for active users</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={checkAllConnections}
            disabled={isLoading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking...
              </div>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Refresh Connections
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 