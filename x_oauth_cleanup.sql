-- Cleanup existing X OAuth tables (if they exist)
-- Run this first before creating new tables

-- Drop tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS x_users CASCADE;
DROP TABLE IF EXISTS x_oauth_sessions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_x_sessions() CASCADE;

-- Drop policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can insert their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can update their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can view their own x connections" ON x_users;
DROP POLICY IF EXISTS "Users can insert their own x connections" ON x_users;
DROP POLICY IF EXISTS "Users can update their own x connections" ON x_users;

-- Drop indexes (if they exist)
DROP INDEX IF EXISTS idx_x_users_wallet_address;
DROP INDEX IF EXISTS idx_x_users_x_user_id;
DROP INDEX IF EXISTS idx_x_users_active;
DROP INDEX IF EXISTS idx_x_oauth_sessions_session_id;
DROP INDEX IF EXISTS idx_x_oauth_sessions_expires_at; 