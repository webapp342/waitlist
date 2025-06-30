import { NextRequest, NextResponse } from 'next/server';
import { referralService, userService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { referralCode, walletAddress } = await request.json();

    if (!referralCode || !walletAddress) {
      return NextResponse.json(
        { error: 'Referral code and wallet address are required' },
        { status: 400 }
      );
    }

    // Process the referral
    const success = await referralService.processReferral(referralCode, walletAddress);

    if (success) {
      return NextResponse.json({ success: true, message: 'Referral processed successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid referral code or user already referred' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user's referral stats
    const stats = await referralService.getUserReferralStats(walletAddress);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 