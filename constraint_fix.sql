-- Fix for referral_rewards_reward_tier_check constraint
-- This script fixes the check constraint to support all 5 tiers

-- First, drop the existing constraint that's causing the issue
ALTER TABLE public.referral_rewards 
DROP CONSTRAINT IF EXISTS referral_rewards_reward_tier_check;

-- Add the updated constraint that supports all 5 tiers
ALTER TABLE public.referral_rewards 
ADD CONSTRAINT referral_rewards_reward_tier_check 
CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5'));

-- Create updated card number generation function
CREATE OR REPLACE FUNCTION generate_card_number() RETURNS VARCHAR AS $$
DECLARE
    card_number VARCHAR(16);
    is_unique BOOLEAN := FALSE;
    prefix VARCHAR(6);
    account_number VARCHAR(9);
    check_digit VARCHAR(1);
BEGIN
    WHILE NOT is_unique LOOP
        -- Generate a card number with proper structure:
        -- First 6 digits: IIN/BIN (Issuer Identification Number)
        -- Use a fixed prefix for each tier to make it look more realistic
        prefix := '422345'; -- Using a fake BIN that looks realistic
        
        -- Generate 9 digits for account number
        account_number := LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
        
        -- Generate check digit (Luhn algorithm would go here in production)
        check_digit := FLOOR(RANDOM() * 10)::TEXT;
        
        -- Combine all parts
        card_number := prefix || account_number || check_digit;
        
        -- Check if it's unique across all card number columns
        SELECT NOT EXISTS (
            SELECT 1 FROM public.cards 
            WHERE card_number_bronze = card_number 
               OR card_number_silver = card_number 
               OR card_number_gold = card_number
        ) INTO is_unique;
    END LOOP;
    
    RETURN card_number;
END;
$$ LANGUAGE plpgsql;

-- Regenerate card numbers for existing cards
DO $$
DECLARE
    card_record RECORD;
BEGIN
    FOR card_record IN SELECT id FROM public.cards LOOP
        UPDATE public.cards
        SET 
            card_number_bronze = generate_card_number(),
            card_number_silver = generate_card_number(),
            card_number_gold = generate_card_number()
        WHERE id = card_record.id;
    END LOOP;
END $$;

-- Verify the constraint was added correctly using pg_get_constraintdef
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'public.referral_rewards'::regclass 
AND conname = 'referral_rewards_reward_tier_check'; 