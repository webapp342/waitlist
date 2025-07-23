-- Fix Discord Activities RLS Issues
-- This script fixes RLS policies for discord_activities table

-- 1. Check current RLS status for discord_activities
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_activities';

-- 2. Check current policies for discord_activities
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
AND tablename = 'discord_activities'
ORDER BY policyname;

-- 3. Drop all existing policies for discord_activities
DROP POLICY IF EXISTS discord_activities_select_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_insert_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_update_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_delete_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_service_role_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_user_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_authenticated_policy ON public.discord_activities;
DROP POLICY IF EXISTS discord_activities_authenticated_read_policy ON public.discord_activities;

-- 4. Drop any "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations on discord_activities" ON public.discord_activities;

-- 5. Enable RLS for discord_activities
ALTER TABLE public.discord_activities ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, permissive policies for discord_activities
CREATE POLICY discord_activities_service_role_policy ON public.discord_activities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY discord_activities_authenticated_policy ON public.discord_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- 7. Grant permissions to service_role and authenticated
GRANT ALL ON public.discord_activities TO service_role;
GRANT ALL ON public.discord_activities TO authenticated;
GRANT USAGE ON SEQUENCE public.discord_activities_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.discord_activities_id_seq TO authenticated;

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
AND tablename = 'discord_activities'
ORDER BY tablename, policyname;

-- 9. Check RLS status
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_activities';

-- 10. Test insert permissions for discord_activities
DO $$
BEGIN
  RAISE NOTICE 'Testing discord_activities insert permissions...';
  
  BEGIN
    INSERT INTO public.discord_activities (
      discord_id, message_count, daily_active_days, weekly_streak,
      total_reactions, total_xp, current_level, guild_count
    ) VALUES (
      'test_discord_789', 0, 0, 0, 0, 0, 1, 0
    );
    RAISE NOTICE 'discord_activities insert test: SUCCESS';
    DELETE FROM public.discord_activities WHERE discord_id = 'test_discord_789';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'discord_activities insert test: FAILED - %', SQLERRM;
  END;
END $$;

-- 11. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord Activities RLS Fix Complete!';
  RAISE NOTICE 'RLS enabled with permissive policies';
  RAISE NOTICE 'Service role and authenticated users have access';
  RAISE NOTICE 'Discord activity insertion should now work';
  RAISE NOTICE 'OAuth callback should succeed';
END $$; 