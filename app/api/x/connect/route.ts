import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/x/connect called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { code, state, walletAddress } = body;

    if (!code || !state || !walletAddress) {
      return NextResponse.json(
        { error: 'Code, state, and wallet address are required' },
        { status: 400 }
      );
    }

    // 1. Check if wallet user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'Wallet user not found. Please create an account first.' },
        { status: 404 }
      );
    }

    // 2. Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/x/callback`,
        code_verifier: 'challenge' // In production, store and retrieve the actual code verifier
      })
    });

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', await tokenResponse.text());
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token received:', { access_token: '***', refresh_token: '***' });

    // 3. Get user information using the access token
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,verified,public_metrics', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('❌ User info fetch failed:', await userResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    console.log('✅ User data received:', JSON.stringify(userData, null, 2));

    // 4. Check if X account is already connected to another wallet
    const { data: existingXConnection, error: xCheckError } = await supabase
      .from('x_users')
      .select('user_id, wallet_address')
      .eq('x_user_id', userData.data.id)
      .eq('is_active', true)
      .single();

    if (existingXConnection && existingXConnection.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: 'This X account is already connected to another wallet' },
        { status: 409 }
      );
    }

    // 5. Check if this wallet already has an active X connection
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

    // 6. Save or update X user connection
    const xUserData = {
      user_id: existingUser.id,
      wallet_address: walletAddress,
      x_user_id: userData.data.id,
      x_username: userData.data.username,
      x_name: userData.data.name,
      x_profile_image_url: userData.data.profile_image_url,
      x_verified: userData.data.verified || false,
      x_followers_count: userData.data.public_metrics?.followers_count || 0,
      x_following_count: userData.data.public_metrics?.following_count || 0,
      x_tweet_count: userData.data.public_metrics?.tweet_count || 0,
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
        .eq('x_user_id', userData.data.id);

      if (updateError) {
        console.error('❌ Error updating X user:', updateError);
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
        console.error('❌ Error inserting X user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create X user connection' },
          { status: 500 }
        );
      }
    }

    console.log('✅ X user connection saved successfully');

    return NextResponse.json({
      success: true,
      isAlreadyConnected,
      xUser: {
        id: userData.data.id,
        username: userData.data.username,
        name: userData.data.name,
        profile_image_url: userData.data.profile_image_url,
        verified: userData.data.verified || false,
        followers_count: userData.data.public_metrics?.followers_count || 0,
        following_count: userData.data.public_metrics?.following_count || 0,
        tweet_count: userData.data.public_metrics?.tweet_count || 0
      }
    });

  } catch (error) {
    console.error('❌ Error in X connect endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 