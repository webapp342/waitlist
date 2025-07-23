-- Simple Function Security Fix Script
-- This script adds SET search_path to existing functions to fix security warnings

-- 1. Fix function search path mutable warnings by adding SET search_path
-- This prevents potential security issues with function execution

-- Update functions to have explicit search_path (preserving existing logic)
DO $$
DECLARE
    func_name text;
    func_def text;
    new_def text;
BEGIN
    -- List of functions that need search_path fix
    FOR func_name IN 
        SELECT unnest(ARRAY[
            'update_discord_users_updated_at',
            'complete_referral',
            'update_discord_activities_updated_at',
            'add_discord_xp',
            'calculate_expiration_date',
            'create_user_cards',
            'trigger_create_user_cards',
            'record_discord_message',
            'record_discord_reaction',
            'update_x_users_updated_at',
            'check_x_account_unique',
            'check_stake_and_award_referral_reward',
            'mark_discord_user_left',
            'mark_discord_invite_reward_claimed',
            'update_telegram_activity_updated_at',
            'generate_card_number',
            'generate_cvv',
            'update_updated_at_column',
            'calculate_telegram_level',
            'get_daily_reward_amount',
            'cleanup_expired_x_sessions',
            'record_discord_invite',
            'get_wallet_address',
            'update_discord_leaderboard_cache',
            'get_discord_leaderboard',
            'trigger_update_discord_leaderboard_cache',
            'refresh_discord_daily_stats',
            'cleanup_expired_verification_sessions',
            'get_social_connections_status',
            'verify_rls_status',
            'debug_discord_invite_eligibility',
            'trigger_check_stake_and_award_referral_reward',
            'check_discord_invite_eligibility'
        ])
    LOOP
        -- Get the current function definition
        SELECT pg_get_functiondef(p.oid) INTO func_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name;
        
        -- Only update if function exists and doesn't already have search_path set
        IF func_def IS NOT NULL AND func_def NOT LIKE '%SET search_path%' THEN
            -- Add SET search_path = public to the function definition
            new_def := REPLACE(func_def, 'LANGUAGE plpgsql', 'LANGUAGE plpgsql SET search_path = public');
            
            -- Execute the updated function definition
            EXECUTE new_def;
            RAISE NOTICE 'Updated function: %', func_name;
        ELSE
            RAISE NOTICE 'Function % already has search_path set or does not exist', func_name;
        END IF;
    END LOOP;
END $$;

-- 2. Fix materialized view security issue
-- Revoke public access from materialized view

-- Revoke public access from materialized view
REVOKE ALL ON public.discord_daily_stats FROM anon, authenticated;

-- Grant access only to authenticated users
GRANT SELECT ON public.discord_daily_stats TO authenticated;

-- 3. Create a verification function
CREATE OR REPLACE FUNCTION verify_function_security_fixes()
RETURNS TABLE(function_name text, search_path_set boolean, security_definer boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::text as function_name,
        CASE WHEN p.proconfig @> ARRAY['search_path=public'] THEN true ELSE false END as search_path_set,
        CASE WHEN p.prosecdef THEN true ELSE false END as security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'update_discord_users_updated_at', 'complete_referral', 'update_discord_activities_updated_at',
        'add_discord_xp', 'calculate_expiration_date', 'create_user_cards', 'trigger_create_user_cards',
        'record_discord_message', 'record_discord_reaction', 'update_x_users_updated_at',
        'check_x_account_unique', 'check_stake_and_award_referral_reward', 'mark_discord_user_left',
        'mark_discord_invite_reward_claimed', 'update_telegram_activity_updated_at', 'generate_card_number',
        'generate_cvv', 'update_updated_at_column', 'calculate_telegram_level', 'get_daily_reward_amount',
        'cleanup_expired_x_sessions', 'record_discord_invite', 'get_wallet_address', 'update_discord_leaderboard_cache',
        'get_discord_leaderboard', 'trigger_update_discord_leaderboard_cache', 'refresh_discord_daily_stats',
        'cleanup_expired_verification_sessions', 'get_social_connections_status', 'verify_rls_status',
        'debug_discord_invite_eligibility', 'trigger_check_stake_and_award_referral_reward', 'check_discord_invite_eligibility'
    )
    ORDER BY p.proname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public; 