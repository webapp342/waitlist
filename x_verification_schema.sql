-- X Verification Sessions Table
CREATE TABLE IF NOT EXISTS x_verification_sessions (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    x_username TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_x_verification_sessions_wallet ON x_verification_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x_verification_sessions_username ON x_verification_sessions(x_username);
CREATE INDEX IF NOT EXISTS idx_x_verification_sessions_code ON x_verification_sessions(verification_code);
CREATE INDEX IF NOT EXISTS idx_x_verification_sessions_token ON x_verification_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_x_verification_sessions_expires ON x_verification_sessions(expires_at);

-- RLS Policies for x_verification_sessions
ALTER TABLE x_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (API calls)
CREATE POLICY "Service role can manage verification sessions" ON x_verification_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own verification sessions
CREATE POLICY "Users can read own verification sessions" ON x_verification_sessions
    FOR SELECT USING (wallet_address = auth.jwt() ->> 'wallet_address');

-- Clean up expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_verification_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM x_verification_sessions 
    WHERE expires_at < NOW() OR (is_used = true AND used_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (optional)
-- This would require pg_cron extension
-- SELECT cron.schedule('cleanup-verification-sessions', '0 */6 * * *', 'SELECT cleanup_expired_verification_sessions();');

-- Update x_users table to add verification fields if not exists
ALTER TABLE x_users 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'oauth';

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_x_users_verified ON x_users(verified_at);

-- Comments
COMMENT ON TABLE x_verification_sessions IS 'Stores X account verification sessions with codes';
COMMENT ON COLUMN x_verification_sessions.verification_code IS '6-digit verification code sent to X account';
COMMENT ON COLUMN x_verification_sessions.session_token IS 'Unique session token for verification process';
COMMENT ON COLUMN x_verification_sessions.is_used IS 'Whether the verification code has been used';
COMMENT ON COLUMN x_verification_sessions.expires_at IS 'When the verification code expires (10 minutes)'; 