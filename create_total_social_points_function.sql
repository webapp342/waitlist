-- Create Total Social Points Function
-- This function calculates total social points for a wallet address

CREATE OR REPLACE FUNCTION public.get_total_social_points(p_wallet_address TEXT)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER := 0;
    user_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM public.users WHERE wallet_address = p_wallet_address;
    
    IF user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- 1. X Tasks (user_dailytask_claims)
    SELECT COALESCE(SUM(reward), 0) INTO total_points
    FROM public.user_dailytask_claims
    WHERE user_id = p_wallet_address AND completed = true;
    
    -- 2. Telegram Daily Rewards
    SELECT total_points + COALESCE(SUM(CAST(bblp_amount AS INTEGER)), 0) INTO total_points
    FROM public.telegram_rewards
    WHERE user_id = user_id AND reward_type = 'daily' AND claimed = true;
    
    -- 3. Extra Rewards (XP)
    SELECT total_points + COALESCE(SUM(xp_reward), 0) INTO total_points
    FROM public.extra_rewards
    WHERE user_id = user_id AND claimed = true;
    
    -- 4. Invite Friends
    SELECT total_points + COALESCE(SUM(points_awarded), 0) INTO total_points
    FROM public.invite_rewards
    WHERE user_id = user_id;
    
    -- 5. Discord Daily Claims
    SELECT total_points + COALESCE(SUM(reward_amount), 0) INTO total_points
    FROM public.discord_daily_claims
    WHERE wallet_address = p_wallet_address;
    
    -- 6. Staking Tasks
    SELECT total_points + COALESCE(SUM(points), 0) INTO total_points
    FROM public.staking_tasks
    WHERE wallet_address = p_wallet_address AND claimed = true;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public; 