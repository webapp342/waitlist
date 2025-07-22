-- Fix RLS Issues for Supabase Dashboard
-- This script enables Row Level Security on all tables and creates appropriate policies

-- 1. Enable RLS on all tables that need it
ALTER TABLE public.discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_reaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_invited_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dailytasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dailytask_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_rewards ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for each table

-- discord_oauth_sessions policies
CREATE POLICY "Allow users to view their own oauth sessions" ON public.discord_oauth_sessions
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Allow users to insert their own oauth sessions" ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Allow users to update their own oauth sessions" ON public.discord_oauth_sessions
    FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Allow users to delete their own oauth sessions" ON public.discord_oauth_sessions
    FOR DELETE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- discord_message_logs policies
CREATE POLICY "Allow users to view their own message logs" ON public.discord_message_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Allow system to insert message logs" ON public.discord_message_logs
    FOR INSERT WITH CHECK (true);

-- discord_reaction_logs policies
CREATE POLICY "Allow users to view their own reaction logs" ON public.discord_reaction_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Allow system to insert reaction logs" ON public.discord_reaction_logs
    FOR INSERT WITH CHECK (true);

-- discord_daily_claims policies
CREATE POLICY "Allow users to view their own daily claims" ON public.discord_daily_claims
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Allow users to insert their own daily claims" ON public.discord_daily_claims
    FOR INSERT WITH CHECK (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- extra_rewards policies
CREATE POLICY "Allow users to view their own extra rewards" ON public.extra_rewards
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "Allow system to insert extra rewards" ON public.extra_rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update their own extra rewards" ON public.extra_rewards
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- staking_tasks policies
CREATE POLICY "Allow users to view their own staking tasks" ON public.staking_tasks
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Allow system to insert staking tasks" ON public.staking_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update their own staking tasks" ON public.staking_tasks
    FOR UPDATE USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- discord_leaderboard_cache policies (read-only for all authenticated users)
CREATE POLICY "Allow authenticated users to view leaderboard cache" ON public.discord_leaderboard_cache
    FOR SELECT USING (true);

CREATE POLICY "Allow system to manage leaderboard cache" ON public.discord_leaderboard_cache
    FOR ALL USING (true);

-- claim_history policies
CREATE POLICY "Allow users to view their own claim history" ON public.claim_history
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "Allow users to insert their own claim history" ON public.claim_history
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- discord_invited_users policies
CREATE POLICY "Allow users to view their own invite records" ON public.discord_invited_users
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
        OR inviter_discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Allow system to manage invite records" ON public.discord_invited_users
    FOR ALL USING (true);

-- dailytasks policies (read-only for all authenticated users)
CREATE POLICY "Allow authenticated users to view daily tasks" ON public.dailytasks
    FOR SELECT USING (true);

CREATE POLICY "Allow system to manage daily tasks" ON public.dailytasks
    FOR ALL USING (true);

-- user_dailytask_claims policies
CREATE POLICY "Allow users to view their own daily task claims" ON public.user_dailytask_claims
    FOR SELECT USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Allow users to insert their own daily task claims" ON public.user_dailytask_claims
    FOR INSERT WITH CHECK (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- discord_activities policies
CREATE POLICY "Allow users to view their own discord activities" ON public.discord_activities
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Allow system to manage discord activities" ON public.discord_activities
    FOR ALL USING (true);

-- discord_users policies
CREATE POLICY "Allow users to view their own discord user data" ON public.discord_users
    FOR SELECT USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Allow users to insert their own discord user data" ON public.discord_users
    FOR INSERT WITH CHECK (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Allow users to update their own discord user data" ON public.discord_users
    FOR UPDATE USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Allow users to delete their own discord user data" ON public.discord_users
    FOR DELETE USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- invite_rewards policies
CREATE POLICY "Allow users to view their own invite rewards" ON public.invite_rewards
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "Allow system to insert invite rewards" ON public.invite_rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update their own invite rewards" ON public.invite_rewards
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- 3. Create a function to handle JWT claims for wallet_address
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS text AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'wallet_address';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 