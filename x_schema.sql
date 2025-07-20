-- X Users Table for OAuth Integration
CREATE TABLE IF NOT EXISTS public.x_users (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    x_user_id VARCHAR(50) NOT NULL UNIQUE,
    x_username VARCHAR(50) NOT NULL,
    x_name VARCHAR(255) NOT NULL,
    x_profile_image_url TEXT,
    x_verified BOOLEAN DEFAULT FALSE,
    x_followers_count INTEGER DEFAULT 0,
    x_following_count INTEGER DEFAULT 0,
    x_tweet_count INTEGER DEFAULT 0,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_x_users_wallet_address ON public.x_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x_users_x_user_id ON public.x_users(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_users_user_id ON public.x_users(user_id);
CREATE INDEX IF NOT EXISTS idx_x_users_is_active ON public.x_users(is_active);

-- Unique constraint to prevent multiple active connections for same wallet
CREATE UNIQUE INDEX IF NOT EXISTS idx_x_users_wallet_active ON public.x_users(wallet_address) WHERE is_active = TRUE;

-- Row Level Security (RLS) Policies
-- Note: This project uses wallet-based authentication, not Supabase Auth
-- RLS is disabled for now since we handle authentication at the application level
ALTER TABLE public.x_users DISABLE ROW LEVEL SECURITY;

-- Alternative: Enable RLS with permissive policies for development
-- ALTER TABLE public.x_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations for authenticated users" ON public.x_users
--     FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_x_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_x_users_updated_at
    BEFORE UPDATE ON public.x_users
    FOR EACH ROW
    EXECUTE FUNCTION update_x_users_updated_at();

-- Function to check if X account is already connected to another wallet
CREATE OR REPLACE FUNCTION check_x_account_unique()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this X account is already connected to a different wallet
    IF EXISTS (
        SELECT 1 FROM public.x_users 
        WHERE x_user_id = NEW.x_user_id 
        AND wallet_address != NEW.wallet_address 
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'X account is already connected to another wallet';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate X account connections
CREATE TRIGGER check_x_account_unique_trigger
    BEFORE INSERT OR UPDATE ON public.x_users
    FOR EACH ROW
    EXECUTE FUNCTION check_x_account_unique();

-- Grant permissions
GRANT ALL ON public.x_users TO anon;
GRANT ALL ON public.x_users TO service_role;
GRANT USAGE ON SEQUENCE public.x_users_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.x_users_id_seq TO service_role;

-- Comments
COMMENT ON TABLE public.x_users IS 'X (Twitter) user connections to wallet addresses';
COMMENT ON COLUMN public.x_users.x_user_id IS 'X API user ID (unique across X)';
COMMENT ON COLUMN public.x_users.access_token IS 'OAuth 2.0 access token for X API';
COMMENT ON COLUMN public.x_users.refresh_token IS 'OAuth 2.0 refresh token for X API';
COMMENT ON COLUMN public.x_users.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.x_users.is_active IS 'Whether this connection is currently active'; 