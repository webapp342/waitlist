-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_user_cards ON public.users;
DROP FUNCTION IF EXISTS create_user_cards();

-- Create updated function to create user cards
CREATE OR REPLACE FUNCTION create_user_cards() RETURNS TRIGGER AS $$
DECLARE
    bronze_expiry DATE;
    silver_expiry DATE;
    gold_expiry DATE;
BEGIN
    -- Calculate expiration dates
    bronze_expiry := CURRENT_DATE + INTERVAL '2 years';
    silver_expiry := CURRENT_DATE + INTERVAL '3 years';
    gold_expiry := CURRENT_DATE + INTERVAL '4 years';
    
    -- Insert cards for the new user
    INSERT INTO public.cards (
        user_id,
        card_number_bronze,
        card_number_silver,
        card_number_gold,
        cvv_bronze,
        cvv_silver,
        cvv_gold,
        expiration_date_bronze,
        expiration_date_silver,
        expiration_date_gold
    ) VALUES (
        NEW.id,
        generate_card_number(),
        generate_card_number(),
        generate_card_number(),
        generate_cvv(),
        generate_cvv(),
        generate_cvv(),
        bronze_expiry,
        silver_expiry,
        gold_expiry
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger to automatically create cards when a user is created
CREATE TRIGGER trigger_create_user_cards
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_cards();

-- Regenerate cards for any users who don't have them
INSERT INTO public.cards (
    user_id,
    card_number_bronze,
    card_number_silver,
    card_number_gold,
    cvv_bronze,
    cvv_silver,
    cvv_gold,
    expiration_date_bronze,
    expiration_date_silver,
    expiration_date_gold
)
SELECT 
    u.id,
    generate_card_number(),
    generate_card_number(),
    generate_card_number(),
    generate_cvv(),
    generate_cvv(),
    generate_cvv(),
    CURRENT_DATE + INTERVAL '2 years',
    CURRENT_DATE + INTERVAL '3 years',
    CURRENT_DATE + INTERVAL '4 years'
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.user_id = u.id
); 