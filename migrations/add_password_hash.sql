-- Add password_hash column to users table (nullable for existing users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash character varying NULL;

-- Remove NOT NULL constraint if it exists
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Create index for faster password lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_password 
ON public.users(wallet_address, password_hash); 