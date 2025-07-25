import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isUserInGuild, refreshDiscordToken } from '@/lib/discordOAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // 1. Get user ID once
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        x: { connected: false, stats: { xp: 0, level: 0, dailyReward: 0 } },
        telegram: { connected: false, stats: { xp: 0, level: 0, dailyReward: 0 } },
        discord: { connected: false, stats: { xp: 0, level: 0, dailyReward: 0 } },
        totalXP: 0,
        totalSocialPoints: 0,
        referralStats: { totalReferrals: 0, totalRewards: '0' },
        stakingTasks: {},
        dailyTasks: [],
        extraRewards: { telegram: [], discord: [] }
      });
    }

    const userId = user.id;

    // 2. Parallel database queries for all platforms
    const [
      xUserResult,
      telegramUserResult,
      discordUserResult,
      referralResult,
      stakingTasksResult,
      dailyTasksResult,
      totalSocialPointsResult
    ] = await Promise.all([
      // X User
      supabaseAdmin
        .from('x_users')
        .select(`
          x_user_id,
          x_username,
          x_name,
          x_profile_image_url,
          x_verified,
          x_followers_count,
          x_following_count,
          x_tweet_count
        `)
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single(),

      // Telegram User + Activity + Daily Reward
      supabaseAdmin
        .from('telegram_users')
        .select(`
          telegram_id,
          username,
          first_name
        `)
        .eq('user_id', userId)
        .single(),

      // Discord User + Activity + Daily Reward
      supabaseAdmin
        .from('discord_users')
        .select(`
          discord_id,
          username,
          discriminator,
          avatar_url,
          verified,
          premium_type,
          is_in_guild,
          access_token,
          refresh_token,
          token_expires_at
        `)
        .eq('user_id', walletAddress)
        .eq('is_active', true)
        .single(),

      // Referral Stats
      supabaseAdmin
        .from('referral_codes')
        .select(`
          code,
          referrals!inner(count)
        `)
        .eq('user_id', userId)
        .single(),

      // Staking Tasks
      supabaseAdmin
        .from('staking_tasks')
        .select('stake_amount, points, claimed')
        .eq('wallet_address', walletAddress),

      // Daily Tasks
      supabaseAdmin
        .from('user_dailytask_claims')
        .select('task_id, reward, completed')
        .eq('user_id', walletAddress),

      // Total Social Points
      supabaseAdmin.rpc('get_total_social_points', { p_wallet_address: walletAddress })
    ]);

    // 3. Process X data
    const xData = xUserResult.data ? {
      connected: true,
      username: xUserResult.data.x_username,
      avatarUrl: xUserResult.data.x_profile_image_url,
      verified: xUserResult.data.x_verified,
      stats: {
        followers: xUserResult.data.x_followers_count,
        messages: xUserResult.data.x_tweet_count,
        xp: 0, // X doesn't have XP system yet
        level: 0,
        dailyReward: 0,
        isGrokTaskWinner: false // Will be set below
      }
    } : {
      connected: false,
      stats: { xp: 0, level: 0, dailyReward: 0, isGrokTaskWinner: false }
    };

    // Check if user is a grok task winner
    if (xUserResult.data?.x_username) {
      console.log('🔍 Checking grok winner for x_username:', xUserResult.data.x_username);
      console.log('🔍 Lowercase x_username:', xUserResult.data.x_username.toLowerCase());
      
             const { data: grokWinner, error: grokError } = await supabaseAdmin
         .from('grok_task_winners')
         .select('id')
         .eq('x_username', xUserResult.data.x_username)
         .eq('is_active', true)
         .single();
      
      console.log('🔍 Grok winner result:', grokWinner);
      console.log('🔍 Grok winner error:', grokError);
      
      if (grokWinner) {
        xData.stats.isGrokTaskWinner = true;
        console.log('✅ User is a grok task winner!');
      } else {
        console.log('❌ User is NOT a grok task winner');
      }
    }

    // 4. Process Telegram data
    let telegramData: any = { connected: false, stats: { xp: 0, level: 0, dailyReward: 0 } };
    if (telegramUserResult.data) {
      // Get Telegram activity separately
      const { data: activity } = await supabaseAdmin
        .from('telegram_activities')
        .select('total_xp, message_count, total_reactions, weekly_streak')
        .eq('telegram_id', telegramUserResult.data.telegram_id)
        .single();
      
      const totalXP = activity?.total_xp || 0;
      
      // Level calculation
      const LEVELS = [
        { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
        { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
        { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
        { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
        { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
      ];
      
      const currentLevel = LEVELS.find(level => 
        totalXP >= level.minXP && totalXP <= level.maxXP
      ) || LEVELS[0];

      // Check daily reward
      const today = new Date().toISOString().split('T')[0];
      const { data: todayReward } = await supabaseAdmin
        .from('telegram_rewards')
        .select('id')
        .eq('user_id', userId)
        .eq('reward_type', 'daily')
        .gte('created_at', today)
        .single();

      telegramData = {
        connected: true,
        username: telegramUserResult.data.username || telegramUserResult.data.first_name,
        stats: {
          messages: activity?.message_count || 0,
          xp: totalXP,
          level: LEVELS.indexOf(currentLevel) + 1,
          dailyReward: currentLevel.reward,
          canClaimReward: !todayReward
        }
      };
    }

    // 5. Process Discord data
    let discordData: any = { connected: false, stats: { xp: 0, level: 0, dailyReward: 0 } };
    if (discordUserResult.data) {
      // Get Discord activity separately
      const { data: activity } = await supabaseAdmin
        .from('discord_activities')
        .select('total_xp, message_count, total_reactions, weekly_streak, current_level')
        .eq('discord_id', discordUserResult.data.discord_id)
        .single();
      
      const totalXP = activity?.total_xp || 0;
      
      // Level calculation
      const levels = [
        { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
        { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
        { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
        { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
        { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
      ];
      
      const currentLevelData = levels.find(level => 
        level.minXP <= totalXP && totalXP <= level.maxXP
      ) || levels[0];

      // Check daily reward
      const today = new Date().toDateString();
      const { data: lastClaim } = await supabaseAdmin
        .from('discord_daily_claims')
        .select('claimed_at')
        .eq('discord_id', discordUserResult.data.discord_id)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      const canClaimReward = !lastClaim || (lastClaim && new Date(lastClaim.claimed_at).toDateString() !== today);

      discordData = {
        connected: true,
        username: discordUserResult.data.username,
        avatarUrl: discordUserResult.data.avatar_url,
        verified: discordUserResult.data.verified,
        discordId: discordUserResult.data.discord_id,
        stats: {
          messages: activity?.message_count || 0,
          xp: totalXP,
          level: currentLevelData.name,
          dailyReward: currentLevelData.reward,
          canClaimReward,
          lastClaimedAt: lastClaim?.claimed_at || null
        }
      };
    }

    // 6. Process referral data
    const referralStats = {
      totalReferrals: referralResult.data?.referrals?.[0]?.count || 0,
      totalRewards: '0', // Calculate from referral_rewards table if needed
      referralCode: referralResult.data?.code ? { code: referralResult.data.code } : null
    };

    // 7. Process staking tasks
    const stakingTasks: any = {};
    if (stakingTasksResult.data) {
      stakingTasksResult.data.forEach(task => {
        stakingTasks[task.stake_amount] = {
          points: task.points,
          claimed: task.claimed,
          claimedAt: task.claimed ? new Date().toISOString() : null
        };
      });
    }

    // 8. Process daily tasks
    const dailyTasks = dailyTasksResult.data || [];

    // 9. Calculate total XP
    const totalXP = (xData.stats?.xp || 0) + (telegramData.stats?.xp || 0) + (discordData.stats?.xp || 0);

    // 10. Get total social points
    const totalSocialPoints = totalSocialPointsResult.data || 0;

    return NextResponse.json({
      x: xData,
      telegram: telegramData,
      discord: discordData,
      totalXP,
      totalSocialPoints,
      referralStats,
      stakingTasks,
      dailyTasks,
      extraRewards: { telegram: [], discord: [] } // Will be fetched separately if needed
    });

  } catch (error) {
    console.error('Error in optimized social connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 