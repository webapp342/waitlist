-- Grok Task Winners RLS Policy Optimizasyonu
-- Performans uyarılarını düzeltir

-- 1. Mevcut policy'leri temizle
DROP POLICY IF EXISTS "Admin can manage grok task winners" ON public.grok_task_winners;
DROP POLICY IF EXISTS "Users can view their own grok task winner status" ON public.grok_task_winners;

-- 2. Optimize edilmiş tek policy oluştur
-- Hem admin hem de user erişimini tek policy'de birleştir
CREATE POLICY "optimized_grok_task_winners_access" ON public.grok_task_winners
FOR ALL USING (
  -- Admin: her şeye erişebilir (service_role)
  auth.role() = 'service_role'
  OR
  -- Authenticated users: sadece kendi x_username'lerini görebilir
  (
    auth.role() = 'authenticated' 
    AND x_username IN (
      SELECT x_username 
      FROM public.x_users 
      WHERE wallet_address = (SELECT auth.jwt() ->> 'sub')
    )
  )
);

-- 3. Alternatif: Eğer yukarıdaki yeterli değilse, daha basit approach
-- DROP POLICY IF EXISTS "optimized_grok_task_winners_access" ON public.grok_task_winners;

-- CREATE POLICY "grok_winners_select_policy" ON public.grok_task_winners
-- FOR SELECT USING (
--   -- Service role için her şey
--   auth.role() = 'service_role'
--   OR
--   -- Authenticated users için kendi kayıtları
--   x_username IN (
--     SELECT x_username 
--     FROM public.x_users 
--     WHERE wallet_address = (SELECT auth.jwt() ->> 'sub')
--   )
-- );

-- CREATE POLICY "grok_winners_admin_policy" ON public.grok_task_winners
-- FOR ALL USING (auth.role() = 'service_role'); 