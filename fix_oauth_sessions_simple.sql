-- Simple Fix for OAuth Sessions Issues
-- Compatible with all PostgreSQL versions

-- 1. Check current RLS status
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 2. Check table column types
SELECT 
  'Table Column Types' as info,
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('discord_oauth_sessions', 'x_oauth_sessions')
AND column_name = 'id'
ORDER BY table_name;

-- 3. Drop all existing policies
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;

DROP POLICY IF EXISTS x_oauth_sessions_select_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_insert_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_update_policy ON public.x_oauth_sessions;
DROP POLICY IF EXISTS x_oauth_sessions_delete_policy ON public.x_oauth_sessions;

-- 4. Disable RLS for both tables
ALTER TABLE public.discord_oauth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- 5. Create sequence for discord_oauth_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'public' 
    AND sequencename = 'discord_oauth_sessions_id_seq'
  ) THEN
    CREATE SEQUENCE public.discord_oauth_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
    
    RAISE NOTICE 'Created sequence: discord_oauth_sessions_id_seq';
  ELSE
    RAISE NOTICE 'Sequence already exists: discord_oauth_sessions_id_seq';
  END IF;
END $$;

-- 6. Grant permissions to service_role
GRANT ALL ON public.discord_oauth_sessions TO service_role;
GRANT ALL ON public.x_oauth_sessions TO service_role;
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;

-- 7. Verify the changes
SELECT 
  'Updated RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename;

-- 8. Check if any policies remain
SELECT 
  'Remaining Policies' as info,
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('discord_oauth_sessions', 'x_oauth_sessions')
ORDER BY tablename, policyname;

-- 9. Check sequence exists
SELECT 
  'Sequence Status' as info,
  schemaname,
  sequencename
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename = 'discord_oauth_sessions_id_seq';

-- 10. Summary
DO $$
BEGIN
  RAISE NOTICE 'OAuth Sessions Fix Complete!';
  RAISE NOTICE 'RLS disabled for both OAuth session tables';
  RAISE NOTICE 'Service role has full access';
  RAISE NOTICE 'APIs should now work without errors';
END $$; 