-- Tier-based Referral Reward System Update Script
-- This script updates the existing database to support the new tiered reward system

-- 1. Add new columns to referral_rewards table if they don't exist
DO $$ 
BEGIN
  -- Add referrer_reward_amount column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referrer_reward_amount') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN referrer_reward_amount character varying DEFAULT '10';
    UPDATE public.referral_rewards SET referrer_reward_amount = '10' WHERE referrer_reward_amount IS NULL;
  END IF;
  
  -- Add referred_reward_amount column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referred_reward_amount') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN referred_reward_amount character varying DEFAULT '5';
    UPDATE public.referral_rewards SET referred_reward_amount = '5' WHERE referred_reward_amount IS NULL;
  END IF;
  
  -- Add reward_tier column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'reward_tier') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN reward_tier character varying DEFAULT 'tier1' CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5'));
    UPDATE public.referral_rewards SET reward_tier = 'tier1' WHERE reward_tier IS NULL;
  END IF;
  
  -- Remove UNIQUE constraint from referred_id to allow multiple rewards per user
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_rewards_referred_id_key' AND table_name = 'referral_rewards') THEN
    ALTER TABLE public.referral_rewards DROP CONSTRAINT referral_rewards_referred_id_key;
  END IF;
  
  -- Update the check constraint to support all 5 tiers
  -- First drop the existing constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_rewards_reward_tier_check' AND table_name = 'referral_rewards') THEN
    ALTER TABLE public.referral_rewards DROP CONSTRAINT referral_rewards_reward_tier_check;
  END IF;
  
  -- Add the updated constraint that supports all 5 tiers
  ALTER TABLE public.referral_rewards 
  ADD CONSTRAINT referral_rewards_reward_tier_check 
  CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5'));
END $$;

-- 2. Update existing rewards to use the new columns
UPDATE public.referral_rewards 
SET 
  referrer_reward_amount = '10',
  referred_reward_amount = '5',
  reward_tier = 'tier1'
WHERE referrer_reward_amount IS NULL OR referred_reward_amount IS NULL OR reward_tier IS NULL;

-- 3. Create/Replace the updated trigger function
CREATE OR REPLACE FUNCTION check_stake_and_award_referral_reward(p_referred_id bigint) RETURNS void AS $$
DECLARE
  v_referrer_id bigint;
  v_tier1_reward_exists boolean;
  v_tier2_reward_exists boolean;
  v_tier3_reward_exists boolean;
  v_tier4_reward_exists boolean;
  v_tier5_reward_exists boolean;
  v_running_balance numeric := 0;
  v_max_balance numeric := 0;
  v_stake_record RECORD;
