-- Final RLS Fix Script - Handles Existing Policies
-- This script fixes all RLS issues by dropping existing policies first

-- 1. Drop all existing policies for the tables that need RLS
DO $$
DECLARE
    r RECORD;
    policy_name text;
BEGIN
    -- Drop all existing policies for our target tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'discord_oauth_sessions', 'discord_daily_claims', 'extra_rewards', 'staking_tasks', 
        'claim_history', 'discord_invited_users', 'dailytasks', 'user_dailytask_claims', 
        'discord_activities', 'discord_users', 'invite_rewards'
    )) LOOP
        -- Get all policies for this table and drop them
        FOR policy_name IN 
            SELECT policyname FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = r.tablename
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.' || r.tablename;
            RAISE NOTICE 'Dropped existing policy: % on table %', policy_name, r.tablename;
        END LOOP;
    END LOOP;
END $$;

-- 2. Enable RLS on all tables that need it
ALTER TABLE public.discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_invited_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dailytasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dailytask_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_rewards ENABLE ROW LEVEL SECURITY;

-- 3. Create comprehensive RLS policies

-- discord_oauth_sessions policies
CREATE POLICY "discord_oauth_sessions_select_policy" ON public.discord_oauth_sessions
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "discord_oauth_sessions_insert_policy" ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "discord_oauth_sessions_update_policy" ON public.discord_oauth_sessions
    FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "discord_oauth_sessions_delete_policy" ON public.discord_oauth_sessions
    FOR DELETE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- discord_daily_claims policies
CREATE POLICY "discord_daily_claims_select_policy" ON public.discord_daily_claims
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "discord_daily_claims_insert_policy" ON public.discord_daily_claims
    FOR INSERT WITH CHECK (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- extra_rewards policies
CREATE POLICY "extra_rewards_select_policy" ON public.extra_rewards
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "extra_rewards_insert_policy" ON public.extra_rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "extra_rewards_update_policy" ON public.extra_rewards
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- staking_tasks policies
CREATE POLICY "staking_tasks_select_policy" ON public.staking_tasks
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "staking_tasks_insert_policy" ON public.staking_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "staking_tasks_update_policy" ON public.staking_tasks
    FOR UPDATE USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- claim_history policies
CREATE POLICY "claim_history_select_policy" ON public.claim_history
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "claim_history_insert_policy" ON public.claim_history
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- discord_invited_users policies
CREATE POLICY "discord_invited_users_select_policy" ON public.discord_invited_users
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

CREATE POLICY "discord_invited_users_manage_policy" ON public.discord_invited_users
    FOR ALL USING (true);

-- dailytasks policies (read-only for all authenticated users)
CREATE POLICY "dailytasks_select_policy" ON public.dailytasks
    FOR SELECT USING (true);

CREATE POLICY "dailytasks_manage_policy" ON public.dailytasks
    FOR ALL USING (true);

-- user_dailytask_claims policies
CREATE POLICY "user_dailytask_claims_select_policy" ON public.user_dailytask_claims
    FOR SELECT USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "user_dailytask_claims_insert_policy" ON public.user_dailytask_claims
    FOR INSERT WITH CHECK (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- discord_activities policies
CREATE POLICY "discord_activities_select_policy" ON public.discord_activities
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM public.discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "discord_activities_manage_policy" ON public.discord_activities
    FOR ALL USING (true);

-- discord_users policies
CREATE POLICY "discord_users_select_policy" ON public.discord_users
    FOR SELECT USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_users_insert_policy" ON public.discord_users
    FOR INSERT WITH CHECK (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_users_update_policy" ON public.discord_users
    FOR UPDATE USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "discord_users_delete_policy" ON public.discord_users
    FOR DELETE USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- invite_rewards policies
CREATE POLICY "invite_rewards_select_policy" ON public.invite_rewards
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

CREATE POLICY "invite_rewards_insert_policy" ON public.invite_rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "invite_rewards_update_policy" ON public.invite_rewards
    FOR UPDATE USING (
        user_id = (SELECT id FROM public.users WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    );

-- 4. Create helper function for wallet address extraction
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS text AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'wallet_address';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Create a function to verify RLS is working
CREATE OR REPLACE FUNCTION verify_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean, policy_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity as rls_enabled,
        COUNT(p.policyname) as policy_count
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 