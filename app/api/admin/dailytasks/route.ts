import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { title, link, reward } = await request.json();
    if (!title || !link || !reward) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('dailytasks')
      .insert({ title, link, reward, claimed: false })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, task: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    // Get all dailytasks
    const { data: allTasks, error: allTasksError } = await supabase
      .from('dailytasks')
      .select('*')
      .eq('claimed', false)
      .order('created_at', { ascending: false });
    if (allTasksError) {
      return NextResponse.json({ error: allTasksError.message }, { status: 500 });
    }
    // Get all claims for this user
    const { data: claims, error: claimsError } = await supabase
      .from('user_dailytask_claims')
      .select('task_id, claimed_at')
      .eq('user_id', user_id);
    if (claimsError) {
      return NextResponse.json({ error: claimsError.message }, { status: 500 });
    }
    // Map: task_id -> last claimed_at
    const claimMap: Record<number, string> = {};
    (claims || []).forEach((row: { task_id: number; claimed_at: string }) => {
      if (!claimMap[row.task_id] || new Date(row.claimed_at) > new Date(claimMap[row.task_id])) {
        claimMap[row.task_id] = row.claimed_at;
      }
    });
    // Build response
    const now = new Date();
    const tasks = (allTasks || []).map((task: { id: number; title: string; link: string; reward: number }) => {
      const lastClaimedAt = claimMap[task.id] ? new Date(claimMap[task.id]) : null;
      let claimed = false;
      let nextClaimAt = null;
      if (lastClaimedAt) {
        // If last claim is within last 24h, it's claimed
        const diff = now.getTime() - lastClaimedAt.getTime();
        if (diff < 24 * 60 * 60 * 1000) {
          claimed = true;
          nextClaimAt = new Date(lastClaimedAt.getTime() + 24 * 60 * 60 * 1000);
        } else {
          claimed = false;
        }
      }
      return {
        id: task.id,
        title: task.title,
        link: task.link,
        reward: task.reward,
        claimed,
        claimedAt: lastClaimedAt ? lastClaimedAt.toISOString() : null,
        nextClaimAt: nextClaimAt ? nextClaimAt.toISOString() : null
      };
    });
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 