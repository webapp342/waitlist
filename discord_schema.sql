-- Discord OAuth Sessions Table
CREATE TABLE IF NOT EXISTS discord_oauth_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Users Table
CREATE TABLE IF NOT EXISTS discord_users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(10) NOT NULL,
    avatar_url TEXT,
    email VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    locale VARCHAR(10),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    premium_type INTEGER DEFAULT 0,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Activities Table
CREATE TABLE IF NOT EXISTS discord_activities (
    id BIGSERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
    message_count INTEGER DEFAULT 0,
    daily_active_days INTEGER DEFAULT 0,
    weekly_streak INTEGER DEFAULT 0,
    total_reactions INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    guild_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Daily Claims Table
CREATE TABLE IF NOT EXISTS discord_daily_claims (
    id BIGSERIAL PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    reward_amount INTEGER NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Message Logs Table (for tracking activity)
CREATE TABLE IF NOT EXISTS discord_message_logs (
    id BIGSERIAL PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
    guild_id VARCHAR(255),
    channel_id VARCHAR(255),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    message_content TEXT,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Reaction Logs Table
CREATE TABLE IF NOT EXISTS discord_reaction_logs (
    id BIGSERIAL PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    reaction_type VARCHAR(50),
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discord_oauth_sessions_state ON discord_oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_discord_oauth_sessions_wallet ON discord_oauth_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_discord_users_wallet ON discord_users(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_activities_discord_id ON discord_activities(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_daily_claims_discord_id ON discord_daily_claims(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_daily_claims_date ON discord_daily_claims(claimed_at);
CREATE INDEX IF NOT EXISTS idx_discord_message_logs_discord_id ON discord_message_logs(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_reaction_logs_discord_id ON discord_reaction_logs(discord_id);

-- Row Level Security (RLS) Policies
ALTER TABLE discord_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_reaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_oauth_sessions
CREATE POLICY "Users can view their own oauth sessions" ON discord_oauth_sessions
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage oauth sessions" ON discord_oauth_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for discord_users
CREATE POLICY "Users can view their own discord data" ON discord_users
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage discord users" ON discord_users
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for discord_activities
CREATE POLICY "Users can view their own activity" ON discord_activities
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage discord activities" ON discord_activities
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for discord_daily_claims
CREATE POLICY "Users can view their own claims" ON discord_daily_claims
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service role can manage discord claims" ON discord_daily_claims
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for discord_message_logs
CREATE POLICY "Users can view their own message logs" ON discord_message_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage message logs" ON discord_message_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for discord_reaction_logs
CREATE POLICY "Users can view their own reaction logs" ON discord_reaction_logs
    FOR SELECT USING (
        discord_id IN (
            SELECT discord_id FROM discord_users 
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Service role can manage reaction logs" ON discord_reaction_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_discord_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_discord_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_discord_users_updated_at
    BEFORE UPDATE ON discord_users
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_users_updated_at();

CREATE TRIGGER update_discord_activities_updated_at
    BEFORE UPDATE ON discord_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_activities_updated_at();

-- Function to add XP to Discord user
CREATE OR REPLACE FUNCTION add_discord_xp(
    p_discord_id VARCHAR(255),
    p_xp_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE discord_activities 
    SET 
        total_xp = total_xp + p_xp_amount,
        updated_at = NOW()
    WHERE discord_id = p_discord_id;
    
    -- Update level based on total XP
    UPDATE discord_activities 
    SET current_level = CASE
        WHEN total_xp <= 100 THEN 1
        WHEN total_xp <= 250 THEN 2
        WHEN total_xp <= 500 THEN 3
        WHEN total_xp <= 1000 THEN 4
        ELSE 5
    END
    WHERE discord_id = p_discord_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record Discord message
CREATE OR REPLACE FUNCTION record_discord_message(
    p_discord_id VARCHAR(255),
    p_guild_id VARCHAR(255),
    p_channel_id VARCHAR(255),
    p_message_id VARCHAR(255),
    p_message_content TEXT,
    p_xp_earned INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    -- Insert message log
    INSERT INTO discord_message_logs (
        discord_id, guild_id, channel_id, message_id, message_content, xp_earned
    ) VALUES (
        p_discord_id, p_guild_id, p_channel_id, p_message_id, p_message_content, p_xp_earned
    );
    
    -- Update activity stats
    UPDATE discord_activities 
    SET 
        message_count = message_count + 1,
        total_xp = total_xp + p_xp_earned,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE discord_id = p_discord_id;
    
    -- Add XP
    PERFORM add_discord_xp(p_discord_id, p_xp_earned);
END;
$$ LANGUAGE plpgsql;

-- Function to record Discord reaction
CREATE OR REPLACE FUNCTION record_discord_reaction(
    p_discord_id VARCHAR(255),
    p_message_id VARCHAR(255),
    p_reaction_type VARCHAR(50),
    p_xp_earned INTEGER DEFAULT 2
)
RETURNS VOID AS $$
BEGIN
    -- Insert reaction log
    INSERT INTO discord_reaction_logs (
        discord_id, message_id, reaction_type, xp_earned
    ) VALUES (
        p_discord_id, p_message_id, p_reaction_type, p_xp_earned
    );
    
    -- Update activity stats
    UPDATE discord_activities 
    SET 
        total_reactions = total_reactions + 1,
        total_xp = total_xp + p_xp_earned,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE discord_id = p_discord_id;
    
    -- Add XP
    PERFORM add_discord_xp(p_discord_id, p_xp_earned);
END;
$$ LANGUAGE plpgsql; 