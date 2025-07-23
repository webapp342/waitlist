-- Remove Unused Tables Script
-- This script safely removes the 5 unused tables identified in the analysis

-- 1. First, let's check if these tables exist and their dependencies
DO $$
DECLARE
    tbl_name text;
    table_exists boolean;
BEGIN
    -- Check each table and log its status
    FOR tbl_name IN 
        SELECT unnest(ARRAY[
            'discord_message_logs',
            'discord_reaction_logs', 
            'discord_leaderboard_cache',
            'telegram_daily_activities',
            'telegram_referrals'
        ])
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) INTO table_exists;
        
        IF table_exists THEN
            RAISE NOTICE 'Table % exists and will be removed', tbl_name;
        ELSE
            RAISE NOTICE 'Table % does not exist (already removed or never created)', tbl_name;
        END IF;
    END LOOP;
END $$;

-- 2. Drop foreign key constraints first (if they exist)
-- This prevents dependency issues during table removal

-- Drop constraints for discord_message_logs
DO $$
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'discord_message_logs_discord_id_fkey'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.discord_message_logs DROP CONSTRAINT IF EXISTS discord_message_logs_discord_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint for discord_message_logs';
    END IF;
END $$;

-- Drop constraints for discord_reaction_logs
DO $$
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'discord_reaction_logs_discord_id_fkey'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.discord_reaction_logs DROP CONSTRAINT IF EXISTS discord_reaction_logs_discord_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint for discord_reaction_logs';
    END IF;
END $$;

-- Drop constraints for discord_leaderboard_cache
DO $$
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'discord_leaderboard_cache_discord_id_fkey'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.discord_leaderboard_cache DROP CONSTRAINT IF EXISTS discord_leaderboard_cache_discord_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint for discord_leaderboard_cache';
    END IF;
END $$;

-- 3. Drop the unused tables
-- Using DROP TABLE IF EXISTS to avoid errors if tables don't exist

DROP TABLE IF EXISTS public.discord_message_logs CASCADE;
DROP TABLE IF EXISTS public.discord_reaction_logs CASCADE;
DROP TABLE IF EXISTS public.discord_leaderboard_cache CASCADE;
DROP TABLE IF EXISTS public.telegram_daily_activities CASCADE;
DROP TABLE IF EXISTS public.telegram_referrals CASCADE;

-- 4. Drop associated sequences if they exist
DROP SEQUENCE IF EXISTS public.discord_message_logs_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.discord_reaction_logs_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.discord_leaderboard_cache_id_seq CASCADE;

-- 5. Verify removal
DO $$
DECLARE
    tbl_name text;
    table_exists boolean;
    removed_count integer := 0;
BEGIN
    -- Check each table and count how many were removed
    FOR tbl_name IN 
        SELECT unnest(ARRAY[
            'discord_message_logs',
            'discord_reaction_logs', 
            'discord_leaderboard_cache',
            'telegram_daily_activities',
            'telegram_referrals'
        ])
    LOOP
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
    
    RAISE NOTICE 'Removal Summary: % out of 5 unused tables were successfully removed', removed_count;
END $$;

-- 6. Update RLS scripts to remove references to deleted tables
-- This is just a note - you'll need to update your RLS scripts manually
DO $$
BEGIN
    RAISE NOTICE 'IMPORTANT: Remember to update your RLS scripts (fix_rls_issues.sql and fix_rls_issues_complete.sql) to remove references to the deleted tables';
END $$; 