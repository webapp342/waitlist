import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // 1. Kullanıcıyı bul
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. Telegram kullanıcı bilgilerini al
    const { data: telegramUser, error: telegramError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (telegramError && telegramError.code !== 'PGRST116') {
      console.error('Error fetching telegram user:', telegramError);
      return NextResponse.json(
        { error: 'Failed to fetch telegram user' },
        { status: 500 }
      );
    }

    if (!telegramUser) {
      // Telegram bağlı değil
      return NextResponse.json({
        isConnected: false,
        telegramId: null,
        username: null,
        currentLevel: 1,
        totalXP: 0,
        dailyStreak: 0,
        messageCount: 0,
        reactionsReceived: 0,
        dailyReward: 1,
        canClaimReward: false
      });
    }

    // 3. Telegram aktivite bilgilerini al
    const { data: activity, error: activityError } = await supabase
      .from('telegram_activities')
      .select('*')
      .eq('telegram_id', telegramUser.telegram_id)
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Error fetching telegram activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to fetch telegram activity' },
        { status: 500 }
      );
    }

    // 4. Günlük ödül durumunu kontrol et
    const today = new Date().toISOString().split('T')[0];
    const { data: todayReward, error: rewardError } = await supabase
      .from('telegram_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('reward_type', 'daily')
      .gte('created_at', today)
      .single();

    if (rewardError && rewardError.code !== 'PGRST116') {
      console.error('Error checking daily reward:', rewardError);
    }

    const canClaimReward = !todayReward;

    // 5. Level hesaplama
    const LEVELS = [
      { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
      { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
      { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
      { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
      { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
    ];

    const totalXP = activity?.total_xp || 0;
    const currentLevel = LEVELS.find(level => 
      totalXP >= level.minXP && totalXP <= level.maxXP
    ) || LEVELS[0];

    const dailyReward = currentLevel.reward;

    return NextResponse.json({
      isConnected: true,
      telegramId: telegramUser.telegram_id,
      username: telegramUser.username || telegramUser.first_name,
      currentLevel: LEVELS.indexOf(currentLevel) + 1,
      totalXP: totalXP,
      dailyStreak: activity?.weekly_streak || 0,
      messageCount: activity?.message_count || 0,
      reactionsReceived: activity?.total_reactions || 0,
      dailyReward: dailyReward,
      canClaimReward: canClaimReward
    });

  } catch (error) {
    console.error('Error in telegram stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 