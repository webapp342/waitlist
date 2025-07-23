-- Debug Discord OAuth Callback Issues
-- This script helps identify why Discord callback is not working

-- 1. Check recent Discord OAuth sessions
SELECT 
  'Recent Discord OAuth Sessions' as info,
  session_id,
  state,
  wallet_address,
  used,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN used = true THEN 'USED'
    ELSE 'ACTIVE'
  END as status
FROM public.discord_oauth_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check Discord users table
SELECT 
  'Discord Users' as info,
  id,
  user_id,
  discord_id,
  username,
  discriminator,
  is_active,
  connected_at,
  created_at
FROM public.discord_users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check Discord activities table
SELECT 
  'Discord Activities' as info,
  id,
  discord_id,
  message_count,
  total_xp,
  current_level,
  created_at
FROM public.discord_activities
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check for any recent errors in discord_oauth_sessions
SELECT 
  'OAuth Session Errors' as info,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN used = false AND expires_at < NOW() THEN 1 END) as expired_unused,
  COUNT(CASE WHEN used = true THEN 1 END) as used_sessions,
  COUNT(CASE WHEN used = false AND expires_at > NOW() THEN 1 END) as active_sessions
FROM public.discord_oauth_sessions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 5. Check if there are any constraint violations
SELECT 
  'Table Constraints' as info,
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name IN ('discord_oauth_sessions', 'discord_users', 'discord_activities')
ORDER BY table_name, constraint_type;

-- 6. Check RLS policies for discord_users
SELECT 
  'Discord Users RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_users'
ORDER BY policyname;

-- 7. Test insert permissions for discord_users
DO $$
BEGIN
  RAISE NOTICE 'Testing discord_users insert permissions...';
  
  BEGIN
    INSERT INTO public.discord_users (
      user_id, discord_id, username, discriminator, 
      avatar_url, email, verified, locale, mfa_enabled, 
      premium_type, access_token, refresh_token, 
      token_expires_at, is_active, is_in_guild
    ) VALUES (
      'test_wallet_123', 'test_discord_123', 'testuser', '1234',
      'https://example.com/avatar.png', 'test@example.com', false, 'en-US', false,
      0, 'test_access_token', 'test_refresh_token',
      NOW() + INTERVAL '1 hour', true, false
    );
    RAISE NOTICE 'discord_users insert test: SUCCESS';
    DELETE FROM public.discord_users WHERE user_id = 'test_wallet_123';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_users insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 8. Check sequence for discord_users
SELECT 
  'Discord Users Sequence' as info,
  schemaname,
  sequencename,
  start_value,
  increment_by
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename = 'discord_users_id_seq';

-- 9. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord OAuth Debug Complete!';
  RAISE NOTICE 'Check the results above to identify the issue:';
  RAISE NOTICE '1. Are OAuth sessions being created?';
  RAISE NOTICE '2. Are sessions being marked as used?';
  RAISE NOTICE '3. Are Discord users being inserted?';
  RAISE NOTICE '4. Are there any constraint violations?';
  RAISE NOTICE '5. Are RLS policies blocking inserts?';
END $$; 