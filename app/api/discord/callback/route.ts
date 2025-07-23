import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  exchangeCodeForToken, 
  getDiscordUser, 
  getDiscordUserGuilds,
  getDiscordAvatarUrl
} from '@/lib/discordOAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('=== DISCORD OAUTH CALLBACK START ===');
    console.log('Discord OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error: error || 'none',
      url: request.url
    });

    // Handle OAuth errors
    if (error) {
      console.error('Discord OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=missing_parameters`
      );
    }

    console.log('Step 1: Validating OAuth session...');
    
    // Validate OAuth session
    const { data: session, error: sessionError } = await supabase
      .from('discord_oauth_sessions')
      .select('*')
      .eq('state', state)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    console.log('Session validation result:', {
      sessionFound: !!session,
      sessionError: sessionError ? sessionError.message : 'none',
      sessionData: session ? {
        session_id: session.session_id,
        wallet_address: session.wallet_address?.substring(0, 8) + '...',
        expires_at: session.expires_at
      } : null
    });

    if (sessionError || !session) {
      console.error('Invalid or expired OAuth session:', sessionError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=invalid_session`
      );
    }

    console.log('Step 2: Marking session as used...');
    
    // Mark session as used
    const { error: updateError } = await supabase
      .from('discord_oauth_sessions')
      .update({ used: true })
      .eq('session_id', session.session_id);

    if (updateError) {
      console.error('Error marking session as used:', updateError);
    } else {
      console.log('Session marked as used successfully');
    }

    console.log('Step 3: Exchanging code for token...');
    
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Discord token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    console.log('Step 4: Getting Discord user data...');
    
    // Get Discord user information
    const discordUser = await getDiscordUser(tokenData.access_token);
    console.log('Discord user data retrieved:', {
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      email: discordUser.email ? 'present' : 'missing'
    });

    console.log('Step 5: Checking existing Discord connections...');
    
    // Check if Discord ID is already connected to another wallet
    const { data: existingDiscordUser, error: discordCheckError } = await supabase
      .from('discord_users')
      .select('user_id, discord_id')
      .eq('discord_id', discordUser.id)
      .single();

    console.log('Existing Discord user check:', {
      found: !!existingDiscordUser,
      error: discordCheckError ? discordCheckError.message : 'none',
      existingUserId: existingDiscordUser?.user_id
    });

    if (discordCheckError && discordCheckError.code !== 'PGRST116') {
      console.error('Error checking Discord user:', discordCheckError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=database_error`
      );
    }

    if (existingDiscordUser) {
      if (existingDiscordUser.user_id === session.wallet_address) {
        // Already connected to this wallet
        console.log('Discord account already connected to this wallet');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?success=already_connected`
        );
      } else {
        // Connected to different wallet
        console.error('Discord account connected to different wallet');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=account_taken`
        );
      }
    }

    console.log('Step 6: Checking wallet Discord connections...');
    
    // Check if wallet already has another Discord account
    const { data: existingWalletDiscord, error: walletDiscordError } = await supabase
      .from('discord_users')
      .select('discord_id')
      .eq('user_id', session.wallet_address)
      .single();

    console.log('Wallet Discord check:', {
      found: !!existingWalletDiscord,
      error: walletDiscordError ? walletDiscordError.message : 'none'
    });

    if (walletDiscordError && walletDiscordError.code !== 'PGRST116') {
      console.error('Error checking wallet Discord:', walletDiscordError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=database_error`
      );
    }

    if (existingWalletDiscord) {
      console.error('Wallet already has another Discord account');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=wallet_has_discord`
      );
    }

    console.log('Step 7: Saving Discord user to database...');
    
    // Save Discord user to database
    const avatarUrl = getDiscordAvatarUrl(discordUser.id, discordUser.avatar, discordUser.discriminator);
    
    const insertData = {
      user_id: session.wallet_address,
      discord_id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar_url: avatarUrl,
      email: discordUser.email,
      verified: discordUser.verified,
      locale: discordUser.locale,
      mfa_enabled: discordUser.mfa_enabled,
      premium_type: discordUser.premium_type,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      is_active: true,
      is_in_guild: false // We'll check this later
    };
    
    console.log('Attempting to save Discord user with data:', {
      user_id: insertData.user_id,
      discord_id: insertData.discord_id,
      username: insertData.username,
      hasAccessToken: !!insertData.access_token,
      hasRefreshToken: !!insertData.refresh_token
    });
    
    const { data: newDiscordUser, error: insertError } = await supabase
      .from('discord_users')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error saving Discord user:', insertError);
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=save_failed`
      );
    }

    console.log('Discord user saved successfully:', {
      id: newDiscordUser?.id,
      discord_id: newDiscordUser?.discord_id,
      username: newDiscordUser?.username
    });

    console.log('Step 8: Creating Discord activity record...');
    
    // Create Discord activity record
    const { error: activityError } = await supabase
      .from('discord_activities')
      .upsert({
        discord_id: discordUser.id,
        message_count: 0,
        daily_active_days: 0,
        weekly_streak: 0,
        total_reactions: 0,
        total_xp: 0,
        current_level: 1,
        guild_count: 0
      }, {
        onConflict: 'discord_id'
      });

    if (activityError) {
      console.error('Error creating Discord activity:', activityError);
      // Don't fail the whole process for activity creation error
    } else {
      console.log('Discord activity record created successfully');
    }

    console.log('=== DISCORD OAUTH CALLBACK SUCCESS ===');
    console.log('Discord connection successful:', {
      discordId: discordUser.id,
      username: discordUser.username,
      walletAddress: session.wallet_address.substring(0, 8) + '...'
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?success=connected`
    );

  } catch (error) {
    console.error('=== DISCORD OAUTH CALLBACK ERROR ===');
    console.error('Error in Discord OAuth callback:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=callback_error`
    );
  }
} 