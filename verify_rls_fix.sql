-- Verification script to check RLS status
-- Run this after applying the fix to verify all issues are resolved

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'discord_oauth_sessions', 'discord_daily_claims', 'extra_rewards', 'staking_tasks', 
    'claim_history', 'discord_invited_users', 'dailytasks', 'user_dailytask_claims', 
    'discord_activities', 'discord_users', 'invite_rewards'
)
ORDER BY tablename;

-- Check which tables have policies
SELECT 
    schemaname,
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

-- Summary of RLS status
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN t.rowsecurity = true AND COUNT(p.policyname) > 0 THEN '✅ Fixed'
        WHEN t.rowsecurity = false THEN '❌ RLS Disabled'
        WHEN t.rowsecurity = true AND COUNT(p.policyname) = 0 THEN '⚠️ RLS Enabled but No Policies'
        ELSE '❓ Unknown'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN (
    'discord_oauth_sessions', 'discord_daily_claims', 'extra_rewards', 'staking_tasks', 
    'claim_history', 'discord_invited_users', 'dailytasks', 'user_dailytask_claims', 
    'discord_activities', 'discord_users', 'invite_rewards'
)
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename; 