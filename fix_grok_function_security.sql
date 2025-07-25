-- Güvenlik uyarısını düzeltmek için fonksiyonu yeniden oluştur
DROP FUNCTION IF EXISTS update_grok_task_winners_updated_at();

-- Güvenli versiyonu oluştur
CREATE OR REPLACE FUNCTION update_grok_task_winners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public; 