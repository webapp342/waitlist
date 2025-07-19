import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Toplam kullanıcı sayısını al
    const { count: total, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting users:', countError);
      return NextResponse.json(
        { error: 'Failed to count users' },
        { status: 500 }
      );
    }

    // Önce tüm kullanıcıları çek ve referral sayısına göre sırala
    const { data: allUsersWithStats, error: queryError } = await supabase
      .from('users')
      .select(`
        id,
        wallet_address,
        created_at,
        referrals!referrals_referrer_id_fkey(count)
      `);

    if (queryError) {
      console.error('Error fetching users with stats:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Verileri düzenle ve referral sayısına göre sırala
    const allUsers = (allUsersWithStats || []).map(user => ({
      id: user.id,
      wallet_address: user.wallet_address,
      created_at: user.created_at,
      referral_count: user.referrals?.[0]?.count || 0
    })).sort((a, b) => b.referral_count - a.referral_count);

    // Sayfalama uygula
    const users = allUsers.slice(offset, offset + limit);

    const hasMore = offset + limit < (total || 0);

    return NextResponse.json({
      data: users || [],
      total: total || 0,
      page,
      limit,
      hasMore
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 