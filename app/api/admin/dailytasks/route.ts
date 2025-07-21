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
      .order('created_at', { ascending: false });
    if (allTasksError) {
      return NextResponse.json({ error: allTasksError.message }, { status: 500 });
    }
    // Get claimed task ids for this user
    const { data: claimed, error: claimedError } = await supabase
      .from('user_dailytask_claims')
      .select('task_id')
      .eq('user_id', user_id);
    if (claimedError) {
      return NextResponse.json({ error: claimedError.message }, { status: 500 });
    }
    const claimedIds = new Set((claimed || []).map(row => row.task_id));
    // Only return tasks not claimed by this user
    const unclaimedTasks = (allTasks || []).filter(task => !claimedIds.has(task.id));
    return NextResponse.json({ success: true, tasks: unclaimedTasks });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 