-- Simple Fix for Discord OAuth Sessions RLS Issue
-- This script disables RLS for discord_oauth_sessions since it's only used by API

-- 1. Check current RLS status
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions';

-- 2. Drop all existing policies
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;

-- 3. Disable RLS for discord_oauth_sessions table
-- This table is only used by the API with service role, so RLS is not needed
ALTER TABLE public.discord_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions to service_role
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;

-- 5. Verify the changes
SELECT 
  'Updated RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions';

-- 6. Check permissions
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
AND tablename = 'discord_oauth_sessions';

-- 7. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord OAuth Sessions RLS Fixed!';
  RAISE NOTICE 'RLS disabled for discord_oauth_sessions table';
  RAISE NOTICE 'Service role has full access';
  RAISE NOTICE 'API should now work without RLS errors';
END $$; 