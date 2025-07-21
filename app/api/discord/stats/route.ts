import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { isUserInGuild, refreshDiscordToken } from '@/lib/discordOAuth';

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
    const { data: discordUser, error: userError } = await supabaseAdmin
      .from('discord_users')
      .select('*, is_in_guild')
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
        canClaimReward: false,
        isInBBLIPGuild: false
      });
    }

    // Check if user is in BBLIP guild
    let isInBBLIPGuild = discordUser.is_in_guild || false;
    
    // Only check guild membership if not already confirmed in database
    if (!isInBBLIPGuild && discordUser.access_token) {
      try {
        const guildId = process.env.DISCORD_GUILD_ID || '1396412220480426114';
        
        // Check if token is expired
        const tokenExpiresAt = new Date(discordUser.token_expires_at);
        const now = new Date();
        let accessToken = discordUser.access_token;
        
        if (tokenExpiresAt <= now && discordUser.refresh_token) {
          console.log('Discord token expired, attempting refresh...');
          try {
            const newTokenData = await refreshDiscordToken(discordUser.refresh_token);
            accessToken = newTokenData.access_token;
            
            // Update the token in database
            await supabaseAdmin
              .from('discord_users')
              .update({
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token,
                token_expires_at: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
              })
              .eq('discord_id', discordUser.discord_id);
              
            console.log('Discord token refreshed successfully');
          } catch (refreshError) {
            console.error('Failed to refresh Discord token:', refreshError);
            // Continue with old token, it might still work
          }
        }
        
        isInBBLIPGuild = await isUserInGuild(accessToken, guildId);
        console.log('Guild membership check result:', {
          discordId: discordUser.discord_id,
          guildId: guildId,
          isInGuild: isInBBLIPGuild
        });
        
        // Update guild membership status in database
        await supabaseAdmin
          .from('discord_users')
          .update({ is_in_guild: isInBBLIPGuild })
          .eq('discord_id', discordUser.discord_id);
      } catch (guildError) {
        console.error('Error checking guild membership:', guildError);
        // Continue without guild information
      }
    } else {
      console.log('Using cached guild membership status:', isInBBLIPGuild);
    }

    // Get Discord activity data
    const { data: activity, error: activityError } = await supabaseAdmin
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
    const { data: lastClaim, error: claimError } = await supabaseAdmin
      .from('discord_daily_claims')
      .select('claimed_at')
      .eq('discord_id', discordUser.discord_id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    const canClaimReward = !lastClaim || (lastClaim && new Date(lastClaim.claimed_at).toDateString() !== today);
    const lastClaimedAt = lastClaim ? lastClaim.claimed_at : null;

    return NextResponse.json({
      isConnected: true,
      discordId: discordUser.discord_id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatarUrl: discordUser.avatar_url,
      verified: discordUser.verified,
      premiumType: discordUser.premium_type,
      isInBBLIPGuild,
      currentLevel: currentLevelData.name,
      currentLevelNumber: currentLevel,
      totalXP,
      dailyStreak: activity?.weekly_streak || 0,
      messageCount: activity?.message_count || 0,
      reactionsReceived: activity?.total_reactions || 0,
      guildCount: activity?.guild_count || 0,
      dailyReward: currentLevelData.reward,
      canClaimReward,
      lastClaimedAt,
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