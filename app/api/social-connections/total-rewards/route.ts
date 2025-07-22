import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    // 1. X Tasks (user_dailytask_claims)
    const { data: xTasks, error: xTasksError } = await supabase
      .from('user_dailytask_claims')
      .select('reward')
      .eq('user_id', walletAddress)
      .eq('completed', true);
    const xTasksTotal = (xTasks || []).reduce((sum, row) => sum + (row.reward || 0), 0);

    // 2. Telegram Daily (telegram_rewards)
    // Need to get user_id from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();
    let telegramTotal = 0;
    let extraRewardsTotal = 0;
    let inviteRewardsTotal = 0;
    if (user) {
      // Telegram Daily
      const { data: telegramRewards } = await supabase
        .from('telegram_rewards')
        .select('bblp_amount')
        .eq('user_id', user.id)
        .eq('reward_type', 'daily')
        .eq('claimed', true);
      telegramTotal = (telegramRewards || []).reduce((sum, row) => sum + parseInt(row.bblp_amount || '0', 10), 0);

      // Extra Rewards (XP)
      const { data: extraRewards } = await supabase
        .from('extra_rewards')
        .select('xp_reward')
        .eq('user_id', user.id)
        .eq('claimed', true);
      extraRewardsTotal = (extraRewards || []).reduce((sum, row) => sum + (row.xp_reward || 0), 0);

      // Invite Friends
      const { data: inviteRewards } = await supabase
        .from('invite_rewards')
        .select('points_awarded')
        .eq('user_id', user.id);
      inviteRewardsTotal = (inviteRewards || []).reduce((sum, row) => sum + (row.points_awarded || 0), 0);
    }

    // 3. Discord Daily (discord_daily_claims)
    const { data: discordClaims } = await supabase
      .from('discord_daily_claims')
      .select('reward_amount')
      .eq('wallet_address', walletAddress);
    const discordTotal = (discordClaims || []).reduce((sum, row) => sum + (row.reward_amount || 0), 0);

    // 4. Staking Tasks
    const { data: stakingTasks } = await supabase
      .from('staking_tasks')
      .select('points')
      .eq('wallet_address', walletAddress)
      .eq('claimed', true);
    const stakingTotal = (stakingTasks || []).reduce((sum, row) => sum + (row.points || 0), 0);

    // Toplam
    const totalPoints = xTasksTotal + telegramTotal + discordTotal + extraRewardsTotal + inviteRewardsTotal + stakingTotal;

    return NextResponse.json({
      success: true,
      totalPoints,
      breakdown: {
        xTasksTotal,
        telegramTotal,
        discordTotal,
        extraRewardsTotal,
        inviteRewardsTotal,
        stakingTotal
      }
    });
  } catch (error) {
    console.error('Error in total-rewards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 