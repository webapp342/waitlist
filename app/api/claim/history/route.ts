import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/claim/history?wallet=0x...
 * Get user's claim history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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

    // Get claim history for user
    const { data: history, error } = await supabase
      .from('claim_history')
      .select('*')
      .eq('user_id', user.data.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('Error fetching claim history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claim history' },
      { status: 500 }
    );
  }
} 