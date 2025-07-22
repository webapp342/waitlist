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

    // Get all claimed staking tasks for the user
    const { data: claimedTasks, error } = await supabase
      .from('staking_tasks')
      .select('stake_amount, points, claimed, claimed_at')
      .eq('wallet_address', walletAddress)
      .eq('claimed', true);

    if (error) {
      console.error('Error fetching staking tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staking tasks' },
        { status: 500 }
      );
    }

    // Create a map of claimed amounts
    const claimedAmounts = claimedTasks?.reduce((acc, task) => {
      acc[task.stake_amount] = {
        points: task.points,
        claimed: task.claimed,
        claimedAt: task.claimed_at
      };
      return acc;
    }, {} as Record<number, any>) || {};

    return NextResponse.json({
      success: true,
      claimedTasks: claimedAmounts
    });

  } catch (error) {
    console.error('Error in staking tasks status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 