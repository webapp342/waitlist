-- Fix OAuth Sessions Performance Issues
-- This script fixes auth_rls_initplan and multiple_permissive_policies warnings

-- 1. Check current policies
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
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename, policyname;

-- 2. Drop all existing policies for discord_oauth_sessions
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_service_role_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_user_policy ON public.discord_oauth_sessions;

-- 3. Drop all existing policies for x_oauth_sessions
DROP POLICY IF EXISTS x_oauth_sessions_select_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_insert_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_update_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_delete_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_service_role_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_user_policy ON public.x_oauth_sessions;

-- 4. Drop any "Allow all operations" policies that might exist
DROP POLICY IF EXISTS "Allow all operations on discord_oauth_sessions" ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS "Allow all operations on x_oauth_sessions" ON public.x_oauth_sessions;

-- 5. Create optimized policies for discord_oauth_sessions
-- Use (select auth.role()) for better performance
CREATE POLICY discord_oauth_sessions_service_role_policy ON public.discord_oauth_sessions
    FOR ALL USING ((select auth.role()) = 'service_role');

-- 6. Create optimized policies for x_oauth_sessions
-- Use (select auth.role()) for better performance
CREATE POLICY x_oauth_sessions_service_role_policy ON public.x_oauth_sessions
    FOR ALL USING ((select auth.role()) = 'service_role');

-- 7. Verify RLS is enabled
ALTER TABLE public.discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- 8. Grant permissions to service_role
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT ALL ON public.x_oauth_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;

-- 9. Verify the optimized policies
SELECT 
  'Optimized Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename, policyname;

-- 10. Check RLS status
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 11. Performance summary
DO $$
BEGIN
  RAISE NOTICE 'OAuth Sessions Performance Optimization Complete!';
  RAISE NOTICE 'Fixed auth_rls_initplan warnings - using (select auth.role())';
  RAISE NOTICE 'Fixed multiple_permissive_policies warnings - removed duplicates';
  RAISE NOTICE 'Only service_role can access OAuth sessions';
  RAISE NOTICE 'Performance optimized for scale';
END $$; 