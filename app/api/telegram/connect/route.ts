import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🔗 POST /api/telegram/connect called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { telegramUser, walletAddress } = body;

    console.log('🔍 Validating request data...');
    console.log('  - telegramUser:', telegramUser ? 'Present' : 'Missing');
    console.log('  - walletAddress:', walletAddress ? 'Present' : 'Missing');

    if (!telegramUser || !walletAddress) {
      console.log('❌ Missing required data');
      return NextResponse.json(
        { error: 'Telegram user data and wallet address are required' },
        { status: 400 }
      );
    }

    console.log('✅ Request validation passed');

    // 1. Önce kullanıcının wallet adresini kontrol et
    console.log('🔍 Step 1: Checking if wallet user exists...');
    console.log('  - Wallet address:', walletAddress);
    
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    console.log('📊 Wallet user check result:');
    console.log('  - User found:', !!existingUser);
    console.log('  - User ID:', existingUser?.id);
    console.log('  - Error:', userError ? JSON.stringify(userError) : 'None');

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', userError);
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      );
    }

    if (!existingUser) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first' },
        { status: 404 }
      );
    }

    console.log('✅ Wallet user found:', existingUser.id);

    // 2. Telegram ID'nin başka bir kullanıcı ile bağlı olup olmadığını kontrol et
    console.log('🔍 Step 2: Checking if Telegram ID is already connected...');
    console.log('  - Telegram ID:', telegramUser.id);
    
    const { data: existingTelegramUser, error: telegramCheckError } = await supabase
      .from('telegram_users')
      .select('user_id, telegram_id')
      .eq('telegram_id', telegramUser.id)
      .single();

    console.log('📊 Telegram user check result:');
    console.log('  - Existing user found:', !!existingTelegramUser);
    console.log('  - Existing user data:', existingTelegramUser ? JSON.stringify(existingTelegramUser) : 'None');
    console.log('  - Error:', telegramCheckError ? JSON.stringify(telegramCheckError) : 'None');

    if (telegramCheckError && telegramCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking telegram user:', telegramCheckError);
      return NextResponse.json(
        { error: 'Failed to check telegram user' },
        { status: 500 }
      );
    }

    if (existingTelegramUser) {
      console.log('⚠️ Telegram ID already connected to another user');
      if (existingTelegramUser.user_id === existingUser.id) {
        // Zaten bağlı
        console.log('✅ User already connected to this Telegram account');
        return NextResponse.json({
          success: true,
          message: 'Telegram already connected',
          isAlreadyConnected: true
        });
      } else {
        // Başka bir kullanıcı ile bağlı
        console.log('❌ Telegram account connected to different wallet');
        return NextResponse.json(
          { error: 'This Telegram account is already connected to another wallet' },
          { status: 409 }
        );
      }
    }

    console.log('✅ Telegram ID not connected to any user');

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