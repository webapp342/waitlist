import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total whitelist registrations count
    const { count: totalRegistrations } = await supabase
      .from('whitelist_registrations')
      .select('*', { count: 'exact', head: true });

    // Get new users count from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: newUsersLastHour } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    // Get network preference stats
    const { data: networkStats } = await supabase
      .from('whitelist_registrations')
      .select('network_preference');

    const ethCount = networkStats?.filter(r => r.network_preference === 'ETH').length || 0;
    const bnbCount = networkStats?.filter(r => r.network_preference === 'BNB').length || 0;

    // Get average wallet balance
    const { data: balanceData } = await supabase
      .from('whitelist_registrations')
      .select('wallet_balance');

    const totalBalance = balanceData?.reduce((sum, r) => sum + (parseFloat(r.wallet_balance) || 0), 0) || 0;
    const averageBalance = balanceData?.length ? totalBalance / balanceData.length : 0;

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalRegistrations: totalRegistrations || 0,
      newUsersLastHour: newUsersLastHour || 0,
      networkStats: {
        eth: ethCount,
        bnb: bnbCount
      },
      averageBalance: averageBalance.toFixed(2)
    });

  } catch (error) {
    console.error('Error in whitelist stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}