-- Alternative Fix for Discord RLS Policies
-- This script creates more permissive policies to allow service role operations

-- First, let's check if the service role exists and has proper permissions
-- Drop all existing policies for Discord tables
DROP POLICY IF EXISTS "Users can view their own discord data" ON discord_users;
DROP POLICY IF EXISTS "Service role can manage discord users" ON discord_users;
DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "Service role can manage oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "Users can view their own activity" ON discord_activities;
DROP POLICY IF EXISTS "Service role can manage discord activities" ON discord_activities;
DROP POLICY IF EXISTS "Users can view their own claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "Service role can manage discord claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "Users can view their own message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "Service role can manage message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "Users can view their own reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "Service role can manage reaction logs" ON discord_reaction_logs;

-- Create more permissive policies for discord_users
CREATE POLICY "discord_users_select_policy" ON discord_users
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_users_insert_policy" ON discord_users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_users_update_policy" ON discord_users
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_users_delete_policy" ON discord_users
    FOR DELETE USING (auth.role() = 'service_role');

-- Create more permissive policies for discord_oauth_sessions
CREATE POLICY "discord_oauth_sessions_select_policy" ON discord_oauth_sessions
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_oauth_sessions_insert_policy" ON discord_oauth_sessions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_oauth_sessions_update_policy" ON discord_oauth_sessions
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_oauth_sessions_delete_policy" ON discord_oauth_sessions
    FOR DELETE USING (auth.role() = 'service_role');

-- Create more permissive policies for discord_activities
CREATE POLICY "discord_activities_select_policy" ON discord_activities
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "discord_activities_insert_policy" ON discord_activities
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_activities_update_policy" ON discord_activities
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_activities_delete_policy" ON discord_activities
    FOR DELETE USING (auth.role() = 'service_role');

-- Create more permissive policies for discord_daily_claims
CREATE POLICY "discord_daily_claims_select_policy" ON discord_daily_claims
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_daily_claims_insert_policy" ON discord_daily_claims
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_daily_claims_update_policy" ON discord_daily_claims
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_daily_claims_delete_policy" ON discord_daily_claims
    FOR DELETE USING (auth.role() = 'service_role');

-- Create more permissive policies for discord_message_logs
CREATE POLICY "discord_message_logs_select_policy" ON discord_message_logs
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "discord_message_logs_insert_policy" ON discord_message_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_message_logs_update_policy" ON discord_message_logs
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_message_logs_delete_policy" ON discord_message_logs
    FOR DELETE USING (auth.role() = 'service_role');

-- Create more permissive policies for discord_reaction_logs
CREATE POLICY "discord_reaction_logs_select_policy" ON discord_reaction_logs
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "discord_reaction_logs_insert_policy" ON discord_reaction_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_reaction_logs_update_policy" ON discord_reaction_logs
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "discord_reaction_logs_delete_policy" ON discord_reaction_logs
    FOR DELETE USING (auth.role() = 'service_role');

-- Verify RLS is enabled on all tables
ALTER TABLE discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs ENABLE ROW LEVEL SECURITY; 