import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/x/status called');
  
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if X account is connected to this wallet
    const { data: xUser, error } = await supabase
      .from('x_users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .single();

    if (error || !xUser) {
      return NextResponse.json({
        connected: false,
        xUser: null
      });
    }

    return NextResponse.json({
      connected: true,
      xUser: {
        id: xUser.x_user_id,
        username: xUser.x_username,
        name: xUser.x_name,
        profile_image_url: xUser.x_profile_image_url,
        verified: xUser.x_verified,
        followers_count: xUser.x_followers_count,
        following_count: xUser.x_following_count,
        tweet_count: xUser.x_tweet_count
      }
    });

  } catch (error) {
    console.error('❌ Error in X status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 