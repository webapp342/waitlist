-- X OAuth 2.0 Database Schema
-- Based on X Developer Documentation v2

-- X OAuth Sessions (for PKCE flow)
CREATE TABLE IF NOT EXISTS x_oauth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    used BOOLEAN DEFAULT FALSE
);

-- X User Connections
CREATE TABLE IF NOT EXISTS x_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    x_user_id VARCHAR(255) UNIQUE NOT NULL,
    x_username VARCHAR(255) NOT NULL,
    x_name VARCHAR(255),
    x_profile_image_url TEXT,
    x_verified BOOLEAN DEFAULT FALSE,
    x_followers_count INTEGER DEFAULT 0,
    x_following_count INTEGER DEFAULT 0,
    x_tweet_count INTEGER DEFAULT 0,
    access_token TEXT NULL, -- Allow NULL for Bearer Token connections
    refresh_token TEXT NULL, -- Allow NULL for Bearer Token connections
    token_expires_at TIMESTAMP WITH TIME ZONE NULL, -- Allow NULL for Bearer Token connections
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_x_users_wallet_address ON x_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x_users_x_user_id ON x_users(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_users_active ON x_users(is_active);
CREATE INDEX IF NOT EXISTS idx_x_oauth_sessions_session_id ON x_oauth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_x_oauth_sessions_expires_at ON x_oauth_sessions(expires_at);

-- RLS Policies
ALTER TABLE x_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_users ENABLE ROW LEVEL SECURITY;

-- X OAuth Sessions policies - Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on x_oauth_sessions" ON x_oauth_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- X Users policies - Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on x_users" ON x_users
    FOR ALL USING (true) WITH CHECK (true);

-- Clean up expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_x_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM x_oauth_sessions 
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Auto cleanup every hour (if pg_cron extension is available)
-- SELECT cron.schedule('cleanup-x-sessions', '0 * * * *', 'SELECT cleanup_expired_x_sessions();'); 