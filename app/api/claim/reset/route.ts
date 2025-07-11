import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/claim/reset
 * Reset user's rewards after successful claim and log the claim
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, transactionHash, amount } = await request.json();

    if (!walletAddress || !transactionHash || !amount) {
      return NextResponse.json(
        { error: 'Wallet address, transaction hash and amount are required' },
        { status: 400 }
      );
    }

    // Get user ID from wallet address
    const user = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user.data?.id) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Start a transaction
    const { data: client } = await supabase.rpc('begin_transaction');

    try {
      // Reset rewards where user is referrer
      await supabase
        .from('referral_rewards')
        .update({ referrer_reward_amount: '0' })
        .eq('referrer_id', user.data.id);

      // Reset rewards where user is referred
      await supabase
        .from('referral_rewards')
        .update({ referred_reward_amount: '0' })
        .eq('referred_id', user.data.id);

      // Log the claim in claim_history
      await supabase
        .from('claim_history')
        .insert({
          user_id: user.data.id,
          transaction_hash: transactionHash,
          amount_claimed: amount,
          status: 'completed'
        });

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return NextResponse.json({
        success: true,
        message: 'Rewards reset and claim logged successfully'
      });

    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }

  } catch (error) {
    console.error('Error in reset rewards:', error);
    return NextResponse.json(
      { error: 'Failed to reset rewards' },
      { status: 500 }
    );
  }
} 