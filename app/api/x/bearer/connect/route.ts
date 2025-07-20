import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, xUsername } = await request.json();

    if (!walletAddress || !xUsername) {
      return NextResponse.json(
        { error: 'Wallet address and X username are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found. Please create an account first.' },
        { status: 404 }
      );
    }

    // Get X Bearer Token from environment
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      return NextResponse.json(
        { error: 'X Bearer Token not configured' },
        { status: 500 }
      );
    }

    // Verify X username exists using X API
    const xResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${xUsername}?user.fields=id,username,name,profile_image_url,verified,public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`
        }
      }
    );

    if (!xResponse.ok) {
      if (xResponse.status === 404) {
        return NextResponse.json(
          { error: 'X username not found. Please check the username and try again.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to verify X username' },
        { status: 400 }
      );
    }

    const xUserData = await xResponse.json();
    const xUser = xUserData.data;

    // Check if X account is already connected to another wallet
    const { data: existingXConnection, error: xCheckError } = await supabase
      .from('x_users')
      .select('user_id, wallet_address')
      .eq('x_user_id', xUser.id)
      .eq('is_active', true)
      .single();

    if (existingXConnection && existingXConnection.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: 'This X account is already connected to another wallet' },
        { status: 409 }
      );
    }

    // Check if this wallet already has an active X connection
    const { data: existingWalletConnection, error: walletCheckError } = await supabase
      .from('x_users')
      .select('x_user_id, x_username')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .single();

    if (existingWalletConnection) {
      // Deactivate existing connection
      await supabase
        .from('x_users')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .eq('is_active', true);
    }

    // Save or update X user connection
    const xUserDataToSave = {
      user_id: user.id,
      wallet_address: walletAddress,
      x_user_id: xUser.id,
      x_username: xUser.username,
      x_name: xUser.name,
      x_profile_image_url: xUser.profile_image_url,
      x_verified: xUser.verified || false,
      x_followers_count: xUser.public_metrics?.followers_count || 0,
      x_following_count: xUser.public_metrics?.following_count || 0,
      x_tweet_count: xUser.public_metrics?.tweet_count || 0,
      access_token: null, // No OAuth token needed for Bearer Token
      refresh_token: null,
      token_expires_at: null,
      is_active: true
    };

    let isAlreadyConnected = false;

    if (existingXConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('x_users')
        .update(xUserDataToSave)
        .eq('x_user_id', xUser.id);

      if (updateError) {
        console.error('Error updating X user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update X user connection' },
          { status: 500 }
        );
      }
      isAlreadyConnected = true;
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('x_users')
        .insert([xUserDataToSave]);

      if (insertError) {
        console.error('Error inserting X user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create X user connection' },
          { status: 500 }
        );
      }
    }

    console.log('X Bearer Token connection completed:', {
      xUserId: xUser.id,
      xUsername: xUser.username,
      walletAddress: walletAddress,
      isAlreadyConnected
    });

    return NextResponse.json({
      success: true,
      isAlreadyConnected,
      xUser: {
        id: xUser.id,
        username: xUser.username,
        name: xUser.name,
        profile_image_url: xUser.profile_image_url,
        verified: xUser.verified || false,
        followers_count: xUser.public_metrics?.followers_count || 0,
        following_count: xUser.public_metrics?.following_count || 0,
        tweet_count: xUser.public_metrics?.tweet_count || 0
      }
    });

  } catch (error) {
    console.error('Error in X Bearer Token connect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 