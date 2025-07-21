import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, platform, levelName } = await request.json();

    if (!walletAddress || !platform || !levelName) {
      return NextResponse.json(
        { error: 'Wallet address, platform, and level name are required' },
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

    // Check if extra reward exists and is not claimed
    const { data: extraReward, error: rewardError } = await supabase
      .from('extra_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('level_name', levelName)
      .eq('claimed', false)
      .single();

    if (rewardError || !extraReward) {
      return NextResponse.json(
        { error: 'Extra reward not found or already claimed' },
        { status: 400 }
      );
    }

    // Mark as claimed
    const { error: updateError } = await supabase
      .from('extra_rewards')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString()
      })
      .eq('id', extraReward.id);

    if (updateError) {
      console.error('Error updating extra reward:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim extra reward' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${extraReward.xp_reward} XP for ${levelName} level!`,
      reward: {
        xp: extraReward.xp_reward,
        level: levelName,
        platform: platform
      }
    });

  } catch (error) {
    console.error('Error claiming extra reward:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 