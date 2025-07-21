import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { userService } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }
    const user = await userService.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const { data, error } = await supabase
      .from('invite_rewards')
      .select('milestone_count')
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const claimed = (data || []).map(row => row.milestone_count);
    return NextResponse.json({ claimed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 