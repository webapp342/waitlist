import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/x/disconnect called');
  
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Deactivate X connection for this wallet
    const { error } = await supabase
      .from('x_users')
      .update({ 
        is_active: false,
        disconnected_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error disconnecting X user:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect X account' },
        { status: 500 }
      );
    }

    console.log('✅ X user disconnected successfully');

    return NextResponse.json({
      success: true,
      message: 'X account disconnected successfully'
    });

  } catch (error) {
    console.error('❌ Error in X disconnect endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 