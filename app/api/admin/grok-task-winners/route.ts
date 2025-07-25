import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const body = await request.json();
    const { grokWinners } = body;

    if (!grokWinners || !Array.isArray(grokWinners)) {
      return NextResponse.json(
        { error: 'Geçersiz grok task winners verisi' },
        { status: 400 }
      );
    }

    console.log(`Processing ${grokWinners.length} grok task winners...`);

    let successCount = 0;
    let errorCount = 0;
    let newCount = 0;
    let updatedCount = 0;

    // Process in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < grokWinners.length; i += batchSize) {
      const batch = grokWinners.slice(i, i + batchSize);
      
      try {
        // Use upsert to insert new or update existing records
        const { data, error } = await supabase
          .from('grok_task_winners')
          .upsert(
            batch.map((winner: { x_username: string }) => ({
              x_username: winner.x_username.toLowerCase().trim(),
              reward_amount: 10,
              is_active: true,
              updated_at: new Date().toISOString()
            })),
            {
              onConflict: 'x_username',
              ignoreDuplicates: false
            }
          )
          .select();

        if (error) {
          console.error('Batch error:', error);
          errorCount += batch.length;
        } else {
          // Check which records were inserted vs updated
          for (const winner of batch) {
            const existing = await supabase
              .from('grok_task_winners')
              .select('id')
              .eq('x_username', winner.x_username.toLowerCase().trim())
              .single();
            
            if (existing.data) {
              updatedCount++;
            } else {
              newCount++;
            }
          }
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        errorCount += batch.length;
      }
    }

    return NextResponse.json({
      message: 'Grok task winners işlendi',
      successCount,
      errorCount,
      newCount,
      updatedCount
    });

  } catch (error) {
    console.error('Grok task winners API error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    const { data, error } = await supabase
      .from('grok_task_winners')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grok task winners:', error);
      return NextResponse.json(
        { error: 'Grok task winners getirilemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      grokTaskWinners: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Get grok task winners API error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
} 