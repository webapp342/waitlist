-- Fix OAuth Sessions Sequence Issues
-- This script checks and fixes sequence issues for OAuth session tables

-- 1. Check if sequences exist
SELECT 
  'Sequence Check' as info,
  schemaname,
  sequencename,
  start_value,
  increment
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename IN ('discord_oauth_sessions_id_seq', 'x_oauth_sessions_id_seq')
ORDER BY sequencename;

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

-- 3. Create sequence if it doesn't exist for discord_oauth_sessions
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

-- 4. Grant sequence permissions (only for discord_oauth_sessions)
GRANT USAGE ON SEQUENCE public.discord_oauth_sessions_id_seq TO service_role;

-- 5. Verify final sequence status
SELECT 
  'Final Sequence Status' as info,
  schemaname,
  sequencename,
  start_value,
  increment
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename = 'discord_oauth_sessions_id_seq';

-- 6. Summary
DO $$
BEGIN
  RAISE NOTICE 'OAuth Sessions Sequence Fix Complete!';
  RAISE NOTICE 'discord_oauth_sessions: Uses bigint sequence';
  RAISE NOTICE 'x_oauth_sessions: Uses UUID (no sequence needed)';
  RAISE NOTICE 'Service role has proper permissions';
END $$; 