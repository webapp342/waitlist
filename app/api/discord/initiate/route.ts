import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { 
  generateState, 
  generateSessionId,
  buildDiscordAuthUrl,
  validateDiscordConfig,
  validateOAuthParams,
  isMobileDevice
} from '@/lib/discordOAuth';

export async function POST(request: NextRequest) {
  try {
    // Validate Discord configuration
    if (!validateDiscordConfig()) {
      return NextResponse.json(
        { error: 'Discord OAuth not properly configured. Check your environment variables.' },
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
    const state = generateState();

    // Validate OAuth parameters
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = 'https://bblip.io/discord/callback';
    
    const validationIssues = validateOAuthParams({
      clientId: clientId || '',
      redirectUri,
      state
    });

    if (validationIssues.length > 0) {
      console.error('OAuth parameter validation failed:', validationIssues);
      return NextResponse.json(
        { error: 'Invalid OAuth parameters', details: validationIssues },
        { status: 400 }
      );
    }

    // Store OAuth session in database
    const { error: sessionError } = await supabase
      .from('discord_oauth_sessions')
      .insert({
        session_id: sessionId,
        state: state,
        wallet_address: walletAddress,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        used: false
      })
      .select(); // Add select() to ensure proper error handling

    if (sessionError) {
      console.error('Error storing Discord OAuth session:', sessionError);
      console.error('Session error details:', {
        code: sessionError.code,
        message: sessionError.message,
        details: sessionError.details,
        hint: sessionError.hint
      });
      return NextResponse.json(
        { error: 'Failed to create OAuth session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Build authorization URL
    if (!clientId) {
      return NextResponse.json(
        { error: 'Discord OAuth not configured' },
        { status: 500 }
      );
    }

    // Mobile device detection
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = isMobileDevice(userAgent);

    const authUrl = buildDiscordAuthUrl({
      clientId,
      redirectUri,
      state,
      scope: 'identify guilds guilds.join'
    });

    console.log('Discord OAuth session created successfully:', {
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
    console.error('Error initiating Discord OAuth:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 