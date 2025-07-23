-- Query Performance Optimization Script
-- This script addresses the slow dashboard queries identified in Supabase analytics

-- 1. Create Materialized Views for Dashboard Queries
-- This will cache expensive metadata queries

-- Materialized view for table metadata (addresses 30.5% performance issue)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_table_metadata AS
SELECT
  c.oid :: int8 AS id,
  nc.nspname AS schema,
  c.relname AS name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  CASE
    WHEN c.relreplident = 'd' THEN 'default'
    WHEN c.relreplident = 'i' THEN 'index'
    WHEN c.relreplident = 'f' THEN 'full'
    ELSE 'nothing'
  END AS replica_identity,
  pg_total_relation_size(format('%I.%I', nc.nspname, c.relname)) :: int8 AS bytes,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', nc.nspname, c.relname))) AS size,
  pg_stat_get_live_tuples(c.oid) AS live_rows_estimate,
  pg_stat_get_dead_tuples(c.oid) AS dead_rows_estimate,
  obj_description(c.oid) AS comment
FROM pg_namespace nc
JOIN pg_class c ON nc.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND NOT pg_is_other_temp_schema(nc.oid)
  AND nc.nspname = 'public'
  AND (pg_has_role(c.relowner, 'USAGE') OR has_table_privilege(c.oid, 'SELECT'));

-- Create indexes on materialized view for faster queries
-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_table_metadata_id ON public.dashboard_table_metadata(id);
CREATE INDEX IF NOT EXISTS idx_dashboard_table_metadata_schema ON public.dashboard_table_metadata(schema);
CREATE INDEX IF NOT EXISTS idx_dashboard_table_metadata_name ON public.dashboard_table_metadata(name);
CREATE INDEX IF NOT EXISTS idx_dashboard_table_metadata_rls ON public.dashboard_table_metadata(rls_enabled);

-- Materialized view for function metadata (addresses 10.2% performance issue)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_function_metadata AS
SELECT
  f.oid as id,
  n.nspname as schema,
  f.proname as name,
  l.lanname as language,
  f.prosecdef as security_definer,
  f.proretset as is_set_returning_function,
  CASE
    WHEN f.provolatile = 'i' THEN 'immutable'
    WHEN f.provolatile = 's' THEN 'stable'
    WHEN f.provolatile = 'v' THEN 'volatile'
  END as behavior
FROM pg_proc f
LEFT JOIN pg_namespace n ON f.pronamespace = n.oid
LEFT JOIN pg_language l ON f.prolang = l.oid
WHERE n.nspname = 'public'
  AND f.prokind = 'f';

-- Create indexes on function materialized view
-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_function_metadata_id ON public.dashboard_function_metadata(id);
CREATE INDEX IF NOT EXISTS idx_dashboard_function_metadata_schema ON public.dashboard_function_metadata(schema);
CREATE INDEX IF NOT EXISTS idx_dashboard_function_metadata_name ON public.dashboard_function_metadata(name);

-- 2. Create Function to Refresh Materialized Views
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metadata()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_table_metadata;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_function_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create Optimized Dashboard Query Functions

-- Optimized table list query
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

-- Optimized function list query
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

-- 4. Create Scheduled Refresh Job (if using pg_cron extension)
-- Uncomment if you have pg_cron extension installed
-- SELECT cron.schedule(
--   'refresh-dashboard-metadata',
--   '*/15 * * * *', -- Every 15 minutes
--   'SELECT public.refresh_dashboard_metadata();'
-- );

-- 5. Materialized Views don't support RLS, so we use direct GRANT permissions
-- Materialized views are read-only by design, so RLS is not needed

-- 6. Grant Permissions
GRANT SELECT ON public.dashboard_table_metadata TO authenticated;
GRANT SELECT ON public.dashboard_function_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_table_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_function_list() TO authenticated;

-- 7. Initial Refresh
SELECT public.refresh_dashboard_metadata();

-- 8. Performance Monitoring Queries

-- Check materialized view sizes
SELECT 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews 
WHERE schemaname = 'public'
AND matviewname LIKE 'dashboard_%';

-- Check query performance improvement
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.get_optimized_table_list();

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.get_optimized_function_list();

-- 9. Create Performance Monitoring Function
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

-- Grant access to performance monitoring
GRANT EXECUTE ON FUNCTION public.get_dashboard_performance_stats() TO authenticated;

-- 10. Verification Queries
DO $$
BEGIN
  RAISE NOTICE 'Dashboard Performance Optimization Complete!';
  RAISE NOTICE 'Use these functions for faster dashboard queries:';
  RAISE NOTICE '- public.get_optimized_table_list()';
  RAISE NOTICE '- public.get_optimized_function_list()';
  RAISE NOTICE '- public.refresh_dashboard_metadata()';
  RAISE NOTICE '- public.get_dashboard_performance_stats()';
END $$; 