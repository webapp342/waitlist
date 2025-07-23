-- Fix Materialized View Access Issue
-- This script fixes the discord_daily_stats materialized view security warning

-- 1. Revoke all access from anon and authenticated roles
REVOKE ALL ON public.discord_daily_stats FROM anon, authenticated;

-- 2. Grant only SELECT permission to authenticated users (if needed)
-- If this materialized view is not used by the application, we can leave it with no access
-- If it is used, uncomment the line below:
-- GRANT SELECT ON public.discord_daily_stats TO authenticated;

-- 3. Verify the changes
SELECT 
    'Materialized View Security Status' as info,
    schemaname,
    matviewname,
    CASE 
        WHEN has_table_privilege('anon', schemaname||'.'||matviewname, 'SELECT') THEN '❌ Anon can SELECT'
        ELSE '✅ Anon cannot SELECT'
    END as anon_access,
    CASE 
        WHEN has_table_privilege('authenticated', schemaname||'.'||matviewname, 'SELECT') THEN '❌ Authenticated can SELECT'
        ELSE '✅ Authenticated cannot SELECT'
    END as authenticated_access
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'discord_daily_stats';

-- 4. Show all materialized views and their access permissions
SELECT 
    schemaname,
    matviewname,
    has_table_privilege('anon', schemaname||'.'||matviewname, 'SELECT') as anon_select,
    has_table_privilege('authenticated', schemaname||'.'||matviewname, 'SELECT') as authenticated_select,
    has_table_privilege('service_role', schemaname||'.'||matviewname, 'SELECT') as service_role_select
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname; 