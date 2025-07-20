import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, state, walletAddress } = await request.json();

    if (!code || !state || !walletAddress) {
      return NextResponse.json(
        { error: 'Code, state, and wallet address are required' },
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

    // Exchange authorization code for access token
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = 'https://www.bblip.io/x/simple-callback';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'X OAuth not configured' },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received successfully');

    // Get X user information
    const userResponse = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,verified,public_metrics',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    const xUser = userData.data;

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
    const xUserData = {
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
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      is_active: true
    };

    let isAlreadyConnected = false;

    if (existingXConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('x_users')
        .update(xUserData)
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
        .insert([xUserData]);

      if (insertError) {
        console.error('Error inserting X user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create X user connection' },
          { status: 500 }
        );
      }
    }

    console.log('X OAuth completed successfully:', {
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
    console.error('Error in X OAuth callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 