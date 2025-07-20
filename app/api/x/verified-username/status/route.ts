import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if wallet has verified X connection
    const { data: xUser, error } = await supabase
      .from('x_users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .not('verified_at', 'is', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking X status:', error);
      return NextResponse.json(
        { error: 'Failed to check X status' },
        { status: 500 }
      );
    }

    if (xUser) {
      return NextResponse.json({
        connected: true,
        xUser: {
          xUserId: xUser.x_user_id,
          xUsername: xUser.x_username,
          xDisplayName: xUser.x_display_name,
          verifiedAt: xUser.verified_at,
          verificationMethod: xUser.verification_method
        }
      });
    } else {
      return NextResponse.json({
        connected: false,
        xUser: null
      });
    }

  } catch (error) {
    console.error('Error in status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 