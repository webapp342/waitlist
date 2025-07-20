import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    console.log('Discord stats request for wallet:', walletAddress?.substring(0, 8) + '...');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get Discord user data
    const { data: discordUser, error: userError } = await supabase
      .from('discord_users')
      .select('*')
      .eq('user_id', walletAddress)
      .eq('is_active', true)
      .single();

    console.log('Discord user query result:', {
      found: !!discordUser,
      error: userError ? {
        code: userError.code,
        message: userError.message
      } : null,
      userData: discordUser ? {
        id: discordUser.id,
        discord_id: discordUser.discord_id,
        username: discordUser.username,
        is_active: discordUser.is_active
      } : null
    });

    if (userError || !discordUser) {
      console.log('No Discord user found, returning disconnected state');
      return NextResponse.json({
        isConnected: false,
        currentLevel: 1,
        totalXP: 0,
        dailyStreak: 0,
        messageCount: 0,
        reactionsReceived: 0,
        dailyReward: 1,
        canClaimReward: false
      });
    }

    // Get Discord activity data
    const { data: activity, error: activityError } = await supabase
      .from('discord_activities')
      .select('*')
      .eq('discord_id', discordUser.discord_id)
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Error fetching Discord activity:', activityError);
    }

    // Calculate current level and reward
    const levels = [
      { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
      { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
      { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
      { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
      { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
    ];

    const totalXP = activity?.total_xp || 0;
    const currentLevel = activity?.current_level || 1;
    const currentLevelData = levels.find(level => level.minXP <= totalXP && totalXP <= level.maxXP) || levels[0];

    // Check if user can claim daily reward
    const today = new Date().toDateString();
    const { data: lastClaim, error: claimError } = await supabase
      .from('discord_daily_claims')
      .select('claimed_at')
      .eq('discord_id', discordUser.discord_id)
      .gte('claimed_at', new Date(today).toISOString())
      .single();

    const canClaimReward = !lastClaim;

    return NextResponse.json({
      isConnected: true,
      discordId: discordUser.discord_id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatarUrl: discordUser.avatar_url,
      verified: discordUser.verified,
      premiumType: discordUser.premium_type,
      currentLevel: currentLevelData.name,
      currentLevelNumber: currentLevel,
      totalXP,
      dailyStreak: activity?.weekly_streak || 0,
      messageCount: activity?.message_count || 0,
      reactionsReceived: activity?.total_reactions || 0,
      guildCount: activity?.guild_count || 0,
      dailyReward: currentLevelData.reward,
      canClaimReward,
      nextLevelXP: currentLevelData.maxXP + 1,
      progressToNextLevel: totalXP - currentLevelData.minXP,
      maxXPForCurrentLevel: currentLevelData.maxXP - currentLevelData.minXP
    });

  } catch (error) {
    console.error('Error fetching Discord stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 