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
  XCircle
} from 'lucide-react';
import Image from 'next/image';

interface DiscordStats {
  isConnected: boolean;
  discordId?: string;
  username?: string;
  discriminator?: string;
  avatarUrl?: string;
  verified?: boolean;
  premiumType?: number;
  isInBBLIPGuild?: boolean;
  currentLevel: string;
  currentLevelNumber: number;
  totalXP: number;
  dailyStreak: number;
  messageCount: number;
  reactionsReceived: number;
  guildCount: number;
  dailyReward: number;
  canClaimReward: boolean;
  nextLevelXP: number;
  progressToNextLevel: number;
  maxXPForCurrentLevel: number;
}

const LEVELS = [
  { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1, color: 'bg-amber-600' },
  { name: 'Silver', minXP: 101, maxXP: 250, reward: 3, color: 'bg-gray-400' },
  { name: 'Gold', minXP: 251, maxXP: 500, reward: 5, color: 'bg-yellow-500' },
  { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10, color: 'bg-blue-500' },
  { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20, color: 'bg-purple-500' }
];

export default function DiscordPage() {
  const { address, isConnected } = useAccount();
  const [discordStats, setDiscordStats] = useState<DiscordStats>({
    isConnected: false,
    currentLevel: 'Bronze',
    currentLevelNumber: 1,
    totalXP: 0,
    dailyStreak: 0,
    messageCount: 0,
    reactionsReceived: 0,
    guildCount: 0,
    dailyReward: 1,
    canClaimReward: false,
    nextLevelXP: 101,
    progressToNextLevel: 0,
    maxXPForCurrentLevel: 100,
    isInBBLIPGuild: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check URL parameters for OAuth results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'connected') {
      toast.success('Discord account connected successfully!');
      checkDiscordStatus();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'already_connected') {
      toast.success('Discord account already connected!');
      checkDiscordStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'access_denied': 'Discord connection was cancelled',
        'invalid_session': 'Invalid or expired session',
        'account_taken': 'This Discord account is already connected to another wallet',
        'wallet_has_discord': 'This wallet is already connected to another Discord account',
        'save_failed': 'Failed to save Discord connection',
        'callback_error': 'Error during Discord connection',
        'missing_parameters': 'Missing required parameters',
        'database_error': 'Database error occurred'
      };
      
      toast.error(errorMessages[error] || 'Discord connection failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check Discord status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkDiscordStatus();
    }
  }, [isConnected, address]);

  const checkDiscordStatus = async () => {
    if (!address) return;
    
    console.log('Checking Discord status for wallet:', address.substring(0, 8) + '...');
    
    try {
      const response = await fetch(`/api/discord/stats?walletAddress=${address}`);
      const data = await response.json();
      
      console.log('Discord stats response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      if (response.ok) {
        setDiscordStats(data);
        console.log('Discord stats updated:', data.isConnected ? 'Connected' : 'Not connected');
      } else {
        console.error('Error fetching Discord stats:', data.error);
      }
    } catch (error) {
      console.error('Error checking Discord status:', error);
    }
  };

  const connectDiscord = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/discord/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Discord OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || 'Failed to initiate Discord connection');
      }
    } catch (error) {
      console.error('Error connecting Discord:', error);
      toast.error('Failed to connect Discord account');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDiscord = async () => {
    if (!address) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/discord/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Discord account disconnected successfully');
        setDiscordStats({
          isConnected: false,
          currentLevel: 'Bronze',
          currentLevelNumber: 1,
          totalXP: 0,
          dailyStreak: 0,
          messageCount: 0,
          reactionsReceived: 0,
          guildCount: 0,
          dailyReward: 1,
          canClaimReward: false,
          nextLevelXP: 101,
          progressToNextLevel: 0,
          maxXPForCurrentLevel: 100,
          isInBBLIPGuild: false
        });
      } else {
        toast.error(data.error || 'Failed to disconnect Discord account');
      }
    } catch (error) {
      console.error('Error disconnecting Discord:', error);
      toast.error('Failed to disconnect Discord account');
    } finally {
      setIsLoading(false);
    }
  };

  const claimDailyReward = async () => {
    if (!address || !discordStats.canClaimReward) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/discord/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: address,
          discordId: discordStats.discordId 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Claimed ${discordStats.dailyReward} BBLP daily reward!`);
        checkDiscordStatus(); // Refresh stats
      } else {
        toast.error(data.error || 'Failed to claim daily reward');
      }
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      toast.error('Failed to claim daily reward');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLevel = () => {
    return LEVELS.find(level => level.name === discordStats.currentLevel) || LEVELS[0];
  };

  const getNextLevel = () => {
    const currentIndex = LEVELS.findIndex(level => level.name === discordStats.currentLevel);
    return LEVELS[currentIndex + 1] || null;
  };

  const getProgressToNextLevel = () => {
    if (discordStats.maxXPForCurrentLevel === 0) return 0;
    return (discordStats.progressToNextLevel / discordStats.maxXPForCurrentLevel) * 100;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <MessageSquare className="w-16 h-16 mx-auto text-purple-400 mb-4" />
              <h1 className="text-4xl font-bold text-white mb-4">Connect Discord</h1>
              <p className="text-gray-300 text-lg">
                Connect your Discord account to earn XP and BBLP rewards for your community activity!
              </p>
            </div>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8">
                <div className="text-center">
                  <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                  <h2 className="text-2xl font-semibold text-white mb-2">Wallet Not Connected</h2>
                  <p className="text-gray-300 mb-6">
                    Please connect your wallet first to link your Discord account.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Connect Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <MessageSquare className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">Discord Integration</h1>
            <p className="text-gray-300 text-lg">
              Connect your Discord account and earn rewards for your community activity!
            </p>
          </div>

          {/* Connection Status */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {discordStats.isConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Discord Connected
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    Discord Not Connected
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discordStats.isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {discordStats.avatarUrl && (
                      <Image
                        src={discordStats.avatarUrl}
                        alt="Discord Avatar"
                        width={64}
                        height={64}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {discordStats.username}#{discordStats.discriminator}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        {discordStats.verified && (
                          <Badge className="bg-blue-500">Verified</Badge>
                        )}
                        {discordStats.premiumType && discordStats.premiumType > 0 && (
                          <Badge className="bg-purple-500">Nitro</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      onClick={disconnectDiscord}
                      disabled={isLoading}
                      variant="outline"
                      className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                    >
                      {isLoading ? 'Disconnecting...' : 'Disconnect Discord'}
                    </Button>
                    {!discordStats.isInBBLIPGuild && (
                      <Button
                        onClick={() => window.open('https://discord.gg/bblip', '_blank')}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Join BBLIP Server
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-300 mb-4">
                    Connect your Discord account to start earning XP and BBLP rewards!
                  </p>
                  <Button
                    onClick={connectDiscord}
                    disabled={isConnecting}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Discord'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats and Rewards */}
          {discordStats.isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Level and XP */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Level & XP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${getCurrentLevel().color} text-white`}>
                      {discordStats.currentLevel}
                    </div>
                    <p className="text-2xl font-bold text-white">{discordStats.totalXP} XP</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Progress to next level</span>
                      <span className="text-white">{Math.round(getProgressToNextLevel())}%</span>
                    </div>
                    <Progress value={getProgressToNextLevel()} className="h-2" />
                    <p className="text-xs text-gray-400 text-center">
                      {discordStats.progressToNextLevel} / {discordStats.maxXPForCurrentLevel} XP
                    </p>
                  </div>

                  {getNextLevel() && (
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <p className="text-sm text-gray-300">Next Level: {getNextLevel()?.name}</p>
                      <p className="text-xs text-gray-400">{discordStats.nextLevelXP} XP required</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Stats */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Activity Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <MessageSquare className="w-6 h-6 mx-auto text-green-400 mb-1" />
                      <p className="text-lg font-semibold text-white">{discordStats.messageCount}</p>
                      <p className="text-xs text-gray-400">Messages</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <Star className="w-6 h-6 mx-auto text-yellow-400 mb-1" />
                      <p className="text-lg font-semibold text-white">{discordStats.reactionsReceived}</p>
                      <p className="text-xs text-gray-400">Reactions</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <Users className="w-6 h-6 mx-auto text-purple-400 mb-1" />
                      <p className="text-lg font-semibold text-white">{discordStats.guildCount}</p>
                      <p className="text-xs text-gray-400">Servers</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <TrendingUp className="w-6 h-6 mx-auto text-blue-400 mb-1" />
                      <p className="text-lg font-semibold text-white">{discordStats.dailyStreak}</p>
                      <p className="text-xs text-gray-400">Day Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Rewards */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-400" />
                    Daily Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{discordStats.dailyReward} BBLP</p>
                    <p className="text-gray-300">Daily Reward</p>
                  </div>
                  
                  <Button
                    onClick={claimDailyReward}
                    disabled={!discordStats.canClaimReward || isLoading}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {isLoading ? 'Claiming...' : 
                     discordStats.canClaimReward ? 'Claim Daily Reward' : 'Already Claimed Today'}
                  </Button>
                  
                  {!discordStats.canClaimReward && (
                    <p className="text-xs text-gray-400 text-center">
                      Come back tomorrow for your next reward!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Level Rewards */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    Level Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {LEVELS.map((level, index) => (
                      <div
                        key={level.name}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          discordStats.currentLevel === level.name
                            ? 'bg-white/20 border border-white/30'
                            : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${level.color}`} />
                          <span className={`text-sm ${
                            discordStats.currentLevel === level.name ? 'text-white font-semibold' : 'text-gray-300'
                          }`}>
                            {level.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">{level.reward} BBLP/day</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Features Info */}
          {!discordStats.isConnected && (
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 mt-8">
              <CardHeader>
                <CardTitle className="text-white">Discord Integration Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">🎮 Community Activity</h3>
                    <ul className="text-gray-300 space-y-1 text-sm">
                      <li>• Earn XP for sending messages</li>
                      <li>• Get rewards for receiving reactions</li>
                      <li>• Daily activity streaks</li>
                      <li>• Server participation tracking</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">💎 Reward System</h3>
                    <ul className="text-gray-300 space-y-1 text-sm">
                      <li>• Daily BBLP token rewards</li>
                      <li>• Level-based reward scaling</li>
                      <li>• Automatic level progression</li>
                      <li>• Community leaderboards</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 