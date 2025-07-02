-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cards (
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
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  total_referrals integer DEFAULT 0,
  total_rewards_earned character varying DEFAULT '0'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL,
  referrer_reward_amount character varying DEFAULT '0'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  referred_reward_amount character varying DEFAULT '5'::character varying,
  reward_tier character varying DEFAULT 'tier1'::character varying CHECK (reward_tier::text = ANY (ARRAY['tier1'::character varying, 'tier2'::character varying, 'tier3'::character varying, 'tier4'::character varying, 'tier5'::character varying]::text[])),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id),
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL,
  referral_code_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id)
);
CREATE TABLE public.stake_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  amount character varying NOT NULL,
  action_type character varying NOT NULL CHECK (action_type::text = ANY (ARRAY['stake'::character varying, 'unstake'::character varying, 'claim_rewards'::character varying, 'emergency_withdraw'::character varying]::text[])),
  block_number bigint,
  gas_used bigint,
  gas_price character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'failed'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stake_logs_pkey PRIMARY KEY (id),
  CONSTRAINT stake_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  wallet_address character varying NOT NULL UNIQUE,
  password_hash character varying NULL,
  referred_by bigint,
  referral_code_used character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id)
);