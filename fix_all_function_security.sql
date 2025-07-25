-- 1. Önce grok_task_winners için trigger'ı drop et, sonra fonksiyonu güncelle
DROP TRIGGER IF EXISTS update_grok_task_winners_updated_at ON public.grok_task_winners;

-- Grok fonksiyonunu güvenli şekilde yeniden oluştur
CREATE OR REPLACE FUNCTION update_grok_task_winners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER update_grok_task_winners_updated_at
  BEFORE UPDATE ON public.grok_task_winners
  FOR EACH ROW
  EXECUTE FUNCTION update_grok_task_winners_updated_at();

-- 2. calculate_expiration_date fonksiyonunu da güvenli hale getir
CREATE OR REPLACE FUNCTION calculate_expiration_date()
RETURNS date AS $$
BEGIN
  -- 5 yıl sonrası expiration date döndür
  RETURN (CURRENT_DATE + INTERVAL '5 years')::date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public; 