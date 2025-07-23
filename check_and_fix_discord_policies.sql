-- Check and Fix Discord Policies
-- This script checks current policies and fixes them

-- 1. Check current policies for discord_users
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

-- 2. Check current policies for discord_activities
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

-- 3. Drop ALL existing policies for discord_users
DROP POLICY IF EXISTS discord_users_select_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_insert_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_update_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_delete_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_service_role_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_user_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_read_policy ON public.discord_users;
DROP POLICY IF EXISTS "Allow all operations on discord_users" ON public.discord_users;

-- 4. Drop ALL existing policies for discord_activities
DROP POLICY IF EXISTS discord_activities_select_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_insert_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_update_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_delete_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_service_role_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_user_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_authenticated_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_authenticated_read_policy ON public.discord_activities;
DROP POLICY IF EXISTS "Allow all operations on discord_activities" ON public.discord_activities;

-- 5. Create simple, permissive policies for discord_users
CREATE POLICY discord_users_service_role_policy ON public.discord_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY discord_users_authenticated_policy ON public.discord_users
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Create simple, permissive policies for discord_activities
CREATE POLICY discord_activities_service_role_policy ON public.discord_activities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY discord_activities_authenticated_policy ON public.discord_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- 7. Grant permissions
GRANT ALL ON public.discord_users TO service_role;
GRANT ALL ON public.discord_users TO authenticated;
GRANT ALL ON public.discord_activities TO service_role;
GRANT ALL ON public.discord_activities TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_activities_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_activities_id_seq TO authenticated;

-- 8. Verify the policies were created
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

-- 9. Test insert permissions for discord_users
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
      'test_wallet_789', 'test_discord_789', 'testuser3', '9012',
      'https://example.com/avatar3.png', 'test3@example.com', false, 'en-US', false,
      0, 'test_access_token_3', 'test_refresh_token_3',
      NOW() + INTERVAL '1 hour', true, false
    );
    RAISE NOTICE 'discord_users insert test: SUCCESS';
    DELETE FROM public.discord_users WHERE user_id = 'test_wallet_789';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_users insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 10. Test insert permissions for discord_activities
DO $$
BEGIN
  RAISE NOTICE 'Testing discord_activities insert permissions...';
  
  BEGIN
    INSERT INTO public.discord_activities (
      discord_id, message_count, daily_active_days, weekly_streak,
      total_reactions, total_xp, current_level, guild_count
    ) VALUES (
      'test_discord_999', 0, 0, 0, 0, 0, 1, 0
    );
    RAISE NOTICE 'discord_activities insert test: SUCCESS';
    DELETE FROM public.discord_activities WHERE discord_id = 'test_discord_999';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_activities insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 11. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord Policies Check and Fix Complete!';
  RAISE NOTICE 'All old policies dropped';
  RAISE NOTICE 'New permissive policies created';
  RAISE NOTICE 'Service role and authenticated users have access';
  RAISE NOTICE 'Test inserts should succeed';
  RAISE NOTICE 'Discord OAuth should now work';
END $$; 