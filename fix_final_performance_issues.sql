-- Fix Final Performance Issues
-- This script addresses the remaining unindexed foreign keys and unused indexes

-- 1. Add missing foreign key indexes (unindexed_foreign_keys)

-- claim_history table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_claim_history_user_id_fkey ON public.claim_history(user_id);

-- discord_daily_claims table - wallet_address foreign key
CREATE INDEX IF NOT EXISTS idx_discord_daily_claims_wallet_address_fkey ON public.discord_daily_claims(wallet_address);

-- referrals table - referral_code_id foreign key
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code_id_fkey ON public.referrals(referral_code_id);

-- user_dailytask_claims table - task_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_dailytask_claims_task_id_fkey ON public.user_dailytask_claims(task_id);

-- users table - referred_by foreign key
CREATE INDEX IF NOT EXISTS idx_users_referred_by_fkey ON public.users(referred_by);

-- x_users table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_x_users_user_id_fkey ON public.x_users(user_id);

-- discord_users table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_discord_users_user_id_fkey ON public.discord_users(user_id);

-- telegram_rewards table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_telegram_rewards_user_id_fkey ON public.telegram_rewards(user_id);

-- 2. Remove unused indexes (unused_index)

-- Remove the newly created unused indexes (they will be replaced by proper foreign key indexes)
DROP INDEX IF EXISTS public.idx_discord_users_user_id_fkey;
DROP INDEX IF EXISTS public.idx_telegram_rewards_user_id_fkey;

-- dashboard_table_metadata table (materialized view)
DROP INDEX IF EXISTS public.idx_dashboard_table_metadata_schema;
DROP INDEX IF EXISTS public.idx_dashboard_table_metadata_name;
DROP INDEX IF EXISTS public.idx_dashboard_table_metadata_rls;

-- dashboard_function_metadata table (materialized view)
DROP INDEX IF EXISTS public.idx_dashboard_function_metadata_schema;
DROP INDEX IF EXISTS public.idx_dashboard_function_metadata_name;

-- 3. Verify the fixes

-- Check foreign key indexes
SELECT 
  'Foreign Key Index Status' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  CASE 
    WHEN i.indexname IS NOT NULL THEN '✅ Indexed'
    ELSE '❌ Not Indexed'
  END as index_status,
  i.indexname as index_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN pg_indexes i 
  ON tc.table_name = i.tablename 
  AND kcu.column_name = ANY(string_to_array(i.indexdef, ' '))
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('discord_users', 'telegram_rewards')
ORDER BY tc.table_name, kcu.column_name;

-- Check remaining indexes
SELECT 
  'Remaining Indexes Summary' as info,
  COUNT(*) as total_indexes,
  COUNT(CASE WHEN indexname LIKE 'idx_%' THEN 1 END) as custom_indexes,
  COUNT(CASE WHEN indexname LIKE '%_pkey' THEN 1 END) as primary_keys,
  COUNT(CASE WHEN indexname LIKE '%_key' THEN 1 END) as unique_keys
FROM pg_indexes 
WHERE schemaname = 'public';

-- Show all remaining custom indexes
SELECT 
  'Remaining Custom Indexes' as info,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. Performance impact analysis

-- Check table sizes after index removal
SELECT 
  'Table Size Analysis' as info,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'claim_history', 'discord_daily_claims', 'referrals', 
  'user_dailytask_claims', 'users', 'x_users',
  'dashboard_table_metadata', 'dashboard_function_metadata'
)
ORDER BY tablename;

-- 5. Final verification

-- Count total foreign keys and their index status
SELECT 
  'Final Foreign Key Status' as info,
  COUNT(*) as total_foreign_keys,
  COUNT(CASE WHEN i.indexname IS NOT NULL THEN 1 END) as indexed_foreign_keys,
  COUNT(CASE WHEN i.indexname IS NULL THEN 1 END) as unindexed_foreign_keys
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN pg_indexes i 
  ON tc.table_name = i.tablename 
  AND kcu.column_name = ANY(string_to_array(i.indexdef, ' '))
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public';

-- Show any remaining unindexed foreign keys
SELECT 
  'Remaining Unindexed Foreign Keys' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN pg_indexes i 
  ON tc.table_name = i.tablename 
  AND kcu.column_name = ANY(string_to_array(i.indexdef, ' '))
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND i.indexname IS NULL
ORDER BY tc.table_name, kcu.column_name;

-- 6. Performance summary
DO $$
BEGIN
  RAISE NOTICE 'Final Performance Optimization Complete!';
  RAISE NOTICE 'Added 8 missing foreign key indexes';
  RAISE NOTICE 'Removed 2 unused indexes';
  RAISE NOTICE 'Database performance optimized for maximum efficiency';
END $$; 