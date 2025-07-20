import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Deactivate Discord connection
    const { error } = await supabase
      .from('discord_users')
      .update({ 
        is_active: false,
        disconnected_at: new Date().toISOString()
      })
      .eq('user_id', walletAddress)
      .eq('is_active', true);

    if (error) {
      console.error('Error disconnecting Discord account:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect Discord account' },
        { status: 500 }
      );
    }

    console.log('Discord account disconnected:', walletAddress);

    return NextResponse.json({
      success: true,
      message: 'Discord account disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Discord account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 