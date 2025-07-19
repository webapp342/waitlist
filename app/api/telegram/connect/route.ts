import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { telegramUser, walletAddress } = await request.json();

    if (!telegramUser || !walletAddress) {
      return NextResponse.json(
        { error: 'Telegram user data and wallet address are required' },
        { status: 400 }
      );
    }

    // 1. Önce kullanıcının wallet adresini kontrol et
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking user:', userError);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first' },
        { status: 404 }
      );
    }

    // 2. Telegram ID'nin başka bir kullanıcı ile bağlı olup olmadığını kontrol et
    const { data: existingTelegramUser, error: telegramCheckError } = await supabase
      .from('telegram_users')
      .select('user_id, telegram_id')
      .eq('telegram_id', telegramUser.id)
      .single();

    if (telegramCheckError && telegramCheckError.code !== 'PGRST116') {
      console.error('Error checking telegram user:', telegramCheckError);
      return NextResponse.json(
        { error: 'Failed to check telegram user' },
        { status: 500 }
      );
    }

    if (existingTelegramUser) {
      if (existingTelegramUser.user_id === existingUser.id) {
        // Zaten bağlı
        return NextResponse.json({
          success: true,
          message: 'Telegram already connected',
          isAlreadyConnected: true
        });
      } else {
        // Başka bir kullanıcı ile bağlı
        return NextResponse.json(
          { error: 'This Telegram account is already connected to another wallet' },
          { status: 409 }
        );
      }
    }

    // 3. Kullanıcının zaten başka bir Telegram hesabı ile bağlı olup olmadığını kontrol et
    const { data: existingUserTelegram, error: userTelegramError } = await supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('user_id', existingUser.id)
      .single();

    if (userTelegramError && userTelegramError.code !== 'PGRST116') {
      console.error('Error checking user telegram:', userTelegramError);
      return NextResponse.json(
        { error: 'Failed to check user telegram' },
        { status: 500 }
      );
    }

    if (existingUserTelegram) {
      return NextResponse.json(
        { error: 'This wallet is already connected to another Telegram account' },
        { status: 409 }
      );
    }

    // 4. Telegram kullanıcısını kaydet
    const { data: newTelegramUser, error: insertError } = await supabase
      .from('telegram_users')
      .insert([{
        user_id: existingUser.id,
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        photo_url: telegramUser.photo_url,
        is_active: true
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting telegram user:', insertError);
      return NextResponse.json(
        { error: 'Failed to save telegram user' },
        { status: 500 }
      );
    }

    // 5. Telegram aktivite kaydı oluştur
    const { error: activityError } = await supabase
      .from('telegram_activities')
      .insert([{
        telegram_id: telegramUser.id,
        message_count: 0,
        daily_active_days: 0,
        weekly_streak: 0,
        total_reactions: 0,
        total_xp: 0,
        current_level: 1
      }]);

    if (activityError) {
      console.error('Error creating telegram activity:', activityError);
      // Ana işlem başarılı olduğu için bu hatayı log'la ama kullanıcıya hata döndürme
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram connected successfully',
      telegramUser: newTelegramUser
    });

  } catch (error) {
    console.error('Error in telegram connect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 