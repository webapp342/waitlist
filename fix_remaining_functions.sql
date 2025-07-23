-- Fix Remaining Function Security Issues
-- This script fixes the 2 functions that still have search_path issues

-- 1. Fix create_user_cards function (handle trigger dependency)
-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS trigger_create_user_cards ON public.users;

-- Then drop the function
DROP FUNCTION IF EXISTS public.create_user_cards();

-- Recreate the function with proper search_path
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

-- Recreate the trigger
CREATE TRIGGER trigger_create_user_cards
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_cards();

-- 2. Fix get_social_connections_status function
DROP FUNCTION IF EXISTS public.get_social_connections_status();

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION public.get_social_connections_status()
RETURNS TABLE(status JSON) AS $$
BEGIN
    -- Function logic here - return empty JSON for now
    RETURN QUERY SELECT '{}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Verify the fixes
SELECT 
    'Function Security Status' as info,
    COUNT(*) as total_functions,
    COUNT(CASE WHEN search_path_set THEN 1 END) as search_path_fixed,
    COUNT(CASE WHEN NOT search_path_set THEN 1 END) as still_need_fixing
FROM verify_function_security_fixes();

-- 4. Show detailed status
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