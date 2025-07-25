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
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  // Otomatik yönlendirme: Telegram bağlıysa
  useEffect(() => {
    if (isConnected && telegramStats.isConnected) {
      router.replace('/social-connections');
    }
  }, [isConnected, telegramStats.isConnected, router]);

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

    // URL parametrelerini kontrol et (callback için)
    const urlParams = new URLSearchParams(window.location.search);
    const authId = urlParams.get('id');
    const authFirstName = urlParams.get('first_name');
    const authUsername = urlParams.get('username');
    const authPhotoUrl = urlParams.get('photo_url');
    const authDate = urlParams.get('auth_date');
    const authHash = urlParams.get('hash');

    if (authId && authFirstName) {
      console.log('🔗 URL callback detected!');
      console.log('  - ID:', authId);
      console.log('  - First Name:', authFirstName);
      console.log('  - Username:', authUsername);
      
      const user = {
        id: parseInt(authId),
        first_name: authFirstName,
        username: authUsername || undefined,
        photo_url: authPhotoUrl || undefined,
        auth_date: parseInt(authDate || '0'),
        hash: authHash || ''
      };
      
      console.log('📦 Constructed user object:', user);
      handleTelegramLogin(user);
    }

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
    console.log('🔐 handleTelegramLogin called with user:', user);
    console.log('💰 Current wallet address:', address);
    
    if (!address) {
      console.log('❌ No wallet address found');
      toast.error('Please connect your wallet first');
      return;
    }

    console.log('⏳ Starting Telegram connection process...');
    setIsLoading(true);
    
    try {
      const requestBody = {
        telegramUser: user,
        walletAddress: address
      };
      
      console.log('📤 Sending request to /api/telegram/connect');
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response received:');
      console.log('  - Status:', response.status);
      console.log('  - OK:', response.ok);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📄 Response data:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        if (data.isAlreadyConnected) {
          console.log('✅ User already connected');
          toast.success('Telegram already connected! 🎉');
        } else {
          console.log('✅ User connected successfully');
          toast.success('Telegram connected successfully! 🎉');
        }
        
        console.log('🔄 Refreshing Telegram status...');
        await checkTelegramStatus();
        setShowTelegramWidget(false);
        console.log('✅ Telegram connection process completed');
      } else {
        console.log('❌ API error response:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - Error:', data.error);
        console.log('  - Full response:', JSON.stringify(data, null, 2));
        toast.error(data.error || 'Failed to connect Telegram');
      }
    } catch (error) {
      console.error('💥 CRITICAL ERROR connecting Telegram:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', JSON.stringify(error, null, 2));
      
      // Network error kontrolü
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error detected - possible CORS or connection issue');
        toast.error('Network error - please check your connection');
      } else {
        toast.error('Failed to connect Telegram - please try again');
      }
    } finally {
      console.log('🏁 Setting loading to false');
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

  // Gateway ekranı: Cüzdan bağlı değilse veya Telegram bağlı değilse sadece bağlantı ekranı göster
  if (isConnected === undefined || isConnected === null || address === undefined) {
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

  if ((isConnected === false || !address)) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #000000 100%)' }}>
        <div className="max-w-2xl mx-auto text-center pt-20">
         
          
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-4">
            Connect Telegram
          </h1>
          <p className="text-[#A1A1AA] mb-8 max-w-md mx-auto">
            Connect your wallet first to link your Telegram account
          </p>
          
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 rounded-xl px-8 py-3 font-bold shadow-lg"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!telegramStats.isConnected) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #000000 100%)' }}>
        <div className="max-w-2xl mx-auto text-center pt-20">
     
          
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-4">
            Connect Telegram
          </h1>
          <p className="text-[#A1A1AA] mb-8 max-w-md mx-auto">
            Link your Telegram account to start earning XP and rewards
          </p>
          
          <Button
            onClick={() => setShowTelegramWidget(true)}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 rounded-xl px-8 py-3 font-bold shadow-lg disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Connect Telegram
              </div>
            )}
          </Button>
          
          {typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
            <p className="text-xs text-[#6B7280] text-center mt-4">
              📱 Telegram app will open automatically
            </p>
          )}
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

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #000000 100%)' }}>
      <div className="max-w-2xl mx-auto text-center pt-20">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#F7FF9B] via-yellow-300 to-[#F7FF9B] animate-text-shine mb-4">
          Telegram Connected
        </h1>
        <p className="text-[#A1A1AA] mb-8 max-w-md mx-auto">
          @{telegramStats.username} • {telegramStats.totalXP} XP • Level {telegramStats.currentLevel}
        </p>
        
        <div className="bg-[#23232A] border border-[#2A2A2E] rounded-2xl p-6 mb-6">
          <div className="text-2xl font-bold text-purple-400 mb-2">
            {telegramStats.dailyReward} Points
          </div>
          <p className="text-[#A1A1AA] text-sm mb-4">Daily Reward Available</p>
          
          <Button 
            onClick={claimDailyReward}
            disabled={!telegramStats.canClaimReward || isLoading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 rounded-xl px-8 py-3 font-bold shadow-lg disabled:opacity-50 w-full"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 animate-spin" />
                Claiming...
              </div>
            ) : telegramStats.canClaimReward ? (
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Claim Reward
              </div>
            ) : (
              "Claimed Today"
            )}
          </Button>
        </div>
        
        <Button 
          onClick={() => router.push('/social-connections')}
          variant="outline" 
          className="border-[#35353B] text-[#A1A1AA] hover:bg-[#23232A] transition-all duration-300 rounded-xl px-6 py-2"
        >
          Back to Social Connections
        </Button>
      </div>
    </div>
  );
} 