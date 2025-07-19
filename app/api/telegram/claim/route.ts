import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

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

    // 2. Telegram kullanıcısını kontrol et
    const { data: telegramUser, error: telegramError } = await supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('user_id', user.id)
      .single();

    if (telegramError || !telegramUser) {
      return NextResponse.json(
        { error: 'Telegram account not connected' },
        { status: 400 }
      );
    }

    // 3. Bugün zaten ödül alınmış mı kontrol et
    const today = new Date().toISOString().split('T')[0];
    const { data: todayReward, error: rewardCheckError } = await supabase
      .from('telegram_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('reward_type', 'daily')
      .gte('created_at', today)
      .single();

    if (rewardCheckError && rewardCheckError.code !== 'PGRST116') {
      console.error('Error checking daily reward:', rewardCheckError);
      return NextResponse.json(
        { error: 'Failed to check daily reward' },
        { status: 500 }
      );
    }

    if (todayReward) {
      return NextResponse.json(
        { error: 'Daily reward already claimed today' },
        { status: 400 }
      );
    }

    // 4. Kullanıcının level'ını ve ödül miktarını hesapla
    const { data: activity, error: activityError } = await supabase
      .from('telegram_activities')
      .select('total_xp')
      .eq('telegram_id', telegramUser.telegram_id)
      .single();

    if (activityError) {
      console.error('Error fetching activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to fetch user activity' },
        { status: 500 }
      );
    }

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

    const rewardAmount = currentLevel.reward;

    // 5. Ödülü kaydet
    const { data: newReward, error: insertError } = await supabase
      .from('telegram_rewards')
      .insert([{
        user_id: user.id,
        reward_type: 'daily',
        bblp_amount: rewardAmount.toString(),
        xp_earned: 0,
        claimed: true
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting reward:', insertError);
      return NextResponse.json(
        { error: 'Failed to save reward' },
        { status: 500 }
      );
    }

    // 6. TODO: Burada gerçek BBLP token transferi yapılacak
    // Şimdilik sadece database'e kaydediyoruz

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${rewardAmount} BBLP!`,
      reward: {
        amount: rewardAmount,
        level: currentLevel.name,
        transactionId: newReward.id
      }
    });

  } catch (error) {
    console.error('Error in telegram claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 