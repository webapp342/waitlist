import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Fetch user id for Telegram join
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();
    if (userError || !user) {
      return NextResponse.json({
        x: { connected: false },
        telegram: { connected: false },
        discord: { connected: false }
      });
    }
    const userId = user.id;

    // Single query with LEFT JOINs for all platforms
    const { data, error } = await supabaseAdmin.rpc('get_social_connections_status', { p_wallet_address: walletAddress, p_user_id: userId });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // data[0] contains all info
    const row = data && data[0] ? data[0] : {};
    return NextResponse.json({
      x: {
        connected: !!row.x_connected,
        username: row.x_username || null,
        xp: row.x_xp || 0,
        level: row.x_level || 0,
        dailyReward: row.x_daily_reward || 0
      },
      telegram: {
        connected: !!row.telegram_connected,
        username: row.telegram_username || null,
        xp: row.telegram_xp || 0,
        level: row.telegram_level || 0,
        dailyReward: row.telegram_daily_reward || 0
      },
      discord: {
        connected: !!row.discord_connected,
        username: row.discord_username || null,
        xp: row.discord_xp || 0,
        level: row.discord_level || 0,
        dailyReward: row.discord_daily_reward || 0
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 