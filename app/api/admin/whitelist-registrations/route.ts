import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalCount } = await supabase
      .from('whitelist_registrations')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data: registrations, error } = await supabase
      .from('whitelist_registrations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching whitelist registrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch whitelist registrations' },
        { status: 500 }
      );
    }

    const hasMore = (offset + limit) < (totalCount || 0);

    return NextResponse.json({
      data: registrations || [],
      total: totalCount || 0,
      hasMore,
      page,
      limit
    });

  } catch (error) {
    console.error('Error in whitelist registrations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}