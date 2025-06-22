-- Users table for wallet addresses (simplified)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Ethereum addresses are 42 characters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table for user cards
CREATE TABLE IF NOT EXISTS cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_number VARCHAR(16) NOT NULL UNIQUE, -- 16-digit card number
    cvv VARCHAR(3) NOT NULL, -- 3-digit CVV
    expiration_date DATE NOT NULL, -- Expiration date
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('bronze', 'silver', 'gold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
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

-- Create policies for cards table
-- Allow anyone to insert cards
CREATE POLICY "Anyone can add cards" ON cards
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read cards
CREATE POLICY "Anyone can read cards" ON cards
    FOR SELECT USING (true);

-- Only authenticated users can update cards
CREATE POLICY "Authenticated users can update cards" ON cards
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete cards
CREATE POLICY "Authenticated users can delete cards" ON cards
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to generate random 16-digit card number
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS VARCHAR(16) AS $$
DECLARE
    card_num VARCHAR(16);
    exists_check INT;
BEGIN
    LOOP
        -- Generate 16-digit number starting with 4 (like Visa)
        card_num := '4' || LPAD(FLOOR(RANDOM() * 1000000000000000)::TEXT, 15, '0');
        
        -- Check if this number already exists
        SELECT COUNT(*) INTO exists_check FROM cards WHERE card_number = card_num;
        
        -- If unique, exit loop
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN card_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate random 3-digit CVV
CREATE OR REPLACE FUNCTION generate_cvv()
RETURNS VARCHAR(3) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expiration date (2 years from user creation + card offset)
CREATE OR REPLACE FUNCTION calculate_expiration_date(user_created_at TIMESTAMP, card_offset INTEGER)
RETURNS DATE AS $$
BEGIN
    -- Bronze: +2 years, Silver: +3 years, Gold: +4 years from user creation
    RETURN (user_created_at + INTERVAL '2 years' + (card_offset || ' years')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to create 3 cards for a user
CREATE OR REPLACE FUNCTION create_user_cards(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    user_created_at TIMESTAMP;
    card_types TEXT[] := ARRAY['bronze', 'silver', 'gold'];
    card_offsets INTEGER[] := ARRAY[0, 1, 2]; -- Additional years for each card type
    i INTEGER;
BEGIN
    -- Get user creation date
    SELECT created_at INTO user_created_at FROM users WHERE id = p_user_id;
    
    -- Create 3 cards
    FOR i IN 1..3 LOOP
        INSERT INTO cards (user_id, card_number, cvv, expiration_date, card_type)
        VALUES (
            p_user_id,
            generate_card_number(),
            generate_cvv(),
            calculate_expiration_date(user_created_at, card_offsets[i]),
            card_types[i]
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically create cards when user is inserted
CREATE OR REPLACE FUNCTION trigger_create_user_cards()
RETURNS TRIGGER AS $$
BEGIN
    -- Create cards for the new user
    PERFORM create_user_cards(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create cards when user is inserted
DROP TRIGGER IF EXISTS auto_create_cards ON users;
CREATE TRIGGER auto_create_cards
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_user_cards(); 