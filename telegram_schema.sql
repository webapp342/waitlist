-- Telegram Integration Database Schema
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- 1. Telegram kullanıcıları tablosu
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id bigint UNIQUE NOT NULL,
  username varchar(255),
  first_name varchar(255),
  last_name varchar(255),
  photo_url text,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: Bir kullanıcı sadece bir Telegram hesabı ile bağlanabilir
  CONSTRAINT unique_user_telegram UNIQUE (user_id)
);

-- 2. Telegram aktiviteleri tablosu
CREATE TABLE IF NOT EXISTS public.telegram_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Telegram ödülleri tablosu
CREATE TABLE IF NOT EXISTS public.telegram_rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type varchar(50) NOT NULL CHECK (reward_type IN ('daily', 'weekly', 'level_up')),
  bblp_amount varchar(255) NOT NULL,
  xp_earned integer DEFAULT 0,
  claimed boolean DEFAULT false,
  transaction_hash varchar(255),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Telegram mesaj logları tablosu (bot için)
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL,
  message_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  message_text text,
  message_type varchar(50) DEFAULT 'text',
  has_reactions boolean DEFAULT false,
  reaction_count integer DEFAULT 0,
  is_helpful boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: Aynı mesaj birden fazla kez kaydedilmesin
  CONSTRAINT unique_message UNIQUE (telegram_id, message_id, chat_id)
);

-- 5. Telegram günlük aktivite logları tablosu
CREATE TABLE IF NOT EXISTS public.telegram_daily_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id bigint NOT NULL,
  activity_date date NOT NULL,
  message_count integer DEFAULT 0,
  reaction_count integer DEFAULT 0,
  helpful_message_count integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: Her kullanıcı için günde sadece bir kayıt
  CONSTRAINT unique_daily_activity UNIQUE (telegram_id, activity_date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON public.telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_activities_telegram_id ON public.telegram_activities(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_rewards_user_id ON public.telegram_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_rewards_type_date ON public.telegram_rewards(reward_type, created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_telegram_id ON public.telegram_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON public.telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_daily_activities_telegram_id ON public.telegram_daily_activities(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_daily_activities_date ON public.telegram_daily_activities(activity_date);

-- Row Level Security (RLS) Policies
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_daily_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telegram_users
CREATE POLICY "Users can view their own telegram data" ON public.telegram_users
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users 
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "Users can insert their own telegram data" ON public.telegram_users
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users 
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for telegram_activities
CREATE POLICY "Users can view their own activity data" ON public.telegram_activities
  FOR SELECT USING (
    telegram_id IN (
      SELECT telegram_id FROM public.telegram_users tu
      JOIN public.users u ON tu.user_id = u.id
      WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for telegram_rewards
CREATE POLICY "Users can view their own rewards" ON public.telegram_rewards
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users 
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "Users can insert their own rewards" ON public.telegram_rewards
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users 
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_telegram_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_telegram_activity_updated_at
  BEFORE UPDATE ON public.telegram_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_activity_updated_at();

-- Function to calculate level based on XP
CREATE OR REPLACE FUNCTION calculate_telegram_level(total_xp integer)
RETURNS integer AS $$
BEGIN
  RETURN CASE
    WHEN total_xp >= 1001 THEN 5  -- Diamond
    WHEN total_xp >= 501 THEN 4   -- Platinum
    WHEN total_xp >= 251 THEN 3   -- Gold
    WHEN total_xp >= 101 THEN 2   -- Silver
    ELSE 1                        -- Bronze
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily reward amount based on level
CREATE OR REPLACE FUNCTION get_daily_reward_amount(level integer)
RETURNS integer AS $$
BEGIN
  RETURN CASE
    WHEN level = 5 THEN 20  -- Diamond
    WHEN level = 4 THEN 10  -- Platinum
    WHEN level = 3 THEN 5   -- Gold
    WHEN level = 2 THEN 3   -- Silver
    ELSE 1                  -- Bronze
  END;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.telegram_users IS 'Telegram kullanıcı bilgileri ve wallet eşleştirmeleri';
COMMENT ON TABLE public.telegram_activities IS 'Telegram aktivite istatistikleri ve XP bilgileri';
COMMENT ON TABLE public.telegram_rewards IS 'Telegram ödülleri ve claim geçmişi';
COMMENT ON TABLE public.telegram_messages IS 'Telegram mesaj logları (bot için)';
COMMENT ON TABLE public.telegram_daily_activities IS 'Günlük aktivite logları';

COMMENT ON COLUMN public.telegram_users.telegram_id IS 'Telegram kullanıcı ID''si';
COMMENT ON COLUMN public.telegram_users.user_id IS 'Wallet kullanıcı ID''si';
COMMENT ON COLUMN public.telegram_activities.total_xp IS 'Toplam XP puanı';
COMMENT ON COLUMN public.telegram_activities.current_level IS 'Mevcut seviye (1-5)';
COMMENT ON COLUMN public.telegram_rewards.reward_type IS 'Ödül tipi: daily, weekly, level_up';
COMMENT ON COLUMN public.telegram_rewards.bblp_amount IS 'BBLP ödül miktarı'; 