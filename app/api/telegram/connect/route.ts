import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.error('🚀 [PRODUCTION] POST /api/telegram/connect called');
  console.error('🌐 [PRODUCTION] Request URL:', request.url);
  console.error('📅 [PRODUCTION] Timestamp:', new Date().toISOString());
  console.error('🔧 [PRODUCTION] Environment:', process.env.NODE_ENV);
  console.error('🌍 [PRODUCTION] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    const body = await request.json();
    console.error('📦 [PRODUCTION] Request body:', JSON.stringify(body, null, 2));
    
    const { telegramUser, walletAddress } = body;

    console.error('🔍 [PRODUCTION] Validating request data...');
    console.error('  - telegramUser:', telegramUser ? 'Present' : 'Missing');
    console.error('  - walletAddress:', walletAddress ? 'Present' : 'Missing');

    if (!telegramUser || !walletAddress) {
      console.error('❌ [PRODUCTION] Missing required data');
      return NextResponse.json(
        { error: 'Telegram user data and wallet address are required' },
        { status: 400 }
      );
    }

    console.error('✅ [PRODUCTION] Request validation passed');

    // 1. Önce kullanıcının wallet adresini kontrol et
    console.error('🔍 [PRODUCTION] Step 1: Checking if wallet user exists...');
    console.error('  - Wallet address:', walletAddress);
    
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    console.error('📊 [PRODUCTION] Wallet user check result:');
    console.error('  - User found:', !!existingUser);
    console.error('  - User ID:', existingUser?.id);
    console.error('  - Error:', userError ? JSON.stringify(userError) : 'None');

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ [PRODUCTION] Error checking user:', userError);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    if (!existingUser) {
      console.error('❌ [PRODUCTION] User not found in database');
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first' },
        { status: 404 }
      );
    }

    console.error('✅ [PRODUCTION] Wallet user found:', existingUser.id);

    // 2. Telegram ID'nin başka bir kullanıcı ile bağlı olup olmadığını kontrol et
    console.error('🔍 [PRODUCTION] Step 2: Checking if Telegram ID is already connected...');
    console.error('  - Telegram ID:', telegramUser.id);
    
    const { data: existingTelegramUser, error: telegramCheckError } = await supabase
      .from('telegram_users')
      .select('user_id, telegram_id')
      .eq('telegram_id', telegramUser.id)
      .single();

    console.error('📊 [PRODUCTION] Telegram user check result:');
    console.error('  - Existing user found:', !!existingTelegramUser);
    console.error('  - Existing user data:', existingTelegramUser ? JSON.stringify(existingTelegramUser) : 'None');
    console.error('  - Error:', telegramCheckError ? JSON.stringify(telegramCheckError) : 'None');

    if (telegramCheckError && telegramCheckError.code !== 'PGRST116') {
      console.error('❌ [PRODUCTION] Error checking telegram user:', telegramCheckError);
      return NextResponse.json(
        { error: 'Failed to check telegram user' },
        { status: 500 }
      );
    }

    if (existingTelegramUser) {
      console.error('⚠️ [PRODUCTION] Telegram ID already connected to another user');
      if (existingTelegramUser.user_id === existingUser.id) {
        // Zaten bağlı
        console.error('✅ [PRODUCTION] User already connected to this Telegram account');
        return NextResponse.json({
          success: true,
          message: 'Telegram already connected',
          isAlreadyConnected: true
        });
      } else {
        // Başka bir kullanıcı ile bağlı
        console.error('❌ [PRODUCTION] Telegram account connected to different wallet');
        return NextResponse.json(
          { error: 'This Telegram account is already connected to another wallet' },
          { status: 409 }
        );
      }
    }

    console.error('✅ [PRODUCTION] Telegram ID not connected to any user');

    // 3. Kullanıcının zaten başka bir Telegram hesabı ile bağlı olup olmadığını kontrol et
    console.error('🔍 [PRODUCTION] Step 3: Checking if user has another Telegram account...');
    
    const { data: existingUserTelegram, error: userTelegramError } = await supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('user_id', existingUser.id)
      .single();

    console.error('📊 [PRODUCTION] User telegram check result:');
    console.error('  - Existing telegram found:', !!existingUserTelegram);
    console.error('  - Error:', userTelegramError ? JSON.stringify(userTelegramError) : 'None');

    if (userTelegramError && userTelegramError.code !== 'PGRST116') {
      console.error('❌ [PRODUCTION] Error checking user telegram:', userTelegramError);
      return NextResponse.json(
        { error: 'Failed to check user telegram' },
        { status: 500 }
      );
    }

    if (existingUserTelegram) {
      console.error('❌ [PRODUCTION] User already has another Telegram account');
      return NextResponse.json(
        { error: 'This wallet is already connected to another Telegram account' },
        { status: 409 }
      );
    }

    // 4. Telegram kullanıcısını kaydet
    console.error('💾 [PRODUCTION] Step 4: Saving telegram user to database...');
    
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

    console.error('📊 [PRODUCTION] Insert result:');
    console.error('  - Success:', !!newTelegramUser);
    console.error('  - Error:', insertError ? JSON.stringify(insertError) : 'None');

    if (insertError) {
      console.error('❌ [PRODUCTION] Error inserting telegram user:', insertError);
      return NextResponse.json(
        { error: 'Failed to save telegram user' },
        { status: 500 }
      );
    }

    // 5. Telegram aktivite kaydı oluştur
    console.error('💾 [PRODUCTION] Step 5: Creating telegram activity record...');
    
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

    console.error('📊 [PRODUCTION] Activity creation result:');
    console.error('  - Error:', activityError ? JSON.stringify(activityError) : 'None');

    if (activityError) {
      console.error('⚠️ [PRODUCTION] Error creating telegram activity:', activityError);
      // Ana işlem başarılı olduğu için bu hatayı log'la ama kullanıcıya hata döndürme
    }

    console.error('🎉 [PRODUCTION] SUCCESS: Telegram connected successfully!');
    console.error('  - User ID:', existingUser.id);
    console.error('  - Telegram ID:', telegramUser.id);
    console.error('  - Username:', telegramUser.username);

    return NextResponse.json({
      success: true,
      message: 'Telegram connected successfully',
      telegramUser: newTelegramUser
    });

  } catch (error) {
    console.error('💥 [PRODUCTION] CRITICAL ERROR in telegram connect:', error);
    console.error('📋 [PRODUCTION] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 