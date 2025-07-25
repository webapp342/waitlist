-- Önce mevcut fonksiyonları kontrol et
SELECT 
  routine_name, 
  routine_definition,
  security_type
FROM information_schema.routines 
WHERE routine_name IN ('update_grok_task_winners_updated_at', 'calculate_expiration_date')
  AND routine_schema = 'public';

-- 1. Grok task winners için güvenlik düzeltmesi
-- Önce trigger'ı drop et
DROP TRIGGER IF EXISTS update_grok_task_winners_updated_at ON public.grok_task_winners;

-- Fonksiyonu güvenli şekilde yeniden oluştur  
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

-- 2. calculate_expiration_date için güvenlik düzeltmesi
-- Önce mevcut fonksiyon tanımını koru ama güvenli hale getir
-- (Bu fonksiyonun gerçek tanımı için yukarıdaki SELECT sonucuna bak)

-- Örnek düzeltme (gerçek tanıma göre ayarla):
-- CREATE OR REPLACE FUNCTION calculate_expiration_date()
-- RETURNS [dönüş tipi] AS $$
-- BEGIN
--   [mevcut fonksiyon içeriği]
-- END;
-- $$ LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public; 