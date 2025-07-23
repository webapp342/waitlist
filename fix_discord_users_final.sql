-- Fix Discord Users Table Policies
-- This script fixes the discord_users table specifically

-- 1. Check current discord_users policies
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

-- 2. Drop ALL existing discord_users policies
DROP POLICY IF EXISTS discord_users_select_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_insert_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_update_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_delete_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_service_role_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_user_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_read_policy ON public.discord_users;
DROP POLICY IF EXISTS "Allow all operations on discord_users" ON public.discord_users;

-- 3. Create discord_users policies with correct role assignments
CREATE POLICY discord_users_service_role_policy ON public.discord_users
    FOR ALL TO service_role USING (true);

CREATE POLICY discord_users_authenticated_policy ON public.discord_users
    FOR ALL TO authenticated USING (true);

-- 4. Grant permissions to discord_users table
GRANT ALL ON public.discord_users TO service_role;
GRANT ALL ON public.discord_users TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO authenticated;

-- 5. Verify the discord_users policies
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

-- 6. Test insert permissions for discord_users
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
      'test_wallet_users', 'test_discord_users', 'testuser_users', 'users',
      'https://example.com/avatar_users.png', 'test_users@example.com', false, 'en-US', false,
      0, 'test_access_token_users', 'test_refresh_token_users',
      NOW() + INTERVAL '1 hour', true, false
    );
    RAISE NOTICE 'discord_users insert test: SUCCESS';
    DELETE FROM public.discord_users WHERE user_id = 'test_wallet_users';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_users insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 7. Check RLS status for discord_users
SELECT 
  'Discord Users RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_users';

-- 8. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord Users Fix Complete!';
  RAISE NOTICE 'Discord users policies should now work like activities policies';
  RAISE NOTICE 'Service role and authenticated users have access';
  RAISE NOTICE 'Discord OAuth should now work';
END $$; 