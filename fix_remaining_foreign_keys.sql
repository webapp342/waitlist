-- Fix Remaining Foreign Key Indexes
-- This script adds the last 2 missing foreign key indexes

-- 1. Add the remaining missing foreign key indexes

-- discord_users table - user_id foreign key (still missing)
CREATE INDEX IF NOT EXISTS idx_discord_users_user_id_fkey ON public.discord_users(user_id);

-- telegram_rewards table - user_id foreign key (still missing)
CREATE INDEX IF NOT EXISTS idx_telegram_rewards_user_id_fkey ON public.telegram_rewards(user_id);

-- 2. Verify all foreign keys are now indexed
SELECT 
  'Final Foreign Key Index Status' as info,
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
ORDER BY tc.table_name, kcu.column_name;

-- 3. Count total foreign keys and their index status
SELECT 
  'Final Foreign Key Summary' as info,
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

-- 4. Show any remaining unindexed foreign keys (should be 0)
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

-- 5. Performance summary
DO $$
BEGIN
  RAISE NOTICE 'Remaining Foreign Key Indexes Added!';
  RAISE NOTICE 'All foreign keys should now be properly indexed';
  RAISE NOTICE 'Database performance optimized for maximum efficiency';
  RAISE NOTICE 'Note: New indexes may show as "unused" initially until they are used by queries';
END $$; 