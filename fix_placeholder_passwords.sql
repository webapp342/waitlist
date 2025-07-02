-- Fix placeholder password values in users table
-- Set placeholder values to NULL so the system can properly detect unset passwords

UPDATE public.users 
SET password_hash = NULL 
WHERE password_hash IN (
  'CHANGE_PASSWORD_REQUIRED',
  'NULL', 
  'null',
  'undefined',
  'PLACEHOLDER',
  ''
) OR password_hash IS NOT NULL AND password_hash !~ '^\$2[aby]\$\d+\$';

-- Add comment for clarity
COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hashed password. NULL means password not set yet.';

-- Verify the update
SELECT 
  COUNT(*) as total_users,
  COUNT(password_hash) as users_with_password,
  COUNT(*) - COUNT(password_hash) as users_without_password
FROM public.users; 