-- Fix Index Performance Issues
-- This script fixes unindexed foreign keys and removes unused indexes

-- 1. Add missing indexes for foreign keys (unindexed_foreign_keys)

-- claim_history table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_claim_history_user_id ON public.claim_history(user_id);

-- discord_daily_claims table - wallet_address foreign key
CREATE INDEX IF NOT EXISTS idx_discord_daily_claims_wallet_address ON public.discord_daily_claims(wallet_address);

-- referrals table - referral_code_id foreign key
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code_id ON public.referrals(referral_code_id);

-- user_dailytask_claims table - task_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_dailytask_claims_task_id ON public.user_dailytask_claims(task_id);

-- users table - referred_by foreign key
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- x_users table - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_x_users_user_id ON public.x_users(user_id);

-- 2. Remove unused indexes (unused_index)

-- extra_rewards table
DROP INDEX IF EXISTS public.idx_extra_rewards_claimed;

-- discord_users table
DROP INDEX IF EXISTS public.idx_discord_users_user_id;
DROP INDEX IF EXISTS public.idx_discord_users_is_active;
DROP INDEX IF EXISTS public.idx_discord_users_invite_link;

-- discord_activities table
DROP INDEX IF EXISTS public.idx_discord_activities_total_xp;
DROP INDEX IF EXISTS public.idx_discord_activities_updated_at;

-- staking_tasks table
DROP INDEX IF EXISTS public.idx_staking_tasks_wallet_address;
DROP INDEX IF EXISTS public.idx_staking_tasks_stake_amount;
DROP INDEX IF EXISTS public.idx_staking_tasks_claimed;

-- discord_daily_stats table
DROP INDEX IF EXISTS public.idx_discord_daily_stats_activity_date;

-- referral_rewards table
DROP INDEX IF EXISTS public.idx_referral_rewards_tier;

-- referrals table
DROP INDEX IF EXISTS public.idx_referrals_referrer_id_count;

-- telegram_rewards table
DROP INDEX IF EXISTS public.idx_telegram_rewards_user_id;

-- telegram_messages table
DROP INDEX IF EXISTS public.idx_telegram_messages_telegram_id;
DROP INDEX IF EXISTS public.idx_telegram_messages_chat_id;

-- discord_invited_users table
DROP INDEX IF EXISTS public.idx_discord_invited_users_invite_code;
DROP INDEX IF EXISTS public.idx_discord_invited_users_is_active;

-- telegram_referral_tracking table
DROP INDEX IF EXISTS public.idx_telegram_referral_tracking_code;

-- telegram_referral_links table
DROP INDEX IF EXISTS public.idx_telegram_referral_links_code;
DROP INDEX IF EXISTS public.idx_telegram_referral_links_active;

-- x_users table
DROP INDEX IF EXISTS public.idx_x_users_active;
DROP INDEX IF EXISTS public.idx_x_users_verified;

-- x_oauth_sessions table
DROP INDEX IF EXISTS public.idx_x_oauth_sessions_expires_at;

-- discord_oauth_sessions table
DROP INDEX IF EXISTS public.idx_discord_oauth_sessions_wallet;

-- discord_daily_claims table
DROP INDEX IF EXISTS public.idx_discord_daily_claims_date;

-- 3. Verify the fixes
SELECT 
    'Index Performance Summary' as info,
    COUNT(*) as total_indexes,
    COUNT(CASE WHEN indexname LIKE 'idx_%' THEN 1 END) as custom_indexes,
    COUNT(CASE WHEN indexname LIKE '%_pkey' THEN 1 END) as primary_keys,
    COUNT(CASE WHEN indexname LIKE '%_key' THEN 1 END) as unique_keys
FROM pg_indexes 
WHERE schemaname = 'public';

-- 4. Show remaining foreign keys and their indexes
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    CASE 
        WHEN i.indexname IS NOT NULL THEN '✅ Indexed'
        ELSE '❌ Not Indexed'
    END as index_status
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

-- 5. Show all remaining indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname NOT LIKE '%_pkey'
AND indexname NOT LIKE '%_key'
ORDER BY tablename, indexname; 