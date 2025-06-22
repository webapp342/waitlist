-- Users table for wallet addresses
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Ethereum addresses are 42 characters
    chain_id INTEGER,
    network_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_chain_id ON users(chain_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow anyone to insert (add wallet)
CREATE POLICY "Anyone can add wallet" ON users
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read (for checking if wallet exists)
CREATE POLICY "Anyone can read users" ON users
    FOR SELECT USING (true);

-- Only authenticated users can update (if you add admin features later)
CREATE POLICY "Authenticated users can update users" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete (if you add admin features later)
CREATE POLICY "Authenticated users can delete users" ON users
    FOR DELETE USING (auth.role() = 'authenticated'); 