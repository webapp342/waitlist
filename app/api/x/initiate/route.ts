import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  generateSessionId,
  buildAuthUrl 
} from '@/lib/xOAuth';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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

    // Generate OAuth parameters
    const sessionId = generateSessionId();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store OAuth session in database
    const { error: sessionError } = await supabase
      .from('x_oauth_sessions')
      .insert({
        session_id: sessionId,
        code_verifier: codeVerifier,
        state: state,
        wallet_address: walletAddress
      });

    if (sessionError) {
      console.error('Error storing OAuth session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create OAuth session' },
        { status: 500 }
      );
    }

    // Build authorization URL
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const redirectUri = 'https://www.bblip.io/x/callback';

    if (!clientId) {
      return NextResponse.json(
        { error: 'X OAuth not configured' },
        { status: 500 }
      );
    }

    const authUrl = buildAuthUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge
    });

    console.log('OAuth session created:', {
      sessionId,
      walletAddress,
      state: state.substring(0, 8) + '...'
    });

    return NextResponse.json({
      authUrl,
      sessionId,
      state
    });

  } catch (error) {
    console.error('Error initiating X OAuth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 