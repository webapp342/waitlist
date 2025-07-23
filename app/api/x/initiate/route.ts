import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  generateSessionId,
  buildAuthUrl,
  isMobileDevice
} from '@/lib/xOAuth';
import { logTwitterDebugInfo, validateTwitterConfig, validateOAuthParams } from '@/lib/twitterDebug';

export async function POST(request: NextRequest) {
  try {
    // Log debug info for troubleshooting
    logTwitterDebugInfo();
    
    // Validate Twitter configuration
    if (!validateTwitterConfig()) {
      return NextResponse.json(
        { error: 'Twitter OAuth not properly configured. Check your environment variables.' },
        { status: 500 }
      );
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
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

    // Validate OAuth parameters
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const redirectUri = 'https://www.bblip.io/x/callback';
    
    const validationIssues = validateOAuthParams({
      clientId: clientId || '',
      redirectUri,
      state,
      codeChallenge
    });

    if (validationIssues.length > 0) {
      console.error('OAuth parameter validation failed:', validationIssues);
      return NextResponse.json(
        { error: 'Invalid OAuth parameters', details: validationIssues },
        { status: 400 }
      );
    }

    // Store OAuth session in database using service role to bypass RLS
    const { error: sessionError } = await supabaseAdmin
      .from('x_oauth_sessions')
      .insert({
        session_id: sessionId,
        code_verifier: codeVerifier,
        state: state,
        wallet_address: walletAddress,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        used: false
      })
      .select(); // Add select() to ensure proper error handling

    if (sessionError) {
      console.error('Error storing OAuth session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create OAuth session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Build authorization URL
    if (!clientId) {
      return NextResponse.json(
        { error: 'X OAuth not configured' },
        { status: 500 }
      );
    }

    // Mobil cihaz tespiti
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = isMobileDevice(userAgent);

    const authUrl = buildAuthUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge,
      isMobile
    });

    console.log('OAuth session created successfully:', {
      sessionId,
      walletAddress: walletAddress.substring(0, 8) + '...',
      state: state.substring(0, 8) + '...',
      authUrl: authUrl.substring(0, 100) + '...',
      isMobile
    });

    return NextResponse.json({
      authUrl,
      sessionId,
      state,
      isMobile
    });

  } catch (error) {
    console.error('Error initiating X OAuth:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 