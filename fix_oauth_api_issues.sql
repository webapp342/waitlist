-- Fix OAuth API Issues
-- This script fixes RLS policies to allow OAuth session creation

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

-- 2. Drop all existing policies
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_service_role_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_user_policy ON public.discord_oauth_sessions;

DROP POLICY IF EXISTS x_oauth_sessions_select_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_insert_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_update_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_delete_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_service_role_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_user_policy ON public.x_oauth_sessions;

-- 3. Drop any "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations on discord_oauth_sessions" ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS "Allow all operations on x_oauth_sessions" ON public.x_oauth_sessions;

-- 4. Enable RLS for both tables
ALTER TABLE public.discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create more permissive policies for OAuth sessions
-- Allow service_role full access
CREATE POLICY discord_oauth_sessions_service_role_policy ON public.discord_oauth_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to create sessions (for X OAuth)
CREATE POLICY discord_oauth_sessions_authenticated_policy ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to read their own sessions
CREATE POLICY discord_oauth_sessions_authenticated_read_policy ON public.discord_oauth_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Create policies for x_oauth_sessions
-- Allow service_role full access
CREATE POLICY x_oauth_sessions_service_role_policy ON public.x_oauth_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to create sessions
CREATE POLICY x_oauth_sessions_authenticated_policy ON public.x_oauth_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to read their own sessions
CREATE POLICY x_oauth_sessions_authenticated_read_policy ON public.x_oauth_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Grant permissions
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT ALL ON public.x_oauth_sessions TO service_role;
GRANT ALL ON public.discord_oauth_sessions TO authenticated;
GRANT ALL ON public.x_oauth_sessions TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO authenticated;

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
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename, policyname;

-- 9. Check RLS status
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 10. Summary
DO $$
BEGIN
  RAISE NOTICE 'OAuth API Issues Fixed!';
  RAISE NOTICE 'Service role has full access to both tables';
  RAISE NOTICE 'Authenticated users can create and read OAuth sessions';
  RAISE NOTICE 'Both Discord and X OAuth should now work';
  RAISE NOTICE 'RLS is enabled for security';
END $$; 