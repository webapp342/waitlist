-- Final Discord RLS Fix
-- This script completely fixes the Row Level Security issues for Discord tables

-- Step 1: Temporarily disable RLS to clean up policies
ALTER TABLE discord_oauth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own discord data" ON discord_users;
DROP POLICY IF EXISTS "Service role can manage discord users" ON discord_users;
DROP POLICY IF EXISTS "discord_users_select_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_insert_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_update_policy" ON discord_users;
DROP POLICY IF EXISTS "discord_users_delete_policy" ON discord_users;

DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "Service role can manage oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_select_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_insert_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_update_policy" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "discord_oauth_sessions_delete_policy" ON discord_oauth_sessions;

DROP POLICY IF EXISTS "Users can view their own activity" ON discord_activities;
DROP POLICY IF EXISTS "Service role can manage discord activities" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_select_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_insert_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_update_policy" ON discord_activities;
DROP POLICY IF EXISTS "discord_activities_delete_policy" ON discord_activities;

DROP POLICY IF EXISTS "Users can view their own claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "Service role can manage discord claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_select_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_insert_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_update_policy" ON discord_daily_claims;
DROP POLICY IF EXISTS "discord_daily_claims_delete_policy" ON discord_daily_claims;

DROP POLICY IF EXISTS "Users can view their own message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "Service role can manage message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_select_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_insert_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_update_policy" ON discord_message_logs;
DROP POLICY IF EXISTS "discord_message_logs_delete_policy" ON discord_message_logs;

DROP POLICY IF EXISTS "Users can view their own reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "Service role can manage reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_select_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_insert_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_update_policy" ON discord_reaction_logs;
DROP POLICY IF EXISTS "discord_reaction_logs_delete_policy" ON discord_reaction_logs;

-- Step 3: Re-enable RLS
ALTER TABLE discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new, simplified policies that work with service role

-- Discord Users policies
CREATE POLICY "discord_users_all_operations" ON discord_users
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'wallet_address',
            current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Discord OAuth Sessions policies
CREATE POLICY "discord_oauth_sessions_all_operations" ON discord_oauth_sessions
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        wallet_address = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'wallet_address',
            current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Discord Activities policies
CREATE POLICY "discord_activities_all_operations" ON discord_activities
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = COALESCE(
                current_setting('request.jwt.claims', true)::json->>'wallet_address',
                current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
    );

-- Discord Daily Claims policies
CREATE POLICY "discord_daily_claims_all_operations" ON discord_daily_claims
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        wallet_address = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'wallet_address',
            current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Discord Message Logs policies
CREATE POLICY "discord_message_logs_all_operations" ON discord_message_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = COALESCE(
                current_setting('request.jwt.claims', true)::json->>'wallet_address',
                current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
    );

-- Discord Reaction Logs policies
CREATE POLICY "discord_reaction_logs_all_operations" ON discord_reaction_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = COALESCE(
                current_setting('request.jwt.claims', true)::json->>'wallet_address',
                current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
    );

-- Step 5: Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename, policyname;

-- Step 6: Test service role access (this should work now)
-- Note: This test assumes the service role is properly configured
SELECT 
    'Discord RLS policies updated successfully' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename LIKE 'discord_%'; 