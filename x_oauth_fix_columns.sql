-- Fix X OAuth table columns to allow NULL values
-- Run this to fix the NOT NULL constraint issues

-- Alter x_users table to allow NULL values for OAuth tokens
ALTER TABLE x_users 
ALTER COLUMN access_token DROP NOT NULL,
ALTER COLUMN refresh_token DROP NOT NULL,
ALTER COLUMN token_expires_at DROP NOT NULL;

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'x_users' 
AND column_name IN ('access_token', 'refresh_token', 'token_expires_at'); 