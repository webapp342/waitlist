-- Fix Discord Roles in RLS Policies
-- This script fixes the role assignments in the policies

-- 1. Check current policies with roles
SELECT 
  'Current Discord Users Policies' as info,
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

SELECT 
  'Current Discord Activities Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_activities'
ORDER BY policyname;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS discord_users_service_role_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_activities_service_role_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_authenticated_policy ON public.discord_activities;

-- 3. Create policies with correct role assignments
CREATE POLICY discord_users_service_role_policy ON public.discord_users
    FOR ALL TO service_role USING (true);

CREATE POLICY discord_users_authenticated_policy ON public.discord_users
    FOR ALL TO authenticated USING (true);

CREATE POLICY discord_activities_service_role_policy ON public.discord_activities
    FOR ALL TO service_role USING (true);

CREATE POLICY discord_activities_authenticated_policy ON public.discord_activities
    FOR ALL TO authenticated USING (true);

-- 4. Verify the policies with correct roles
SELECT 
  'Updated Discord Users Policies' as info,
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

SELECT 
  'Updated Discord Activities Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_activities'
ORDER BY policyname;

-- 5. Test insert permissions for discord_users
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
      'test_wallet_final', 'test_discord_final', 'testuser_final', 'final',
      'https://example.com/avatar_final.png', 'test_final@example.com', false, 'en-US', false,
      0, 'test_access_token_final', 'test_refresh_token_final',
      NOW() + INTERVAL '1 hour', true, false
    );
    RAISE NOTICE 'discord_users insert test: SUCCESS';
    DELETE FROM public.discord_users WHERE user_id = 'test_wallet_final';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_users insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 6. Test insert permissions for discord_activities
DO $$
BEGIN
  RAISE NOTICE 'Testing discord_activities insert permissions...';
  
  BEGIN
    INSERT INTO public.discord_activities (
      discord_id, message_count, daily_active_days, weekly_streak,
      total_reactions, total_xp, current_level, guild_count
    ) VALUES (
      'test_discord_final', 0, 0, 0, 0, 0, 1, 0
    );
    RAISE NOTICE 'discord_activities insert test: SUCCESS';
    DELETE FROM public.discord_activities WHERE discord_id = 'test_discord_final';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_activities insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 7. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord Roles Fix Complete!';
  RAISE NOTICE 'Policies now have correct role assignments';
  RAISE NOTICE 'Service role and authenticated users should have access';
  RAISE NOTICE 'Test inserts should succeed';
  RAISE NOTICE 'Discord OAuth should now work';
END $$; 