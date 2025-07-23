-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.airdrop (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ethereum_address character varying NOT NULL UNIQUE,
  xp_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT airdrop_pkey PRIMARY KEY (id)
);
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
CREATE TABLE public.claim_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  amount_claimed character varying NOT NULL,
  status character varying DEFAULT 'completed'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT claim_history_pkey PRIMARY KEY (id),
  CONSTRAINT claim_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.dailytasks (
  id integer NOT NULL DEFAULT nextval('dailytasks_id_seq'::regclass),
  title text NOT NULL,
  link text NOT NULL,
  reward integer NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT dailytasks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discord_activities (
  id bigint NOT NULL DEFAULT nextval('discord_activities_id_seq'::regclass),
  discord_id character varying NOT NULL UNIQUE,
  message_count integer DEFAULT 0,
  daily_active_days integer DEFAULT 0,
  weekly_streak integer DEFAULT 0,
  total_reactions integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  guild_count integer DEFAULT 0,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invite_count integer DEFAULT 0,
  CONSTRAINT discord_activities_pkey PRIMARY KEY (id),
  CONSTRAINT discord_activities_discord_id_fkey FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id)
);
CREATE TABLE public.discord_daily_claims (
  id bigint NOT NULL DEFAULT nextval('discord_daily_claims_id_seq'::regclass),
  discord_id character varying NOT NULL,
  wallet_address character varying NOT NULL,
  reward_amount integer NOT NULL,
  claimed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_daily_claims_pkey PRIMARY KEY (id),
  CONSTRAINT discord_daily_claims_wallet_address_fkey FOREIGN KEY (wallet_address) REFERENCES public.users(wallet_address),
  CONSTRAINT discord_daily_claims_discord_id_fkey FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id)
);
CREATE TABLE public.discord_invited_users (
  id bigint NOT NULL DEFAULT nextval('discord_invited_users_id_seq'::regclass),
  discord_id character varying NOT NULL UNIQUE,
  inviter_discord_id character varying NOT NULL,
  invite_code character varying NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  is_active boolean DEFAULT true,
  reward_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_invited_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discord_oauth_sessions (
  id bigint NOT NULL DEFAULT nextval('discord_oauth_sessions_id_seq'::regclass),
  session_id character varying NOT NULL UNIQUE,
  state character varying NOT NULL,
  wallet_address character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_oauth_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discord_users (
  id bigint NOT NULL DEFAULT nextval('discord_users_id_seq'::regclass),
  user_id character varying NOT NULL,
  discord_id character varying NOT NULL UNIQUE,
  username character varying NOT NULL,
  discriminator character varying NOT NULL,
  avatar_url text,
  email character varying,
  verified boolean DEFAULT false,
  locale character varying,
  mfa_enabled boolean DEFAULT false,
  premium_type integer DEFAULT 0,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  connected_at timestamp with time zone DEFAULT now(),
  disconnected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_in_guild boolean DEFAULT false,
  invite_link character varying,
  CONSTRAINT discord_users_pkey PRIMARY KEY (id),
  CONSTRAINT discord_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(wallet_address)
);
CREATE TABLE public.extra_rewards (
  id integer NOT NULL DEFAULT nextval('extra_rewards_id_seq'::regclass),
  user_id integer,
  platform character varying NOT NULL,
  level_name character varying NOT NULL,
  xp_reward integer NOT NULL,
  claimed boolean DEFAULT false,
  claimed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT extra_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT extra_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.invite_rewards (
  id integer NOT NULL DEFAULT nextval('invite_rewards_id_seq'::regclass),
  user_id integer NOT NULL,
  milestone_count integer NOT NULL,
  points_awarded integer NOT NULL,
  claimed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invite_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT invite_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id)
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
CREATE TABLE public.staking_tasks (
  id integer NOT NULL DEFAULT nextval('staking_tasks_id_seq'::regclass),
  wallet_address character varying NOT NULL,
  stake_amount integer NOT NULL,
  points integer NOT NULL,
  claimed boolean DEFAULT false,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staking_tasks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL UNIQUE,
  message_count integer DEFAULT 0,
  daily_active_days integer DEFAULT 0,
  weekly_streak integer DEFAULT 0,
  total_reactions integer DEFAULT 0,
  helpful_messages integer DEFAULT 0,
  rule_violations integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  last_activity timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  referral_count integer DEFAULT 0,
  CONSTRAINT telegram_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL,
  message_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  message_text text,
  message_type character varying DEFAULT 'text'::character varying,
  has_reactions boolean DEFAULT false,
  reaction_count integer DEFAULT 0,
  is_helpful boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_referral_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL,
  invite_link text NOT NULL,
  referral_code character varying NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  max_usage integer DEFAULT 1,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_referral_links_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_referral_tracking (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL UNIQUE,
  referrer_id bigint NOT NULL,
  referral_code character varying NOT NULL,
  xp_rewarded integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_referral_tracking_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_rewards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL,
  reward_type character varying NOT NULL CHECK (reward_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'level_up'::character varying, 'referral'::character varying]::text[])),
  bblp_amount character varying NOT NULL,
  xp_earned integer DEFAULT 0,
  claimed boolean DEFAULT false,
  transaction_hash character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.telegram_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL UNIQUE,
  telegram_id bigint NOT NULL UNIQUE,
  username character varying,
  first_name character varying,
  last_name character varying,
  photo_url text,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_users_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_dailytask_claims (
  id integer NOT NULL DEFAULT nextval('user_dailytask_claims_id_seq'::regclass),
  user_id text NOT NULL,
  task_id integer NOT NULL,
  reward integer NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  claimed_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_dailytask_claims_pkey PRIMARY KEY (id),
  CONSTRAINT user_dailytask_claims_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.dailytasks(id)
);
CREATE TABLE public.users (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  wallet_address character varying NOT NULL UNIQUE,
  referred_by bigint,
  referral_code_used character varying,
  created_at timestamp with time zone DEFAULT now(),
  password_hash character varying,
  updated_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id)
);
CREATE TABLE public.x_oauth_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id character varying NOT NULL UNIQUE,
  code_verifier character varying NOT NULL,
  state character varying NOT NULL,
  wallet_address character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval),
  used boolean DEFAULT false,
  CONSTRAINT x_oauth_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.x_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint,
  wallet_address character varying NOT NULL,
  x_user_id character varying NOT NULL UNIQUE,
  x_username character varying NOT NULL,
  x_name character varying,
  x_profile_image_url text,
  x_verified boolean DEFAULT false,
  x_followers_count integer DEFAULT 0,
  x_following_count integer DEFAULT 0,
  x_tweet_count integer DEFAULT 0,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  disconnected_at timestamp with time zone,
  verified_at timestamp with time zone,
  verification_method text DEFAULT 'oauth'::text,
  CONSTRAINT x_users_pkey PRIMARY KEY (id),
  CONSTRAINT x_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);