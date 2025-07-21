import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { userService } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, milestoneCount, points } = await req.json();
    if (!walletAddress || !milestoneCount || !points) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    const user = await userService.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Check if already claimed
    const { data: existing, error: checkError } = await supabase
      .from('invite_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('milestone_count', milestoneCount)
      .single();
    if (existing) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 });
    }
    // Insert claim
    const { data, error } = await supabase
      .from('invite_rewards')
      .insert({
        user_id: user.id,
        milestone_count: milestoneCount,
        points_awarded: points
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, claimedAt: data.claimed_at, points: data.points_awarded });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 