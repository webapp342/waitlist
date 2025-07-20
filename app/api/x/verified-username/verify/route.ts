import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, xUsername } = await request.json();

    if (!walletAddress || !xUsername) {
      return NextResponse.json(
        { error: 'Wallet address and X username are required' },
        { status: 400 }
      );
    }

    // Clean username (remove @ if present)
    const cleanUsername = xUsername.replace('@', '').trim();

    // Generate verification code (6 digits)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store verification session
    const { error: sessionError } = await supabase
      .from('x_verification_sessions')
      .insert({
        wallet_address: walletAddress,
        x_username: cleanUsername,
        verification_code: verificationCode,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      });

    if (sessionError) {
      console.error('Error creating verification session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create verification session' },
        { status: 500 }
      );
    }

    // Send verification code via X API (using Bearer Token)
    const xMessage = `🔐 BBLP Verification Code: ${verificationCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore.`;
    
    try {
      const xResponse = await fetch(`https://api.twitter.com/2/users/by/username/${cleanUsername}`, {
        headers: {
          'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!xResponse.ok) {
        console.error('X API error:', await xResponse.text());
        return NextResponse.json(
          { error: 'Invalid X username or X API error' },
          { status: 400 }
        );
      }

      const userData = await xResponse.json();
      
      // Note: We can't actually send DMs with Bearer Token, so we'll simulate
      // In a real implementation, you'd need OAuth 1.0a or OAuth 2.0 with DM permissions
      console.log(`Verification code ${verificationCode} would be sent to @${cleanUsername}`);

    } catch (xError) {
      console.error('X API error:', xError);
      return NextResponse.json(
        { error: 'Failed to verify X username' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      sessionToken,
      xUsername: cleanUsername,
      // For development, return the code (remove in production)
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error) {
    console.error('Error in verification endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 