import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, xUsername, verificationCode } = await request.json();

    if (!walletAddress || !xUsername || !verificationCode) {
      return NextResponse.json(
        { error: 'Wallet address, X username, and verification code are required' },
        { status: 400 }
      );
    }

    // Clean username
    const cleanUsername = xUsername.replace('@', '').trim();

    // Find and validate verification session
    const { data: session, error: sessionError } = await supabase
      .from('x_verification_sessions')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('x_username', cleanUsername)
      .eq('verification_code', verificationCode)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Mark session as used
    await supabase
      .from('x_verification_sessions')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', session.id);

    // Get X user info
    try {
      const xResponse = await fetch(`https://api.twitter.com/2/users/by/username/${cleanUsername}`, {
        headers: {
          'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!xResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch X user information' },
          { status: 500 }
        );
      }

      const xUserData = await xResponse.json();
      const xUserId = xUserData.data.id;

      // Check if this X account is already connected to another wallet
      const { data: existingConnection } = await supabase
        .from('x_users')
        .select('*')
        .eq('x_user_id', xUserId)
        .neq('wallet_address', walletAddress)
        .single();

      if (existingConnection) {
        return NextResponse.json(
          { error: 'This X account is already connected to another wallet' },
          { status: 400 }
        );
      }

      // Check if wallet already has an X connection
      const { data: existingWalletConnection } = await supabase
        .from('x_users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (existingWalletConnection) {
        // Update existing connection
        const { error: updateError } = await supabase
          .from('x_users')
          .update({
            x_user_id: xUserId,
            x_username: cleanUsername,
            x_display_name: xUserData.data.name,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress);

        if (updateError) {
          console.error('Error updating X connection:', updateError);
          return NextResponse.json(
            { error: 'Failed to update X connection' },
            { status: 500 }
          );
        }
      } else {
        // Create new connection
        const { error: insertError } = await supabase
          .from('x_users')
          .insert({
            wallet_address: walletAddress,
            x_user_id: xUserId,
            x_username: cleanUsername,
            x_display_name: xUserData.data.name,
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating X connection:', insertError);
          return NextResponse.json(
            { error: 'Failed to create X connection' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'X account verified and connected successfully',
        xUser: {
          xUserId,
          xUsername: cleanUsername,
          xDisplayName: xUserData.data.name,
          walletAddress
        }
      });

    } catch (xError) {
      console.error('X API error:', xError);
      return NextResponse.json(
        { error: 'Failed to verify X account' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in confirmation endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 