import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { walletAddresses } = await request.json();

    if (!walletAddresses || !Array.isArray(walletAddresses)) {
      return NextResponse.json(
        { error: 'Wallet addresses array is required' },
        { status: 400 }
      );
    }

    // Optimize edilmiş sorgu: Tek seferde tüm kullanıcıların referral sayılarını çek
    const { data: usersWithReferrals, error: queryError } = await supabase
      .from('users')
      .select(`
        wallet_address,
        referrals!referrals_referrer_id_fkey(count)
      `)
      .in('wallet_address', walletAddresses);

    if (queryError) {
      console.error('Error fetching referral stats:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch referral stats' },
        { status: 500 }
      );
    }

    const referralStats: {[key: string]: number} = {};
    
    // Her wallet address için referral sayısını map'le
    walletAddresses.forEach(walletAddress => {
      const user = usersWithReferrals?.find(u => u.wallet_address === walletAddress);
      referralStats[walletAddress] = user?.referrals?.[0]?.count || 0;
    });

    return NextResponse.json({
      data: referralStats
    });

  } catch (error) {
    console.error('Admin referral stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 