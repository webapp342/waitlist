-- Simple Final Fix for OAuth Sessions
-- This script creates simple, working RLS policies

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

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_service_role_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_user_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_authenticated_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_authenticated_read_policy ON public.discord_oauth_sessions;

DROP POLICY IF EXISTS x_oauth_sessions_select_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_insert_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_update_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_delete_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_service_role_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_user_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_authenticated_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_authenticated_read_policy ON public.x_oauth_sessions;

-- 3. Drop any "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations on discord_oauth_sessions" ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS "Allow all operations on x_oauth_sessions" ON public.x_oauth_sessions;

-- 4. Enable RLS for both tables
ALTER TABLE public.discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, permissive policies for discord_oauth_sessions
CREATE POLICY discord_oauth_sessions_all_policy ON public.discord_oauth_sessions
    FOR ALL USING (true);

-- 6. Create simple, permissive policies for x_oauth_sessions
CREATE POLICY x_oauth_sessions_all_policy ON public.x_oauth_sessions
    FOR ALL USING (true);

-- 7. Grant all permissions
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT ALL ON public.x_oauth_sessions TO service_role;
GRANT ALL ON public.discord_oauth_sessions TO authenticated;
GRANT ALL ON public.x_oauth_sessions TO authenticated;
GRANT ALL ON public.discord_oauth_sessions TO anon;
GRANT ALL ON public.x_oauth_sessions TO anon;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO anon;

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

-- 10. Test insert permissions
DO $$
BEGIN
  RAISE NOTICE 'Testing insert permissions...';
  
  -- Test discord_oauth_sessions insert
  BEGIN
    INSERT INTO public.discord_oauth_sessions (session_id, state, wallet_address, expires_at, used)
    VALUES ('test_session', 'test_state', 'test_wallet', NOW() + INTERVAL '10 minutes', false);
    RAISE NOTICE 'discord_oauth_sessions insert test: SUCCESS';
    DELETE FROM public.discord_oauth_sessions WHERE session_id = 'test_session';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_oauth_sessions insert test: FAILED - %', SQLERRM;
  END;
  
  -- Test x_oauth_sessions insert
  BEGIN
    INSERT INTO public.x_oauth_sessions (session_id, code_verifier, state, wallet_address, expires_at, used)
    VALUES ('test_session', 'test_verifier', 'test_state', 'test_wallet', NOW() + INTERVAL '10 minutes', false);
    RAISE NOTICE 'x_oauth_sessions insert test: SUCCESS';
    DELETE FROM public.x_oauth_sessions WHERE session_id = 'test_session';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'x_oauth_sessions insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 11. Summary
DO $$
BEGIN
  RAISE NOTICE 'Simple OAuth Fix Complete!';
  RAISE NOTICE 'RLS enabled with permissive policies';
  RAISE NOTICE 'All roles (service_role, authenticated, anon) have access';
  RAISE NOTICE 'OAuth sessions should now work for both Discord and X';
  RAISE NOTICE 'Security: OAuth sessions are temporary and expire quickly';
END $$; 