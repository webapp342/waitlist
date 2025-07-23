-- Simple Discord OAuth Debug
-- Compatible with all PostgreSQL versions

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
LIMIT 5;

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
LIMIT 5;

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
LIMIT 5;

-- 4. Check RLS policies for discord_users
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

-- 5. Check RLS policies for discord_oauth_sessions
SELECT 
  'Discord OAuth Sessions RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions'
ORDER BY policyname;

-- 6. Check table constraints
SELECT 
  'Table Constraints' as info,
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name IN ('discord_oauth_sessions', 'discord_users', 'discord_activities')
ORDER BY table_name, constraint_type;

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

-- 8. Test insert permissions for discord_oauth_sessions
DO $$
BEGIN
  RAISE NOTICE 'Testing discord_oauth_sessions insert permissions...';
  
  BEGIN
    INSERT INTO public.discord_oauth_sessions (
      session_id, state, wallet_address, expires_at, used
    ) VALUES (
      'test_session_123', 'test_state_123', 'test_wallet_123', 
      NOW() + INTERVAL '10 minutes', false
    );
    RAISE NOTICE 'discord_oauth_sessions insert test: SUCCESS';
    DELETE FROM public.discord_oauth_sessions WHERE session_id = 'test_session_123';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_oauth_sessions insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 9. Check sequence status
SELECT 
  'Sequence Status' as info,
  schemaname,
  sequencename
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename IN ('discord_oauth_sessions_id_seq', 'discord_users_id_seq', 'discord_activities_id_seq')
ORDER BY sequencename;

-- 10. Summary
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