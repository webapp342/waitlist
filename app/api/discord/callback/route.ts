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

    console.log('Discord OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error: error || 'none'
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

    // Validate OAuth session
    const { data: session, error: sessionError } = await supabase
      .from('discord_oauth_sessions')
      .select('*')
      .eq('state', state)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('Invalid or expired OAuth session:', sessionError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?error=invalid_session`
      );
    }

    // Mark session as used
    await supabase
      .from('discord_oauth_sessions')
      .update({ used: true })
      .eq('session_id', session.session_id);

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Discord token exchange successful');

    // Get Discord user information
    const discordUser = await getDiscordUser(tokenData.access_token);
    console.log('Discord user data retrieved:', {
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator
    });

    // Get user's Discord guilds (servers) - optional
    let userGuilds = [];
    try {
      userGuilds = await getDiscordUserGuilds(tokenData.access_token);
      console.log('Discord guilds retrieved:', userGuilds.length);
    } catch (guildError) {
      console.log('Could not retrieve Discord guilds (this is normal if guilds.join scope is not available):', guildError);
      // Continue without guild information
    }

    // Check if Discord ID is already connected to another wallet
    const { data: existingDiscordUser, error: discordCheckError } = await supabase
      .from('discord_users')
      .select('user_id, discord_id')
      .eq('discord_id', discordUser.id)
      .single();

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

    // Check if wallet already has another Discord account
    const { data: existingWalletDiscord, error: walletDiscordError } = await supabase
      .from('discord_users')
      .select('discord_id')
      .eq('user_id', session.wallet_address)
      .single();

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

    // Save Discord user to database
    const avatarUrl = getDiscordAvatarUrl(discordUser.id, discordUser.avatar, discordUser.discriminator);
    
    console.log('Attempting to save Discord user to database:', {
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
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing',
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      is_active: true
    });
    
    const { data: newDiscordUser, error: insertError } = await supabase
      .from('discord_users')
      .insert({
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
        is_active: true
      })
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

    // Create Discord activity record
    const { error: activityError } = await supabase
      .from('discord_activities')
      .insert({
        discord_id: discordUser.id,
        message_count: 0,
        daily_active_days: 0,
        weekly_streak: 0,
        total_reactions: 0,
        total_xp: 0,
        current_level: 1,
        guild_count: userGuilds.length
      });

    if (activityError) {
      console.error('Error creating Discord activity:', activityError);
      // Don't fail the whole process for activity creation error
    }

    console.log('Discord connection successful:', {
      discordId: discordUser.id,
      username: discordUser.username,
      walletAddress: session.wallet_address.substring(0, 8) + '...'
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://bblip.io'}/discord?success=connected`
    );

  } catch (error) {
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