import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, stakeAmount, points } = await request.json();

    if (!walletAddress || !stakeAmount || !points) {
      return NextResponse.json(
        { error: 'Wallet address, stake amount, and points are required' },
        { status: 400 }
      );
    }

    // Check if task is already claimed
    const { data: existingTask, error: checkError } = await supabase
      .from('staking_tasks')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('stake_amount', stakeAmount)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing task:', checkError);
      return NextResponse.json(
        { error: 'Failed to check task status' },
        { status: 500 }
      );
    }

    if (existingTask && existingTask.claimed) {
      return NextResponse.json(
        { error: 'Task already claimed' },
        { status: 400 }
      );
    }

    // Insert or update the task
    const { data: task, error: insertError } = await supabase
      .from('staking_tasks')
      .upsert({
        wallet_address: walletAddress,
        stake_amount: stakeAmount,
        points: points,
        claimed: true,
        claimed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting staking task:', insertError);
      return NextResponse.json(
        { error: 'Failed to save staking task' },
        { status: 500 }
      );
    }

    console.log('Staking task claimed:', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      stakeAmount,
      points
    });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${points} points for staking ${stakeAmount} BBLP`,
      task
    });

  } catch (error) {
    console.error('Error in staking task claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 