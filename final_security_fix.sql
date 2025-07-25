-- Final Security Fix - Her iki fonksiyon için

-- 1. Grok task winners trigger ve fonksiyon düzeltmesi
DROP TRIGGER IF EXISTS update_grok_task_winners_updated_at ON public.grok_task_winners;

CREATE OR REPLACE FUNCTION update_grok_task_winners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER update_grok_task_winners_updated_at
  BEFORE UPDATE ON public.grok_task_winners
  FOR EACH ROW
  EXECUTE FUNCTION update_grok_task_winners_updated_at();

-- 2. Calculate expiration date fonksiyonları düzeltmesi

-- İlk fonksiyon (basit - 3 yıl)
CREATE OR REPLACE FUNCTION calculate_expiration_date()
RETURNS date AS $$
BEGIN
    -- Kartlar için 3 yıl sonrasını döndür
    RETURN (CURRENT_DATE + INTERVAL '3 years')::date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- İkinci fonksiyon (parametre ile)
CREATE OR REPLACE FUNCTION calculate_expiration_date(user_created_at timestamp, card_offset text)
RETURNS date AS $$
BEGIN
    -- All cards have same expiration date: +2 years from user creation
    RETURN (user_created_at + INTERVAL '2 years' + (card_offset || ' years')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public; 