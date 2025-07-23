-- Fix All OAuth Sessions RLS Issues
-- This script disables RLS for all OAuth session tables since they are only used by APIs

-- 1. Check current RLS status for all OAuth session tables
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 2. Drop all existing policies for discord_oauth_sessions
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;

-- 3. Drop all existing policies for x_oauth_sessions
DROP POLICY IF EXISTS x_oauth_sessions_select_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_insert_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_update_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_delete_policy ON public.x_oauth_sessions;

-- 4. Disable RLS for discord_oauth_sessions table
ALTER TABLE public.discord_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- 5. Disable RLS for x_oauth_sessions table
ALTER TABLE public.x_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- 6. Grant necessary permissions to service_role for discord_oauth_sessions
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;

-- 7. Grant necessary permissions to service_role for x_oauth_sessions
GRANT ALL ON public.x_oauth_sessions TO service_role;
-- Note: x_oauth_sessions uses UUID, not sequence, so no sequence grant needed

-- 8. Verify the changes
SELECT 
  'Updated RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 9. Check permissions
SELECT 
  'Table Permissions' as info,
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 10. Check if any policies remain
SELECT 
  'Remaining Policies' as info,
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

-- 11. Summary
DO $$
BEGIN
  RAISE NOTICE 'All OAuth Sessions RLS Fixed!';
  RAISE NOTICE 'RLS disabled for discord_oauth_sessions table';
  RAISE NOTICE 'RLS disabled for x_oauth_sessions table';
  RAISE NOTICE 'Service role has full access to both tables';
  RAISE NOTICE 'APIs should now work without RLS errors';
END $$; 