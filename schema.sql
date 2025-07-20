-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.airdrop (
  ethereum_address character varying NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  xp_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT airdrop_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cards (
  id bigint NOT NULL DEFAULT nextval('cards_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
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
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.claim_history (
  user_id bigint NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  amount_claimed character varying NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status character varying DEFAULT 'completed'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT claim_history_pkey PRIMARY KEY (id),
  CONSTRAINT claim_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.referral_codes (
  user_id bigint NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  total_referrals integer DEFAULT 0,
  total_rewards_earned character varying DEFAULT '0'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.referral_rewards (
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  referrer_reward_amount character varying DEFAULT '0'::character varying,
  referred_reward_amount character varying DEFAULT '5'::character varying,
  reward_tier character varying DEFAULT 'tier1'::character varying CHECK (reward_tier::text = ANY (ARRAY['tier1'::character varying, 'tier2'::character varying, 'tier3'::character varying, 'tier4'::character varying, 'tier5'::character varying]::text[])),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id),
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id)
);
CREATE TABLE public.referrals (
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL,
  referral_code_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id)
);
CREATE TABLE public.stake_logs (
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
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT stake_logs_pkey PRIMARY KEY (id),
  CONSTRAINT stake_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.telegram_activities (
  telegram_id bigint NOT NULL UNIQUE,
  last_activity timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_count integer DEFAULT 0,
  daily_active_days integer DEFAULT 0,
  weekly_streak integer DEFAULT 0,
  total_reactions integer DEFAULT 0,
  helpful_messages integer DEFAULT 0,
  rule_violations integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  referral_count integer DEFAULT 0,
  CONSTRAINT telegram_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_daily_activities (
  telegram_id bigint NOT NULL,
  activity_date date NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_count integer DEFAULT 0,
  reaction_count integer DEFAULT 0,
  helpful_message_count integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_daily_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_messages (
  telegram_id bigint NOT NULL,
  message_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  message_text text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_type character varying DEFAULT 'text'::character varying,
  has_reactions boolean DEFAULT false,
  reaction_count integer DEFAULT 0,
  is_helpful boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_referral_links (
  telegram_id bigint NOT NULL,
  invite_link text NOT NULL,
  referral_code character varying NOT NULL UNIQUE,
  expires_at timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  max_usage integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_referral_links_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_referrals (
  referrer_id bigint NOT NULL,
  referred_id bigint NOT NULL UNIQUE,
  referral_code character varying,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  xp_rewarded integer DEFAULT 0,
  bblp_rewarded integer DEFAULT 0,
  status character varying DEFAULT 'completed'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_referrals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_rewards (
  user_id bigint NOT NULL,
  reward_type character varying NOT NULL CHECK (reward_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'level_up'::character varying, 'referral'::character varying]::text[])),
  bblp_amount character varying NOT NULL,
  transaction_hash character varying,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  xp_earned integer DEFAULT 0,
  claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.telegram_users (
  user_id bigint NOT NULL UNIQUE,
  telegram_id bigint NOT NULL UNIQUE,
  username character varying,
  first_name character varying,
  last_name character varying,
  photo_url text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_users_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  updated_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  password_hash character varying,
  wallet_address character varying NOT NULL UNIQUE,
  referred_by bigint,
  referral_code_used character varying,
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id)
);