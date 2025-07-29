-- Whitelist Registration Table
CREATE TABLE IF NOT EXISTS whitelist_registrations (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    email TEXT NOT NULL,
    network_preference TEXT NOT NULL CHECK (network_preference IN ('ETH', 'BNB')),
    wallet_balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whitelist_wallet_address ON whitelist_registrations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist_registrations(email);
CREATE INDEX IF NOT EXISTS idx_whitelist_network ON whitelist_registrations(network_preference);
CREATE INDEX IF NOT EXISTS idx_whitelist_registration_date ON whitelist_registrations(registration_date);

-- Unique constraint to prevent duplicate wallet+network combinations
CREATE UNIQUE INDEX IF NOT EXISTS idx_whitelist_wallet_network 
ON whitelist_registrations(wallet_address, network_preference) 
WHERE status = 'active';

-- RLS (Row Level Security) policies
ALTER TABLE whitelist_registrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own registrations
CREATE POLICY "Users can view their own whitelist registrations" ON whitelist_registrations
    FOR SELECT USING (true);

-- Policy to allow users to insert their own registrations
CREATE POLICY "Users can insert their own whitelist registrations" ON whitelist_registrations
    FOR INSERT WITH CHECK (true);

-- Policy to allow users to update their own registrations
CREATE POLICY "Users can update their own whitelist registrations" ON whitelist_registrations
    FOR UPDATE USING (true);

-- Function to check if user has both ETH and BNB registrations
CREATE OR REPLACE FUNCTION check_user_complete_registration(wallet_addr TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT network_preference) 
        FROM whitelist_registrations 
        WHERE wallet_address = wallet_addr 
        AND status = 'active'
    ) >= 2;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's registration status
CREATE OR REPLACE FUNCTION get_user_registration_status(wallet_addr TEXT)
RETURNS TABLE(
    has_eth BOOLEAN,
    has_bnb BOOLEAN,
    is_complete BOOLEAN,
    registration_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM whitelist_registrations WHERE wallet_address = wallet_addr AND network_preference = 'ETH' AND status = 'active') as has_eth,
        EXISTS(SELECT 1 FROM whitelist_registrations WHERE wallet_address = wallet_addr AND network_preference = 'BNB' AND status = 'active') as has_bnb,
        check_user_complete_registration(wallet_addr) as is_complete,
        (SELECT COUNT(*)::INTEGER FROM whitelist_registrations WHERE wallet_address = wallet_addr AND status = 'active') as registration_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE whitelist_registrations IS 'Stores Phase 3 whitelist registration data';
COMMENT ON COLUMN whitelist_registrations.wallet_address IS 'User wallet address (Ethereum format)';
COMMENT ON COLUMN whitelist_registrations.email IS 'User email for notifications';
COMMENT ON COLUMN whitelist_registrations.network_preference IS 'Selected network: ETH or BNB';
COMMENT ON COLUMN whitelist_registrations.wallet_balance IS 'User wallet balance at registration time';
COMMENT ON COLUMN whitelist_registrations.registration_date IS 'When user registered for whitelist';
COMMENT ON COLUMN whitelist_registrations.status IS 'Registration status: active or inactive'; 