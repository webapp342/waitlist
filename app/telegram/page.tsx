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

// Telegram Login Widget için global type
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: any) => void;
    };
    debugTelegramAuth?: (user: any) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramStats {
  isConnected: boolean;
  telegramId?: number;
  username?: string;
  currentLevel: number;
  totalXP: number;
  dailyStreak: number;
  messageCount: number;
  reactionsReceived: number;
  dailyReward: number;
  canClaimReward: boolean;
}

const LEVELS = [
  { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1, color: 'bg-amber-600' },
  { name: 'Silver', minXP: 101, maxXP: 250, reward: 3, color: 'bg-gray-400' },
  { name: 'Gold', minXP: 251, maxXP: 500, reward: 5, color: 'bg-yellow-500' },
  { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10, color: 'bg-blue-500' },
  { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20, color: 'bg-purple-500' }
];

export default function TelegramPage() {
  const { address, isConnected } = useAccount();
  const [telegramStats, setTelegramStats] = useState<TelegramStats>({
    isConnected: false,
    currentLevel: 1,
    totalXP: 0,
    dailyStreak: 0,
    messageCount: 0,
    reactionsReceived: 0,
    dailyReward: 1,
    canClaimReward: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTelegramWidget, setShowTelegramWidget] = useState(false);

  // Telegram callback fonksiyonu - global olarak tanımla
  useEffect(() => {
    // Global callback fonksiyonu (Telegram dokümantasyonuna göre)
    window.TelegramLoginWidget = {
      dataOnauth: function(user) {
        console.log('✅ Telegram auth callback received:', user);
        console.log('User data:', JSON.stringify(user, null, 2));
        handleTelegramLogin(user);
      }
    };

    // Debug için global fonksiyon
    window.debugTelegramAuth = function(user) {
      console.log('🔍 Debug: Telegram auth received:', user);
      handleTelegramLogin(user);
    };

    console.log('🔧 Telegram callback functions initialized');
  }, []);

  // Modal açıldığında widget'ı yükle
  useEffect(() => {
    if (showTelegramWidget) {
      const loadWidget = () => {
        const widgetContainer = document.getElementById('telegram-login-widget');
        if (widgetContainer) {
          // Mevcut widget'ı temizle
          widgetContainer.innerHTML = '';
          
          // Widget script'ini oluştur (Telegram dokümantasyonuna göre)
          const widgetScript = document.createElement('script');
          widgetScript.setAttribute('data-telegram-login', 'denemebot45bot');
          widgetScript.setAttribute('data-size', 'large');
          widgetScript.setAttribute('data-auth-url', 'https://bblip.io/telegram?auth=1');
          widgetScript.setAttribute('data-request-access', 'write');
          widgetScript.setAttribute('data-radius', '8');
          widgetScript.setAttribute('data-lang', 'en');
          widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
          widgetScript.async = true;
          
          widgetScript.onload = () => {
            console.log('✅ Telegram widget script loaded successfully');
          };
          
          widgetScript.onerror = () => {
            console.error('❌ Failed to load Telegram widget script');
            // Fallback: Manuel buton oluştur
            widgetContainer.innerHTML = `
              <div class="flex flex-col items-center gap-4">
                <p class="text-gray-400 text-sm">Telegram widget failed to load</p>
                <Button 
                  onClick={() => window.open('https://t.me/denemebot45bot?start=connect', '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="mr-2" size={16} />
                  Connect via Telegram Bot
                </Button>
              </div>
            `;
          };
          
          widgetContainer.appendChild(widgetScript);
        }
      };

      // Widget'ı yükle
      loadWidget();
    }
  }, [showTelegramWidget]);

  // Kullanıcı wallet bağlandığında Telegram durumunu kontrol et
  useEffect(() => {
    if (isConnected && address) {
      checkTelegramStatus();
    }
  }, [isConnected, address]);

  const checkTelegramStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/telegram/stats?walletAddress=${address}`);
      const data = await response.json();
      
      if (response.ok) {
        setTelegramStats(data);
      } else {
        console.error('Error fetching telegram stats:', data.error);
      }
    } catch (error) {
      console.error('Error checking Telegram status:', error);
    }
  };

  const handleTelegramLogin = async (user: TelegramUser) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUser: user,
          walletAddress: address
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.isAlreadyConnected) {
          toast.success('Telegram already connected! 🎉');
        } else {
          toast.success('Telegram connected successfully! 🎉');
        }
        
        // Stats'ı yenile
        await checkTelegramStatus();
        setShowTelegramWidget(false);
      } else {
        toast.error(data.error || 'Failed to connect Telegram');
      }
    } catch (error) {
      console.error('Error connecting Telegram:', error);
      toast.error('Failed to connect Telegram');
    } finally {
      setIsLoading(false);
    }
  };

  const claimDailyReward = async () => {
    if (!address || !telegramStats.isConnected) {
      toast.error('Please connect your wallet and Telegram first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        
        // Stats'ı yenile
        await checkTelegramStatus();
      } else {
        toast.error(data.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLevel = () => {
    return LEVELS.find(level => 
      telegramStats.totalXP >= level.minXP && telegramStats.totalXP <= level.maxXP
    ) || LEVELS[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const currentIndex = LEVELS.findIndex(level => level.name === currentLevel.name);
    return LEVELS[currentIndex + 1] || null;
  };

  const getProgressToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    if (!nextLevel) return 100;
    
    const currentLevelXP = currentLevel.maxXP - currentLevel.minXP;
    const userProgress = telegramStats.totalXP - currentLevel.minXP;
    
    return Math.min((userProgress / currentLevelXP) * 100, 100);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center">Connect Wallet First</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Please connect your wallet to access Telegram features
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="text-blue-500" />
              Telegram Integration
            </h1>
            <p className="text-gray-400 mt-2">
              Connect your Telegram account and earn XP through group activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-400">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Telegram Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Telegram Connection Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="text-blue-500" />
                  Telegram Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {telegramStats.isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={24} />
                      <div>
                        <p className="font-semibold">Connected</p>
                        <p className="text-sm text-gray-400">
                          @{telegramStats.username} (ID: {telegramStats.telegramId})
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">Messages</p>
                        <p className="text-xl font-bold">{telegramStats.messageCount}</p>
                      </div>
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">Reactions</p>
                        <p className="text-xl font-bold">{telegramStats.reactionsReceived}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="text-red-500" size={24} />
                      <div>
                        <p className="font-semibold">Not Connected</p>
                        <p className="text-sm text-gray-400">
                          Connect your Telegram account to start earning XP
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setShowTelegramWidget(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <MessageSquare className="mr-2" size={16} />
                      Connect Telegram
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Level Progress Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="text-yellow-500" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getCurrentLevel().color}`}>
                        <Crown className="text-white" size={16} />
                      </div>
                      <div>
                        <p className="font-semibold">{getCurrentLevel().name}</p>
                        <p className="text-sm text-gray-400">
                          {telegramStats.totalXP} / {getCurrentLevel().maxXP} XP
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-600">
                      Level {telegramStats.currentLevel}
                    </Badge>
                  </div>
                  
                  <Progress value={getProgressToNextLevel()} className="h-2" />
                  
                  {getNextLevel() && (
                    <p className="text-sm text-gray-400">
                      {getNextLevel().maxXP - telegramStats.totalXP} XP needed for {getNextLevel().name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="text-green-500" />
                  Activity Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="text-yellow-500" size={16} />
                      <span className="text-sm text-gray-400">Total XP</span>
                    </div>
                    <p className="text-2xl font-bold">{telegramStats.totalXP}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-green-500" size={16} />
                      <span className="text-sm text-gray-400">Daily Streak</span>
                    </div>
                    <p className="text-2xl font-bold">{telegramStats.dailyStreak} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Rewards & Info */}
          <div className="space-y-6">
            {/* Daily Reward Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="text-purple-500" />
                  Daily Reward
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-400 mb-1">Available Reward</p>
                    <p className="text-3xl font-bold text-purple-500">
                      {telegramStats.dailyReward} BBLP
                    </p>
                  </div>
                  
                  <Button 
                    onClick={claimDailyReward}
                    disabled={!telegramStats.isConnected || !telegramStats.canClaimReward || isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Claiming...
                      </div>
                    ) : (
                      <>
                        <Gift className="mr-2" size={16} />
                        Claim Daily Reward
                      </>
                    )}
                  </Button>
                  
                  {!telegramStats.canClaimReward && telegramStats.isConnected && (
                    <p className="text-sm text-gray-400 text-center">
                      Come back tomorrow for your next reward!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Level Benefits Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-500" />
                  Level Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {LEVELS.map((level, index) => (
                    <div 
                      key={level.name}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        getCurrentLevel().name === level.name 
                          ? 'bg-blue-600/20 border border-blue-500' 
                          : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${level.color}`}>
                          <Crown className="text-white" size={12} />
                        </div>
                        <div>
                          <p className="font-medium">{level.name}</p>
                          <p className="text-xs text-gray-400">
                            {level.minXP}-{level.maxXP} XP
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{level.reward} BBLP</p>
                        <p className="text-xs text-gray-400">per day</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* How It Works Card */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-blue-500" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Connect your Telegram account</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Be active in our Telegram group</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Earn XP for messages and reactions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Level up and claim daily BBLP rewards</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                  onClick={() => window.open('https://t.me/yourgroup', '_blank')}
                >
                  <ExternalLink className="mr-2" size={16} />
                  Join Our Telegram Group
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Telegram Login Widget Modal */}
      {showTelegramWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Connect Telegram</h3>
            <p className="text-gray-400 mb-4">
              Click the button below to connect your Telegram account and start earning XP!
            </p>
            <div id="telegram-login-widget" className="flex justify-center mb-4 min-h-[80px] items-center"></div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowTelegramWidget(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const widgetContainer = document.getElementById('telegram-login-widget');
                  if (widgetContainer) {
                    widgetContainer.innerHTML = '';
                    const widgetScript = document.createElement('script');
                    widgetScript.setAttribute('data-telegram-login', 'denemebot45bot');
                    widgetScript.setAttribute('data-size', 'large');
                    widgetScript.setAttribute('data-auth-url', 'https://bblip.io/telegram?auth=1');
                    widgetScript.setAttribute('data-request-access', 'write');
                    widgetScript.setAttribute('data-radius', '8');
                    widgetScript.setAttribute('data-lang', 'en');
                    widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
                    widgetScript.async = true;
                    
                    widgetContainer.appendChild(widgetScript);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Reload Widget
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 