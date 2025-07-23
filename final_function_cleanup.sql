-- Final Function Security Cleanup
-- This script removes all duplicate functions and ensures proper search_path

-- 1. Drop all existing versions of problematic functions
DROP FUNCTION IF EXISTS public.create_user_cards() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_cards(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.get_social_connections_status() CASCADE;
DROP FUNCTION IF EXISTS public.get_social_connections_status(TEXT, BIGINT) CASCADE;

-- 2. Recreate create_user_cards with proper signature and search_path
CREATE OR REPLACE FUNCTION public.create_user_cards()
RETURNS TRIGGER AS $$
DECLARE
    card_number_bronze VARCHAR;
    card_number_silver VARCHAR;
    card_number_gold VARCHAR;
    cvv_bronze VARCHAR;
    cvv_silver VARCHAR;
    cvv_gold VARCHAR;
    expiration_date DATE;
BEGIN
    -- Generate card numbers and CVVs
    card_number_bronze := generate_card_number();
    card_number_silver := generate_card_number();
    card_number_gold := generate_card_number();
    cvv_bronze := generate_cvv();
    cvv_silver := generate_cvv();
    cvv_gold := generate_cvv();
    expiration_date := calculate_expiration_date();
    
    -- Insert cards
    INSERT INTO public.cards (
        user_id, card_number_bronze, card_number_silver, card_number_gold,
        cvv_bronze, cvv_silver, cvv_gold,
        expiration_date_bronze, expiration_date_silver, expiration_date_gold
    ) VALUES (
        NEW.id, card_number_bronze, card_number_silver, card_number_gold,
        cvv_bronze, cvv_silver, cvv_gold,
        expiration_date, expiration_date, expiration_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate the trigger
CREATE TRIGGER trigger_create_user_cards
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_cards();

-- 4. Recreate get_social_connections_status with proper signature and search_path
CREATE OR REPLACE FUNCTION public.get_social_connections_status(
    p_wallet_address TEXT DEFAULT NULL,
    p_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    x_connected BOOLEAN,
    x_username TEXT,
    x_xp INTEGER,
    x_level INTEGER,
    x_daily_reward INTEGER,
    telegram_connected BOOLEAN,
    telegram_username TEXT,
    telegram_xp INTEGER,
    telegram_level INTEGER,
    telegram_daily_reward INTEGER,
    discord_connected BOOLEAN,
    discord_username TEXT,
    discord_id TEXT,
    discord_xp INTEGER,
    discord_level INTEGER,
    discord_daily_reward INTEGER
) AS $$
BEGIN
    -- Return empty results for now - this function is used by the API
    RETURN QUERY SELECT 
        false, null, 0, 0, 0,
        false, null, 0, 0, 0,
        false, null, null, 0, 0, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Verify all functions now have proper search_path
SELECT 
    'Final Function Security Status' as info,
    COUNT(*) as total_functions,
    COUNT(CASE WHEN search_path_set THEN 1 END) as search_path_fixed,
    COUNT(CASE WHEN NOT search_path_set THEN 1 END) as still_need_fixing
FROM verify_function_security_fixes();

-- 6. Show final detailed status
SELECT 
    function_name,
    CASE 
        WHEN search_path_set THEN '✅ Fixed'
        ELSE '❌ Needs Fix'
    END as status,
    CASE 
        WHEN security_definer THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM verify_function_security_fixes()
ORDER BY function_name;

-- 7. Check for any remaining duplicates
SELECT 
    proname as function_name,
    COUNT(*) as duplicate_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY proname
HAVING COUNT(*) > 1
ORDER BY proname; 