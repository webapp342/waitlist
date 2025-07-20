-- Re-enable Discord RLS with Proper Policies
-- Run this script AFTER testing that Discord OAuth works with RLS disabled

-- Step 1: Re-enable RLS on all Discord tables
ALTER TABLE discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Create simplified policies that should work with service role
-- These policies are more permissive and should allow the service role to work

-- Discord Users - Allow service role and authenticated users
CREATE POLICY "discord_users_service_role_access" ON discord_users
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Discord OAuth Sessions - Allow service role and authenticated users
CREATE POLICY "discord_oauth_sessions_service_role_access" ON discord_oauth_sessions
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Discord Activities - Allow service role and authenticated users
CREATE POLICY "discord_activities_service_role_access" ON discord_activities
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Discord Daily Claims - Allow service role and authenticated users
CREATE POLICY "discord_daily_claims_service_role_access" ON discord_daily_claims
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Discord Message Logs - Allow service role and authenticated users
CREATE POLICY "discord_message_logs_service_role_access" ON discord_message_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Discord Reaction Logs - Allow service role and authenticated users
CREATE POLICY "discord_reaction_logs_service_role_access" ON discord_reaction_logs
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.role() = 'authenticated'
    );

-- Step 3: Verify RLS is enabled and policies are created
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename;

-- Step 4: Check the policies
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

-- Step 5: Test that the policies work
SELECT 
    'RLS re-enabled with service role policies' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename LIKE 'discord_%';

-- Note: These policies are more permissive than the original ones
-- They allow any authenticated user to access Discord data
-- This is a temporary solution until we can properly configure the service role
-- For production, you may want to implement more restrictive policies 