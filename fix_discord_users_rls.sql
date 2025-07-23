-- Fix Discord Users RLS Issues
-- This script fixes RLS policies for discord_users table

-- 1. Check current RLS status for discord_users
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_users';

-- 2. Check current policies for discord_users
SELECT 
  'Current Policies' as info,
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

-- 3. Drop all existing policies for discord_users
DROP POLICY IF EXISTS discord_users_select_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_insert_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_update_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_delete_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_service_role_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_user_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_authenticated_read_policy ON public.discord_users;

-- 4. Drop any "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations on discord_users" ON public.discord_users;

-- 5. Enable RLS for discord_users
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, permissive policies for discord_users
CREATE POLICY discord_users_service_role_policy ON public.discord_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY discord_users_authenticated_policy ON public.discord_users
    FOR ALL USING (auth.role() = 'authenticated');

-- 7. Grant permissions to service_role and authenticated
GRANT ALL ON public.discord_users TO service_role;
GRANT ALL ON public.discord_users TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_users_id_seq TO authenticated;

-- 8. Verify the policies
SELECT 
  'Updated Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_users'
ORDER BY tablename, policyname;

-- 9. Check RLS status
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_users';

-- 10. Test insert permissions for discord_users
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
      'test_wallet_456', 'test_discord_456', 'testuser2', '5678',
      'https://example.com/avatar2.png', 'test2@example.com', false, 'en-US', false,
      0, 'test_access_token_2', 'test_refresh_token_2',
      NOW() + INTERVAL '1 hour', true, false
    );
    RAISE NOTICE 'discord_users insert test: SUCCESS';
    DELETE FROM public.discord_users WHERE user_id = 'test_wallet_456';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_users insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 11. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord Users RLS Fix Complete!';
  RAISE NOTICE 'RLS enabled with permissive policies';
  RAISE NOTICE 'Service role and authenticated users have access';
  RAISE NOTICE 'Discord user insertion should now work';
  RAISE NOTICE 'OAuth callback should succeed';
END $$; 