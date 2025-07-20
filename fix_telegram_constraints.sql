-- Telegram Constraint Düzeltmeleri
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- 1. Önce mevcut duplicate kayıtları temizle
-- Aynı telegram_id'ye sahip birden fazla kayıt varsa, en eski olanı tut
DELETE FROM telegram_users 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM telegram_users 
  GROUP BY telegram_id
);

-- Aynı user_id'ye sahip birden fazla kayıt varsa, en eski olanı tut
DELETE FROM telegram_users 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM telegram_users 
  GROUP BY user_id
);

-- 2. Constraint'leri yeniden oluştur
-- Önce mevcut constraint'leri kaldır
ALTER TABLE telegram_users DROP CONSTRAINT IF EXISTS unique_user_telegram;
ALTER TABLE telegram_users DROP CONSTRAINT IF EXISTS telegram_users_telegram_id_key;

-- Yeni constraint'leri ekle
ALTER TABLE telegram_users ADD CONSTRAINT unique_user_telegram UNIQUE (user_id);
ALTER TABLE telegram_users ADD CONSTRAINT unique_telegram_id UNIQUE (telegram_id);

-- 3. Index'leri yeniden oluştur
DROP INDEX IF EXISTS idx_telegram_users_user_id;
DROP INDEX IF EXISTS idx_telegram_users_telegram_id;

CREATE UNIQUE INDEX idx_telegram_users_user_id ON telegram_users(user_id);
CREATE UNIQUE INDEX idx_telegram_users_telegram_id ON telegram_users(telegram_id);

-- 4. Kontrol sorguları
-- Duplicate kayıt var mı kontrol et
SELECT 'Duplicate telegram_id' as check_type, telegram_id, COUNT(*) as count
FROM telegram_users 
GROUP BY telegram_id 
HAVING COUNT(*) > 1;

SELECT 'Duplicate user_id' as check_type, user_id, COUNT(*) as count
FROM telegram_users 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- 5. Mevcut kayıtları listele
SELECT 
  tu.id,
  tu.user_id,
  tu.telegram_id,
  tu.username,
  u.wallet_address,
  tu.created_at
FROM telegram_users tu
JOIN users u ON tu.user_id = u.id
ORDER BY tu.created_at DESC; 