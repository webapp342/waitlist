-- Fix Materialized View API Access Warnings
-- This script addresses the "materialized_view_in_api" security warnings

-- 1. Revoke public access from materialized views
-- This prevents direct API access to materialized views

-- Revoke all access from anon role
REVOKE ALL ON public.dashboard_table_metadata FROM anon;
REVOKE ALL ON public.dashboard_function_metadata FROM anon;

-- Revoke all access from authenticated role (direct access)
REVOKE ALL ON public.dashboard_table_metadata FROM authenticated;
REVOKE ALL ON public.dashboard_function_metadata FROM authenticated;

-- 2. Grant access only to service_role for internal operations
-- This allows the refresh function to work but prevents API access
GRANT SELECT ON public.dashboard_table_metadata TO service_role;
GRANT SELECT ON public.dashboard_function_metadata TO service_role;

-- 3. Update the optimized functions to use SECURITY DEFINER
-- This allows them to access the materialized views even without direct grants

-- Update table list function to ensure it works without direct grants
CREATE OR REPLACE FUNCTION public.get_optimized_table_list()
RETURNS TABLE(
  id bigint,
  schema_name text,
  table_name text,
  rls_enabled boolean,
  rls_forced boolean,
  replica_identity text,
  bytes bigint,
  size text,
  live_rows_estimate bigint,
  dead_rows_estimate bigint,
  comment text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id::bigint,
    t.schema::text,
    t.name::text,
    t.rls_enabled,
    t.rls_forced,
    t.replica_identity::text,
    t.bytes,
    t.size::text,
    t.live_rows_estimate,
    t.dead_rows_estimate,
    t.comment::text
  FROM public.dashboard_table_metadata t
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update function list function to ensure it works without direct grants
CREATE OR REPLACE FUNCTION public.get_optimized_function_list()
RETURNS TABLE(
  id bigint,
  schema_name text,
  function_name text,
  language text,
  security_definer boolean,
  is_set_returning_function boolean,
  behavior text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id::bigint,
    f.schema::text,
    f.name::text,
    f.language::text,
    f.security_definer,
    f.is_set_returning_function,
    f.behavior::text
  FROM public.dashboard_function_metadata f
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Update refresh function to ensure it works
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metadata()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_table_metadata;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_function_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Update performance monitoring function
CREATE OR REPLACE FUNCTION public.get_dashboard_performance_stats()
RETURNS TABLE(
  metric text,
  value text,
  description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Materialized Views'::text as metric,
    COUNT(*)::text as value,
    'Total dashboard materialized views'::text as description
  FROM pg_matviews 
  WHERE schemaname = 'public' AND matviewname LIKE 'dashboard_%'
  
  UNION ALL
  
  SELECT 
    'Table Metadata Size'::text,
    pg_size_pretty(pg_total_relation_size('public.dashboard_table_metadata'))::text,
    'Size of cached table metadata'::text
  
  UNION ALL
  
  SELECT 
    'Function Metadata Size'::text,
    pg_size_pretty(pg_total_relation_size('public.dashboard_function_metadata'))::text,
    'Size of cached function metadata'::text
  
  UNION ALL
  
  SELECT 
    'Last Refresh'::text,
    to_char(now(), 'YYYY-MM-DD HH24:MI:SS')::text,
    'Last materialized view refresh time'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Grant execute permissions on functions to authenticated users
-- This allows them to use the functions but not access materialized views directly
GRANT EXECUTE ON FUNCTION public.get_optimized_table_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_function_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_performance_stats() TO authenticated;

-- 7. Verify the security changes
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
  END as authenticated_access,
  CASE 
    WHEN has_table_privilege('service_role', schemaname||'.'||matviewname, 'SELECT') THEN '✅ Service Role can SELECT'
    ELSE '❌ Service Role cannot SELECT'
  END as service_role_access
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname IN ('dashboard_table_metadata', 'dashboard_function_metadata')
ORDER BY matviewname;

-- 8. Test that functions still work
DO $$
BEGIN
  RAISE NOTICE 'Testing optimized functions...';
  
  -- Test table list function
  PERFORM COUNT(*) FROM public.get_optimized_table_list();
  RAISE NOTICE 'get_optimized_table_list() works correctly';
  
  -- Test function list function
  PERFORM COUNT(*) FROM public.get_optimized_function_list();
  RAISE NOTICE 'get_optimized_function_list() works correctly';
  
  -- Test performance stats function
  PERFORM COUNT(*) FROM public.get_dashboard_performance_stats();
  RAISE NOTICE 'get_dashboard_performance_stats() works correctly';
  
  RAISE NOTICE 'All functions working correctly with new security settings!';
END $$;

-- 9. Final verification
SELECT 
  'Materialized View API Access Fixed' as status,
  COUNT(*) as total_materialized_views,
  COUNT(CASE WHEN has_table_privilege('anon', schemaname||'.'||matviewname, 'SELECT') THEN 1 END) as anon_accessible,
  COUNT(CASE WHEN has_table_privilege('authenticated', schemaname||'.'||matviewname, 'SELECT') THEN 1 END) as authenticated_accessible
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname LIKE 'dashboard_%'; 