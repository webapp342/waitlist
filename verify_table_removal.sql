-- Verify Table Removal Script
-- This script checks the current state after removing unused tables

-- 1. Check which tables still exist in the database
SELECT 
    'Current Tables in Database' as info,
    schemaname,
    tablename,
    '✅ Exists' as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Verify that the 5 unused tables have been removed
DO $$
DECLARE
    tbl_name text;
    table_exists boolean;
    removed_count integer := 0;
    total_checked integer := 0;
BEGIN
    RAISE NOTICE '=== VERIFICATION: Checking if unused tables were removed ===';
    
    FOR tbl_name IN 
        SELECT unnest(ARRAY[
            'discord_message_logs',
            'discord_reaction_logs', 
            'discord_leaderboard_cache',
            'telegram_daily_activities',
            'telegram_referrals'
        ])
    LOOP
        total_checked := total_checked + 1;
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            removed_count := removed_count + 1;
            RAISE NOTICE '✅ Table % successfully removed', tbl_name;
        ELSE
            RAISE NOTICE '❌ Table % still exists (removal failed)', tbl_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'Tables checked: %', total_checked;
    RAISE NOTICE 'Tables successfully removed: %', removed_count;
    RAISE NOTICE 'Tables still exist: %', total_checked - removed_count;
    
    IF removed_count = total_checked THEN
        RAISE NOTICE '🎉 SUCCESS: All unused tables were successfully removed!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Some tables could not be removed. Check the logs above.';
    END IF;
END $$;

-- 3. Check for any orphaned sequences
SELECT 
    'Orphaned Sequences' as info,
    schemaname,
    sequencename,
    '⚠️ Orphaned' as status
FROM pg_sequences 
WHERE schemaname = 'public' 
AND sequencename IN (
    'discord_message_logs_id_seq',
    'discord_reaction_logs_id_seq',
    'discord_leaderboard_cache_id_seq'
);

-- 4. Show current table count
SELECT 
    'Database Summary' as info,
    COUNT(*) as total_tables,
    'Current table count' as description
FROM pg_tables 
WHERE schemaname = 'public';

-- 5. List all remaining tables for reference
SELECT 
    'Remaining Tables' as info,
    ROW_NUMBER() OVER (ORDER BY tablename) as table_number,
    tablename,
    'Active' as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename; 