-- Users table for wallet addresses (simplified)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Ethereum addresses are 42 characters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table for user cards (all 3 cards in one row)
CREATE TABLE IF NOT EXISTS cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_number_bronze VARCHAR(16) NOT NULL UNIQUE,
    card_number_silver VARCHAR(16) NOT NULL UNIQUE,
    card_number_gold VARCHAR(16) NOT NULL UNIQUE,
    cvv_bronze VARCHAR(3) NOT NULL,
    cvv_silver VARCHAR(3) NOT NULL,
    cvv_gold VARCHAR(3) NOT NULL,
    expiration_date_bronze DATE NOT NULL,
    expiration_date_silver DATE NOT NULL,
    expiration_date_gold DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_number_bronze ON cards(card_number_bronze);
CREATE INDEX IF NOT EXISTS idx_cards_card_number_silver ON cards(card_number_silver);
CREATE INDEX IF NOT EXISTS idx_cards_card_number_gold ON cards(card_number_gold);

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

-- Function to generate card number with masked format (************XXXX)
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS VARCHAR(16) AS $$
DECLARE
    card_num VARCHAR(16);
    last_four VARCHAR(4);
    exists_check INT;
BEGIN
    LOOP
        -- Generate unique 4-digit number for the last 4 digits
        last_four := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Create masked card number with 12 asterisks + 4 random digits
        card_num := '************' || last_four;
        
        -- Check if this card number already exists in any column
        SELECT COUNT(*) INTO exists_check FROM cards 
        WHERE card_number_bronze = card_num 
           OR card_number_silver = card_num 
           OR card_number_gold = card_num;
        
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
    -- All cards have same expiration date: +2 years from user creation
    RETURN (user_created_at + INTERVAL '2 years' + (card_offset || ' years')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to create all 3 cards for a user in one row
CREATE OR REPLACE FUNCTION create_user_cards(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    user_created_at TIMESTAMP;
BEGIN
    -- Get user creation date
    SELECT created_at INTO user_created_at FROM users WHERE id = p_user_id;
    
    -- Create single row with all 3 cards (same expiration date for all)
    INSERT INTO cards (
        user_id, 
        card_number_bronze, card_number_silver, card_number_gold,
        cvv_bronze, cvv_silver, cvv_gold,
        expiration_date_bronze, expiration_date_silver, expiration_date_gold
    )
    VALUES (
        p_user_id,
        generate_card_number(), generate_card_number(), generate_card_number(),
        generate_cvv(), generate_cvv(), generate_cvv(),
        calculate_expiration_date(user_created_at, 0),
        calculate_expiration_date(user_created_at, 0),
        calculate_expiration_date(user_created_at, 0)
    );
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