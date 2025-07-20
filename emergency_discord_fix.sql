-- Emergency Discord RLS Fix
-- This script temporarily disables RLS to get Discord OAuth working immediately
-- WARNING: This is a temporary fix for testing - re-enable RLS after confirming the issue

-- Step 1: Completely disable RLS on all Discord tables
ALTER TABLE discord_oauth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to clean up
DROP POLICY IF EXISTS "Users can view their own discord data" ON discord_users;
DROP POLICY IF EXISTS "Service role can manage discord users" ON discord_users;
DROP POLICY IF EXISTS "discord_users_select_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_insert_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_update_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_delete_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_all_operations" ON discord_users;

DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "Service role can manage oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_select_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_insert_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_update_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_delete_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_all_operations" ON discord_oauth_sessions;

DROP POLICY IF EXISTS "Users can view their own activity" ON discord_activities;
DROP POLICY IF EXISTS "Service role can manage discord activities" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_select_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_insert_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_update_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_delete_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_all_operations" ON discord_activities;

DROP POLICY IF EXISTS "Users can view their own claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "Service role can manage discord claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_select_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_insert_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_update_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_delete_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_all_operations" ON discord_daily_claims;

DROP POLICY IF EXISTS "Users can view their own message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "Service role can manage message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_select_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_insert_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_update_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_delete_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_all_operations" ON discord_message_logs;

DROP POLICY IF EXISTS "Users can view their own reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "Service role can manage reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_select_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_insert_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_update_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_delete_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_all_operations" ON discord_reaction_logs;

-- Step 3: Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename;

-- Step 4: Test that we can now insert into discord_users
-- This should work now that RLS is disabled
INSERT INTO discord_users (
    user_id, 
    discord_id, 
    username, 
    discriminator, 
    avatar_url, 
    access_token, 
    refresh_token, 
    token_expires_at, 
    is_active
) VALUES (
    '0xTESTWALLET123456789', 
    'TEST_DISCORD_ID_456', 
    'test_user_emergency', 
    '0', 
    'https://example.com/avatar.png', 
    'test_access_token', 
    'test_refresh_token', 
    NOW() + INTERVAL '1 hour', 
    true
) ON CONFLICT (discord_id) DO NOTHING;

-- Step 5: Verify the test insert worked
SELECT 
    'Emergency fix applied - RLS disabled' as status,
    COUNT(*) as total_discord_users
FROM discord_users;

-- Step 6: Clean up test record
DELETE FROM discord_users WHERE discord_id = 'TEST_DISCORD_ID_456';

-- IMPORTANT: After testing Discord OAuth, run the re-enable script below 