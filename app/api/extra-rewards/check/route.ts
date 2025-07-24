import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, platform, currentXP } = await request.json();

    if (!walletAddress || !platform || currentXP === undefined) {
      return NextResponse.json(
        { error: 'Wallet address, platform, and current XP are required' },
        { status: 400 }
      );
    }

    // Get user ID
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

    // Level thresholds
    const levels = [
      { name: 'Bronze', maxXP: 250, xpReward: 250 },
      { name: 'Silver', maxXP: 500, xpReward: 500 },
      { name: 'Gold', maxXP: 1000, xpReward: 1000 },
      { name: 'Platinum', maxXP: 2000, xpReward: 2000 },
      { name: 'Diamond', maxXP: 999999, xpReward: 999999 }
    ];

    const availableRewards = [];

    for (const level of levels) {
      // Check if user has reached this level
      if (currentXP >= level.maxXP) {
        // Check if extra reward already exists
        const { data: existingReward, error: checkError } = await supabase
          .from('extra_rewards')
          .select('id, claimed, xp_reward')
          .eq('user_id', user.id)
          .eq('platform', platform)
          .eq('level_name', level.name)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing reward:', checkError);
          continue;
        }

        // If reward doesn't exist, create it
        if (!existingReward) {
          const { data: newReward, error: insertError } = await supabase
            .from('extra_rewards')
            .insert({
              user_id: user.id,
              platform: platform,
              level_name: level.name,
              xp_reward: level.xpReward,
              claimed: false
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating extra reward:', insertError);
            continue;
          }

          availableRewards.push({
            level: level.name,
            xpReward: level.xpReward,
            claimed: false,
            id: newReward.id
          });
        } else {
          // Reward exists - return both claimed and unclaimed
          availableRewards.push({
            level: level.name,
            xpReward: existingReward.xp_reward,
            claimed: existingReward.claimed,
            id: existingReward.id
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      availableRewards
    });

  } catch (error) {
    console.error('Error checking extra rewards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 