BEGIN
  -- Check if all tier rewards already exist for this referred user
  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier1'
  ) INTO v_tier1_reward_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier2'
  ) INTO v_tier2_reward_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier3'
  ) INTO v_tier3_reward_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier4'
  ) INTO v_tier4_reward_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier5'
  ) INTO v_tier5_reward_exists;

  -- Process all stake/unstake transactions in chronological order
  -- and track the maximum balance ever reached
  FOR v_stake_record IN (
    SELECT 
      amount::numeric as amount,
      action_type,
      created_at
    FROM public.stake_logs
    WHERE user_id = p_referred_id 
    AND status = 'confirmed'
    AND action_type IN ('stake', 'unstake')
    ORDER BY created_at ASC
  ) LOOP
    -- Update running balance
    IF v_stake_record.action_type = 'stake' THEN
      v_running_balance := v_running_balance + v_stake_record.amount;
    ELSE -- unstake
      v_running_balance := v_running_balance - v_stake_record.amount;
    END IF;
    
    -- Update maximum balance reached
    IF v_running_balance > v_max_balance THEN
      v_max_balance := v_running_balance;
    END IF;
  END LOOP;

  -- Get the referrer ID
  SELECT referred_by INTO v_referrer_id
  FROM public.users
  WHERE id = p_referred_id;

  IF v_referrer_id IS NOT NULL THEN
    -- Award Tier 5 reward if max balance >= 3500 and not already awarded
    IF v_max_balance >= 3500 AND NOT v_tier5_reward_exists THEN
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referrer_reward_amount,
        referred_reward_amount,
        reward_tier
      )
      VALUES (
        v_referrer_id, 
        p_referred_id, 
        '350',
        '175',
        'tier5'
      );
    END IF;

    -- Award Tier 4 reward if max balance >= 2500 and not already awarded
    IF v_max_balance >= 2500 AND NOT v_tier4_reward_exists THEN
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referrer_reward_amount,
        referred_reward_amount,
        reward_tier
      )
      VALUES (
        v_referrer_id, 
        p_referred_id, 
        '250',
        '125',
        'tier4'
      );
    END IF;

    -- Award Tier 3 reward if max balance >= 1000 and not already awarded
    IF v_max_balance >= 1000 AND NOT v_tier3_reward_exists THEN
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referrer_reward_amount,
        referred_reward_amount,
        reward_tier
      )
      VALUES (
        v_referrer_id, 
        p_referred_id, 
        '100',
        '50',
        'tier3'
      );
    END IF;
    
    -- Award Tier 2 reward if max balance >= 500 and not already awarded
    IF v_max_balance >= 500 AND NOT v_tier2_reward_exists THEN
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referrer_reward_amount,
        referred_reward_amount,
        reward_tier
      )
      VALUES (
        v_referrer_id, 
        p_referred_id, 
        '50',
        '25',
        'tier2'
      );
    END IF;
    
    -- Award Tier 1 reward if max balance >= 100 and not already awarded
    IF v_max_balance >= 100 AND NOT v_tier1_reward_exists THEN
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referrer_reward_amount,
        referred_reward_amount,
        reward_tier
      )
      VALUES (
        v_referrer_id, 
        p_referred_id, 
        '10',
        '5',
        'tier1'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Update triggers to include unstake operations
DROP TRIGGER IF EXISTS trigger_check_referral_reward_insert ON public.stake_logs;
DROP TRIGGER IF EXISTS trigger_check_referral_reward_update ON public.stake_logs;

-- Create new triggers for both stake and unstake operations
CREATE TRIGGER trigger_check_referral_reward_insert
  AFTER INSERT ON public.stake_logs
  FOR EACH ROW
  WHEN (NEW.action_type IN ('stake', 'unstake') AND NEW.status = 'confirmed')
  EXECUTE FUNCTION trigger_check_stake_and_award_referral_reward();

CREATE TRIGGER trigger_check_referral_reward_update
  AFTER UPDATE ON public.stake_logs
  FOR EACH ROW
  WHEN (NEW.action_type IN ('stake', 'unstake') AND NEW.status = 'confirmed' AND OLD.status = 'pending')
  EXECUTE FUNCTION trigger_check_stake_and_award_referral_reward();

-- 5. Create an index for better performance on reward_tier queries
CREATE INDEX IF NOT EXISTS idx_referral_rewards_tier ON public.referral_rewards(reward_tier);

-- 6. Update referral_codes stats for existing users (optional)
DO $$
DECLARE
  user_record RECORD;
  stats_record RECORD;
BEGIN
  FOR user_record IN (SELECT DISTINCT user_id FROM public.referral_codes) LOOP
    -- Calculate updated stats
    SELECT 
      COALESCE(COUNT(r.id), 0) as total_referrals,
      COALESCE(SUM(
        CASE 
          WHEN rr.referrer_id = user_record.user_id THEN COALESCE(rr.referrer_reward_amount::numeric, 0)
          WHEN rr.referred_id = user_record.user_id THEN COALESCE(rr.referred_reward_amount::numeric, 0)
          ELSE 0
        END
      ), 0) as total_rewards
    INTO stats_record
    FROM public.referrals r
    LEFT JOIN public.referral_rewards rr ON (rr.referrer_id = user_record.user_id OR rr.referred_id = user_record.user_id)
    WHERE r.referrer_id = user_record.user_id;
    
    -- Update referral_codes table
    UPDATE public.referral_codes 
    SET 
      total_referrals = COALESCE(stats_record.total_referrals, 0),
      total_rewards_earned = COALESCE(stats_record.total_rewards, 0)::varchar,
      updated_at = NOW()
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;

-- 7. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated; 