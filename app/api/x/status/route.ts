import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get active X connection for wallet
    const { data: xConnection, error } = await supabase
      .from('x_users')
      .select(`
        x_user_id,
        x_username,
        x_name,
        x_profile_image_url,
        x_verified,
        x_followers_count,
        x_following_count,
        x_tweet_count,
        created_at
      `)
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .single();

    if (error || !xConnection) {
      return NextResponse.json({
        connected: false,
        xUser: null
      });
    }

    // Check if user is a grok task winner
    let isGrokTaskWinner = false;
    if (xConnection.x_username) {
      console.log('🔍 Checking grok winner for x_username:', xConnection.x_username);
      
      const { data: grokWinner, error: grokError } = await supabase
        .from('grok_task_winners')
        .select('id')
        .eq('x_username', xConnection.x_username)
        .eq('is_active', true)
        .single();
      
      console.log('🔍 Grok winner result:', grokWinner);
      console.log('🔍 Grok winner error:', grokError);
      
      if (grokWinner) {
        isGrokTaskWinner = true;
        console.log('✅ User is a grok task winner!');
      } else {
        console.log('❌ User is NOT a grok task winner');
      }
    }

    // If user exists in database and is active, they are connected
    // No need to check token expiration - one-time connection is enough
    return NextResponse.json({
      connected: true,
      xUser: {
        id: xConnection.x_user_id,
        username: xConnection.x_username,
        name: xConnection.x_name,
        profile_image_url: xConnection.x_profile_image_url,
        verified: xConnection.x_verified,
        followers_count: xConnection.x_followers_count,
        following_count: xConnection.x_following_count,
        tweet_count: xConnection.x_tweet_count,
        isGrokTaskWinner: isGrokTaskWinner
      }
    });

  } catch (error) {
    console.error('Error checking X status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 