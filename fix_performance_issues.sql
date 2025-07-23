-- Fix Performance Issues
-- This script fixes auth_rls_initplan and multiple_permissive_policies warnings

-- 1. Fix Auth RLS Initialization Plan issues
-- Drop existing policies and recreate with optimized auth function calls

-- discord_oauth_sessions policies
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;

CREATE POLICY discord_oauth_sessions_select_policy ON public.discord_oauth_sessions
    FOR SELECT USING (wallet_address = (select get_wallet_address()));

CREATE POLICY discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (wallet_address = (select get_wallet_address()));

CREATE POLICY discord_oauth_sessions_update_policy ON public.discord_oauth_sessions
    FOR UPDATE USING (wallet_address = (select get_wallet_address()));

CREATE POLICY discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions
    FOR DELETE USING (wallet_address = (select get_wallet_address()));

-- discord_daily_claims policies
DROP POLICY IF EXISTS discord_daily_claims_select_policy ON public.discord_daily_claims;
DROP POLICY IF EXISTS discord_daily_claims_insert_policy ON public.discord_daily_claims;

CREATE POLICY discord_daily_claims_select_policy ON public.discord_daily_claims
    FOR SELECT USING (wallet_address = (select get_wallet_address()));

CREATE POLICY discord_daily_claims_insert_policy ON public.discord_daily_claims
    FOR INSERT WITH CHECK (wallet_address = (select get_wallet_address()));

-- extra_rewards policies - user_id is INTEGER, need to get user_id from users table
DROP POLICY IF EXISTS extra_rewards_select_policy ON public.extra_rewards;
DROP POLICY IF EXISTS extra_rewards_update_policy ON public.extra_rewards;

CREATE POLICY extra_rewards_select_policy ON public.extra_rewards
    FOR SELECT USING (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

CREATE POLICY extra_rewards_update_policy ON public.extra_rewards
    FOR UPDATE USING (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

-- staking_tasks policies
DROP POLICY IF EXISTS staking_tasks_select_policy ON public.staking_tasks;
DROP POLICY IF EXISTS staking_tasks_update_policy ON public.staking_tasks;

CREATE POLICY staking_tasks_select_policy ON public.staking_tasks
    FOR SELECT USING (wallet_address = (select get_wallet_address()));

CREATE POLICY staking_tasks_update_policy ON public.staking_tasks
    FOR UPDATE USING (wallet_address = (select get_wallet_address()));

-- claim_history policies - user_id is BIGINT, need to get user_id from users table
DROP POLICY IF EXISTS claim_history_select_policy ON public.claim_history;
DROP POLICY IF EXISTS claim_history_insert_policy ON public.claim_history;

CREATE POLICY claim_history_select_policy ON public.claim_history
    FOR SELECT USING (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

CREATE POLICY claim_history_insert_policy ON public.claim_history
    FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

-- discord_users policies - user_id is TEXT (wallet_address)
DROP POLICY IF EXISTS discord_users_select_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_insert_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_update_policy ON public.discord_users;
DROP POLICY IF EXISTS discord_users_delete_policy ON public.discord_users;

CREATE POLICY discord_users_select_policy ON public.discord_users
    FOR SELECT USING (user_id = (select get_wallet_address()));

CREATE POLICY discord_users_insert_policy ON public.discord_users
    FOR INSERT WITH CHECK (user_id = (select get_wallet_address()));

CREATE POLICY discord_users_update_policy ON public.discord_users
    FOR UPDATE USING (user_id = (select get_wallet_address()));

CREATE POLICY discord_users_delete_policy ON public.discord_users
    FOR DELETE USING (user_id = (select get_wallet_address()));

-- discord_invited_users policies - inviter_discord_id is TEXT, need to get from discord_users table
DROP POLICY IF EXISTS discord_invited_users_select_policy ON public.discord_invited_users;

CREATE POLICY discord_invited_users_select_policy ON public.discord_invited_users
    FOR SELECT USING (inviter_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = (select get_wallet_address()) LIMIT 1));

-- user_dailytask_claims policies - user_id is TEXT (wallet_address)
DROP POLICY IF EXISTS user_dailytask_claims_select_policy ON public.user_dailytask_claims;
DROP POLICY IF EXISTS user_dailytask_claims_insert_policy ON public.user_dailytask_claims;

CREATE POLICY user_dailytask_claims_select_policy ON public.user_dailytask_claims
    FOR SELECT USING (user_id = (select get_wallet_address()));

CREATE POLICY user_dailytask_claims_insert_policy ON public.user_dailytask_claims
    FOR INSERT WITH CHECK (user_id = (select get_wallet_address()));

-- discord_activities policies - discord_id is TEXT, need to get from discord_users table
DROP POLICY IF EXISTS discord_activities_select_policy ON public.discord_activities;

CREATE POLICY discord_activities_select_policy ON public.discord_activities
    FOR SELECT USING (discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = (select get_wallet_address()) LIMIT 1));

-- invite_rewards policies - user_id is INTEGER, need to get user_id from users table
DROP POLICY IF EXISTS invite_rewards_select_policy ON public.invite_rewards;
DROP POLICY IF EXISTS invite_rewards_update_policy ON public.invite_rewards;

CREATE POLICY invite_rewards_select_policy ON public.invite_rewards
    FOR SELECT USING (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

CREATE POLICY invite_rewards_update_policy ON public.invite_rewards
    FOR UPDATE USING (user_id = (SELECT id FROM public.users WHERE wallet_address = (select get_wallet_address()) LIMIT 1));

-- 2. Fix Multiple Permissive Policies by removing duplicate policies

-- dailytasks - remove duplicate policies
DROP POLICY IF EXISTS dailytasks_manage_policy ON public.dailytasks;
-- Keep only dailytasks_select_policy

-- discord_activities - remove duplicate policies  
DROP POLICY IF EXISTS discord_activities_manage_policy ON public.discord_activities;
-- Keep only discord_activities_select_policy

-- discord_invited_users - remove duplicate policies
DROP POLICY IF EXISTS discord_invited_users_manage_policy ON public.discord_invited_users;
-- Keep only discord_invited_users_select_policy

-- 3. Verify the fixes
SELECT 
    'Performance Issues Fixed' as info,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN policyname LIKE '%_select_policy' THEN 1 END) as select_policies,
    COUNT(CASE WHEN policyname LIKE '%_insert_policy' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN policyname LIKE '%_update_policy' THEN 1 END) as update_policies,
    COUNT(CASE WHEN policyname LIKE '%_delete_policy' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'discord_oauth_sessions', 'discord_daily_claims', 'extra_rewards', 'staking_tasks',
    'claim_history', 'discord_invited_users', 'dailytasks', 'user_dailytask_claims',
    'discord_activities', 'discord_users', 'invite_rewards'
);

-- 4. Show remaining policies for verification
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'discord_oauth_sessions', 'discord_daily_claims', 'extra_rewards', 'staking_tasks',
    'claim_history', 'discord_invited_users', 'dailytasks', 'user_dailytask_claims',
    'discord_activities', 'discord_users', 'invite_rewards'
)
ORDER BY tablename, policyname; 