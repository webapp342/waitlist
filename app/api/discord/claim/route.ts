import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, discordId } = await request.json();

    if (!walletAddress || !discordId) {
      return NextResponse.json(
        { error: 'Wallet address and Discord ID are required' },
        { status: 400 }
      );
    }

    // Check if user can claim today
    const today = new Date().toDateString();
    const { data: lastClaim, error: claimCheckError } = await supabase
      .from('discord_daily_claims')
      .select('claimed_at')
      .eq('discord_id', discordId)
      .gte('claimed_at', new Date(today).toISOString())
      .single();

    if (claimCheckError && claimCheckError.code !== 'PGRST116') {
      console.error('Error checking daily claim:', claimCheckError);
      return NextResponse.json(
        { error: 'Failed to check daily claim status' },
        { status: 500 }
      );
    }

    if (lastClaim) {
      return NextResponse.json(
        { error: 'Daily reward already claimed today' },
        { status: 400 }
      );
    }

    // Get Discord activity to determine reward amount
    const { data: activity, error: activityError } = await supabase
      .from('discord_activities')
      .select('total_xp, current_level')
      .eq('discord_id', discordId)
      .single();

    if (activityError) {
      console.error('Error fetching Discord activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to fetch Discord activity' },
        { status: 500 }
      );
    }

    // Calculate reward based on level
    const levels = [
      { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
      { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
      { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
      { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
      { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
    ];

    const totalXP = activity?.total_xp || 0;
    const currentLevelData = levels.find(level => level.minXP <= totalXP && totalXP <= level.maxXP) || levels[0];
    const rewardAmount = currentLevelData.reward;

    // Record the claim
    const { error: claimError } = await supabase
      .from('discord_daily_claims')
      .insert({
        discord_id: discordId,
        wallet_address: walletAddress,
        reward_amount: rewardAmount,
        claimed_at: new Date().toISOString()
      });

    if (claimError) {
      console.error('Error recording daily claim:', claimError);
      return NextResponse.json(
        { error: 'Failed to record daily claim' },
        { status: 500 }
      );
    }

    // Add BBLP tokens to user's balance (you'll need to implement this based on your token system)
    // For now, we'll just return success
    console.log('Daily Discord reward claimed:', {
      discordId,
      walletAddress: walletAddress.substring(0, 8) + '...',
      rewardAmount
    });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${rewardAmount} BBLP daily reward`,
      rewardAmount
    });

  } catch (error) {
    console.error('Error claiming Discord daily reward:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 