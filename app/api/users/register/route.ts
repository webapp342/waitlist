import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  // Get client IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 5; // Max 5 registrations per minute per IP

  let rateLimitInfo = rateLimitMap.get(key);
  
  if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
    rateLimitInfo = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  rateLimitInfo.count++;
  rateLimitMap.set(key, rateLimitInfo);

  const allowed = rateLimitInfo.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - rateLimitInfo.count);

  return { allowed, remaining };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request);
    const { allowed, remaining } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'Retry-After': '60'
          }
        }
      );
    }

    const body = await request.json();
    const { walletAddress, captchaToken } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA token if provided (Cloudflare Turnstile)
    if (captchaToken) {
      try {
        const captchaVerification = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${captchaToken}`,
          }
        );

        const captchaResult = await captchaVerification.json();
        
        if (!captchaResult.success) {
          return NextResponse.json(
            { error: 'CAPTCHA verification failed. Please try again.' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      });
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ wallet_address: walletAddress }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      if (insertError.code === '23505') {
        // Unique constraint violation - user was created by another request
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();
        
        return NextResponse.json({
          success: true,
          user: existingUser,
          message: 'User already exists'
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 