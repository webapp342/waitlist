-- Fix Discord RLS Policies
-- This script fixes the Row Level Security policies for Discord tables
-- to allow service role operations and proper user access

-- Drop existing policies for discord_users
DROP POLICY IF EXISTS "Users can view their own discord data" ON discord_users;
DROP POLICY IF EXISTS "Service role can manage discord users" ON discord_users;

-- Create new policies for discord_users
CREATE POLICY "Users can view their own discord data" ON discord_users
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage discord users" ON discord_users
    FOR ALL USING (auth.role() = 'service_role');

-- Drop existing policies for discord_oauth_sessions
DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON discord_oauth_sessions;
DROP POLICY IF EXISTS "Service role can manage oauth sessions" ON discord_oauth_sessions;

-- Create new policies for discord_oauth_sessions
CREATE POLICY "Users can view their own oauth sessions" ON discord_oauth_sessions
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage oauth sessions" ON discord_oauth_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Drop existing policies for discord_activities
DROP POLICY IF EXISTS "Users can view their own activity" ON discord_activities;
DROP POLICY IF EXISTS "Service role can manage discord activities" ON discord_activities;

-- Create new policies for discord_activities
CREATE POLICY "Users can view their own activity" ON discord_activities
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage discord activities" ON discord_activities
    FOR ALL USING (auth.role() = 'service_role');

-- Drop existing policies for discord_daily_claims
DROP POLICY IF EXISTS "Users can view their own claims" ON discord_daily_claims;
DROP POLICY IF EXISTS "Service role can manage discord claims" ON discord_daily_claims;

-- Create new policies for discord_daily_claims
CREATE POLICY "Users can view their own claims" ON discord_daily_claims
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage discord claims" ON discord_daily_claims
    FOR ALL USING (auth.role() = 'service_role');

-- Drop existing policies for discord_message_logs
DROP POLICY IF EXISTS "Users can view their own message logs" ON discord_message_logs;
DROP POLICY IF EXISTS "Service role can manage message logs" ON discord_message_logs;

-- Create new policies for discord_message_logs
CREATE POLICY "Users can view their own message logs" ON discord_message_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage message logs" ON discord_message_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Drop existing policies for discord_reaction_logs
DROP POLICY IF EXISTS "Users can view their own reaction logs" ON discord_reaction_logs;
DROP POLICY IF EXISTS "Service role can manage reaction logs" ON discord_reaction_logs;

-- Create new policies for discord_reaction_logs
CREATE POLICY "Users can view their own reaction logs" ON discord_reaction_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage reaction logs" ON discord_reaction_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Verify RLS is enabled on all tables
ALTER TABLE discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs ENABLE ROW LEVEL SECURITY; 