-- ====================================
-- DATABASE MIGRATION SCRIPT
-- Run this in your Supabase SQL editor
-- ====================================

-- Step 1: Drop existing policies and constraints that might interfere
DROP POLICY IF EXISTS "Anyone can add wallet" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON users;

-- Step 2: Remove unnecessary columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS chain_id;
ALTER TABLE users DROP COLUMN IF EXISTS network_name;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

-- Step 3: Drop unnecessary indexes
DROP INDEX IF EXISTS idx_users_chain_id;

-- Step 4: Drop the updated_at trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Step 5: Create cards table if it doesn't exist
CREATE TABLE IF NOT EXISTS cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_number VARCHAR(16) NOT NULL UNIQUE,
    cvv VARCHAR(3) NOT NULL,
    expiration_date DATE NOT NULL,
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('bronze', 'silver', 'gold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for cards table
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON cards(card_number);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);

-- Step 7: Enable RLS for cards table
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing card policies first, then recreate them
DROP POLICY IF EXISTS "Anyone can add cards" ON cards;
DROP POLICY IF EXISTS "Anyone can read cards" ON cards;
DROP POLICY IF EXISTS "Authenticated users can update cards" ON cards;
DROP POLICY IF EXISTS "Authenticated users can delete cards" ON cards;

-- Step 9: Recreate policies for users table
CREATE POLICY "Anyone can add wallet" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update users" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete users" ON users
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 10: Create policies for cards table
CREATE POLICY "Anyone can add cards" ON cards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read cards" ON cards
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update cards" ON cards
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cards" ON cards
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 11: Drop existing triggers and functions in correct order
-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS auto_create_cards ON users;

-- Then drop the functions
DROP FUNCTION IF EXISTS trigger_create_user_cards();
DROP FUNCTION IF EXISTS create_user_cards(BIGINT);
DROP FUNCTION IF EXISTS calculate_expiration_date(TIMESTAMP, INTEGER);
DROP FUNCTION IF EXISTS generate_cvv();
DROP FUNCTION IF EXISTS generate_card_number();

-- Step 12: Create helper functions
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

CREATE OR REPLACE FUNCTION generate_cvv()
RETURNS VARCHAR(3) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_expiration_date(user_created_at TIMESTAMP, card_offset INTEGER)
RETURNS DATE AS $$
BEGIN
    -- Bronze: +2 years, Silver: +3 years, Gold: +4 years from user creation
    RETURN (user_created_at + INTERVAL '2 years' + (card_offset || ' years')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Function to create 3 cards for a user
CREATE OR REPLACE FUNCTION create_user_cards(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    user_created_at TIMESTAMP;
    card_types TEXT[] := ARRAY['bronze', 'silver', 'gold'];
    card_offsets INTEGER[] := ARRAY[0, 1, 2];
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

-- Step 14: Trigger function to automatically create cards when user is inserted
CREATE OR REPLACE FUNCTION trigger_create_user_cards()
RETURNS TRIGGER AS $$
BEGIN
    -- Create cards for the new user
    PERFORM create_user_cards(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create trigger to auto-create cards when user is inserted
CREATE TRIGGER auto_create_cards
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_user_cards();

-- Step 16: Create cards for existing users who don't have cards yet
DO $$
DECLARE
    user_record RECORD;
    card_count INTEGER;
    user_created_at TIMESTAMP;
BEGIN
    FOR user_record IN SELECT id, created_at FROM users LOOP
        -- Check if user already has cards
        SELECT COUNT(*) INTO card_count FROM cards WHERE user_id = user_record.id;
        
        -- If user has no cards, create them
        IF card_count = 0 THEN
            PERFORM create_user_cards(user_record.id);
            RAISE NOTICE 'Created cards for user ID: %', user_record.id;
        END IF;
    END LOOP;
END $$;

-- Step 17: Verify the migration
DO $$
DECLARE
    user_count INTEGER;
    card_count INTEGER;
    users_without_cards INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO card_count FROM cards;
    
    SELECT COUNT(*) INTO users_without_cards 
    FROM users u 
    LEFT JOIN cards c ON u.id = c.user_id 
    WHERE c.user_id IS NULL;
    
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Total cards: %', card_count;
    RAISE NOTICE 'Users without cards: %', users_without_cards;
    RAISE NOTICE 'Expected cards per user: 3';
    
    IF users_without_cards > 0 THEN
        RAISE WARNING 'Some users still don''t have cards. Please check the data manually.';
    ELSE
        RAISE NOTICE 'All users have cards! Migration successful.';
    END IF;
END $$; 