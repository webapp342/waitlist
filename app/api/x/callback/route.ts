import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  exchangeCodeForToken, 
  getXUserInfo, 
  validateState 
} from '@/lib/xOAuth';

export async function POST(request: NextRequest) {
  try {
    const { code, state, sessionId } = await request.json();

    if (!code || !state || !sessionId) {
      return NextResponse.json(
        { error: 'Code, state, and session ID are required' },
        { status: 400 }
      );
    }

    // Retrieve OAuth session from database
    const { data: session, error: sessionError } = await supabase
      .from('x_oauth_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('used', false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired OAuth session' },
        { status: 400 }
      );
    }

    // Validate state parameter
    if (!validateState(state, session.state)) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json(
        { error: 'OAuth session expired' },
        { status: 400 }
      );
    }

    // Get user ID from users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', session.wallet_address)
      .single();

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Exchange authorization code for access token
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = 'https://www.bblip.io/x/callback';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'X OAuth not configured' },
        { status: 500 }
      );
    }

    const tokenResponse = await exchangeCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier: session.code_verifier
    });

    // Get X user information
    const xUser = await getXUserInfo(tokenResponse.access_token);

    // Check if X account is already connected to another wallet
    const { data: existingXConnection, error: xCheckError } = await supabase
      .from('x_users')
      .select('user_id, wallet_address')
      .eq('x_user_id', xUser.id)
      .eq('is_active', true)
      .single();

    if (existingXConnection && existingXConnection.wallet_address !== session.wallet_address) {
      return NextResponse.json(
        { error: 'This X account is already connected to another wallet' },
        { status: 409 }
      );
    }

    // Check if this wallet already has an active X connection
    const { data: existingWalletConnection, error: walletCheckError } = await supabase
      .from('x_users')
      .select('x_user_id, x_username')
      .eq('wallet_address', session.wallet_address)
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
        .eq('wallet_address', session.wallet_address)
        .eq('is_active', true);
    }

    // Save or update X user connection
    const xUserData = {
      user_id: existingUser.id, // Use the user ID from the users table
      wallet_address: session.wallet_address,
      x_user_id: xUser.id,
      x_username: xUser.username,
      x_name: xUser.name,
      x_profile_image_url: xUser.profile_image_url,
      x_verified: xUser.verified || false,
      x_followers_count: xUser.followers_count || 0,
      x_following_count: xUser.following_count || 0,
      x_tweet_count: xUser.tweet_count || 0,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
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

    // Mark OAuth session as used
    await supabase
      .from('x_oauth_sessions')
      .update({ used: true })
      .eq('session_id', sessionId);

    console.log('X OAuth completed successfully:', {
      xUserId: xUser.id,
      xUsername: xUser.username,
      walletAddress: session.wallet_address,
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
        followers_count: xUser.followers_count || 0,
        following_count: xUser.following_count || 0,
        tweet_count: xUser.tweet_count || 0
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