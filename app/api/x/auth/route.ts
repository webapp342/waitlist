import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/x/callback`;
    
    if (!clientId) {
      return NextResponse.json({ error: 'X OAuth not configured' }, { status: 500 });
    }

    // Generate state and code verifier for PKCE
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store in session or database for verification
    // For now, we'll use a simple approach
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=tweet.read%20users.read%20offline.access&` +
      `state=${state}&` +
      `code_challenge_method=S256&` +
      `code_challenge=${codeChallenge}`;

    return NextResponse.json({ 
      authUrl,
      state,
      codeVerifier 
    });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 });
  }
} 