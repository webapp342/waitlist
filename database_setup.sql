-- Supabase Database Setup
-- Run this in Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.cards_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  wallet_address character varying NOT NULL UNIQUE,
  referred_by bigint,
  referral_code_used character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Add self-referencing foreign key after table creation
ALTER TABLE public.users 
ADD CONSTRAINT users_referred_by_fkey 
FOREIGN KEY (referred_by) REFERENCES public.users(id);

-- Create cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id bigint NOT NULL DEFAULT nextval('cards_id_seq'::regclass),
  user_id bigint NOT NULL,
  card_number_bronze character varying NOT NULL UNIQUE,
  card_number_silver character varying NOT NULL UNIQUE,
  card_number_gold character varying NOT NULL UNIQUE,
  cvv_bronze character varying NOT NULL,
  cvv_silver character varying NOT NULL,
  cvv_gold character varying NOT NULL,
  expiration_date_bronze date NOT NULL,
  expiration_date_silver date NOT NULL,
  expiration_date_gold date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create stake_logs table
CREATE TABLE IF NOT EXISTS public.stake_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  amount character varying NOT NULL,
  action_type character varying NOT NULL CHECK (action_type IN ('stake', 'unstake', 'claim_rewards', 'emergency_withdraw')),
  block_number bigint,
  gas_used bigint,
  gas_price character varying,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stake_logs_pkey PRIMARY KEY (id),
  CONSTRAINT stake_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create claim_history table
CREATE TABLE IF NOT EXISTS public.claim_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  amount_claimed character varying NOT NULL,
  status character varying DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT claim_history_pkey PRIMARY KEY (id),
  CONSTRAINT claim_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  total_referrals integer DEFAULT 0,
  total_rewards_earned character varying DEFAULT '0',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id)
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL UNIQUE,
  referral_code_id uuid NOT NULL,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_amount character varying DEFAULT '0',
  reward_paid boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id)
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL,
  reward_amount character varying DEFAULT '0',
  referrer_reward_amount character varying DEFAULT '10',
  referred_reward_amount character varying DEFAULT '5',
  reward_tier character varying DEFAULT 'tier1' CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id)
);

-- Add columns to existing table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referrer_reward_amount') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN referrer_reward_amount character varying DEFAULT '10';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referred_reward_amount') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN referred_reward_amount character varying DEFAULT '5';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'reward_tier') THEN
    ALTER TABLE public.referral_rewards ADD COLUMN reward_tier character varying DEFAULT 'tier1' CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5'));
  END IF;
  
  -- Remove UNIQUE constraint from referred_id to allow multiple rewards per user
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_rewards_referred_id_key' AND table_name = 'referral_rewards') THEN
    ALTER TABLE public.referral_rewards DROP CONSTRAINT referral_rewards_referred_id_key;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_stake_logs_user_id ON public.stake_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_stake_logs_transaction_hash ON public.stake_logs(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_id ON public.referral_rewards(referred_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stake_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - you may want to customize these)
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own data" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Cards are viewable by everyone" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Cards can be inserted by authenticated users" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Cards can be updated by authenticated users" ON public.cards FOR UPDATE USING (true);

CREATE POLICY "Stake logs are viewable by everyone" ON public.stake_logs FOR SELECT USING (true);
CREATE POLICY "Stake logs can be inserted by authenticated users" ON public.stake_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Stake logs can be updated by authenticated users" ON public.stake_logs FOR UPDATE USING (true);

CREATE POLICY "Referral codes are viewable by everyone" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Referral codes can be inserted by authenticated users" ON public.referral_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Referral codes can be updated by authenticated users" ON public.referral_codes FOR UPDATE USING (true);

CREATE POLICY "Referrals are viewable by everyone" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Referrals can be inserted by authenticated users" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Referrals can be updated by authenticated users" ON public.referrals FOR UPDATE USING (true);

CREATE POLICY "Referral rewards are viewable by everyone" ON public.referral_rewards FOR SELECT USING (true);
CREATE POLICY "Referral rewards can be inserted by authenticated users" ON public.referral_rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Referral rewards can be updated by authenticated users" ON public.referral_rewards FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to generate card numbers
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

-- Create function to generate CVV
CREATE OR REPLACE FUNCTION generate_cvv() RETURNS VARCHAR AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to create user cards
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

-- Create trigger to automatically create cards when a user is created
DROP TRIGGER IF EXISTS trigger_create_user_cards ON public.users;
CREATE TRIGGER trigger_create_user_cards
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_cards();

-- Create cards for existing users who don't have cards yet
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

-- Create function to check stake amount and award referral reward with tier system
CREATE OR REPLACE FUNCTION check_stake_and_award_referral_reward(p_referred_id bigint) RETURNS void AS $$
DECLARE
  v_referrer_id bigint;
  v_tier1_reward_exists boolean;
  v_tier2_reward_exists boolean;
  v_running_balance numeric := 0;
  v_max_balance numeric := 0;
  v_stake_record RECORD;
BEGIN
  -- Check if Tier 1 and Tier 2 rewards already exist for this referred user
  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier1'
  ) INTO v_tier1_reward_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM public.referral_rewards 
    WHERE referred_id = p_referred_id AND reward_tier = 'tier2'
  ) INTO v_tier2_reward_exists;

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

-- Create wrapper function for trigger to avoid parameter passing issue
CREATE OR REPLACE FUNCTION trigger_check_stake_and_award_referral_reward() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_stake_and_award_referral_reward(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_check_referral_reward ON public.stake_logs;

-- Create trigger to check referral reward after stake/unstake log insert or update
CREATE TRIGGER trigger_check_referral_reward_insert
  AFTER INSERT ON public.stake_logs
  FOR EACH ROW
  WHEN (NEW.action_type IN ('stake', 'unstake') AND NEW.status = 'confirmed')
  EXECUTE FUNCTION trigger_check_stake_and_award_referral_reward();

-- Create trigger for UPDATE operations
CREATE TRIGGER trigger_check_referral_reward_update
  AFTER UPDATE ON public.stake_logs
  FOR EACH ROW
  WHEN (NEW.action_type IN ('stake', 'unstake') AND NEW.status = 'confirmed' AND OLD.status = 'pending')
  EXECUTE FUNCTION trigger_check_stake_and_award_referral_reward(); 