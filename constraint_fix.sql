-- Fix for referral_rewards_reward_tier_check constraint
-- This script fixes the check constraint to support all 5 tiers

-- First, drop the existing constraint that's causing the issue
ALTER TABLE public.referral_rewards 
DROP CONSTRAINT IF EXISTS referral_rewards_reward_tier_check;

-- Add the updated constraint that supports all 5 tiers
ALTER TABLE public.referral_rewards 
ADD CONSTRAINT referral_rewards_reward_tier_check 
CHECK (reward_tier IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5'));

-- Verify the constraint was added correctly
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.referral_rewards'::regclass 
AND conname = 'referral_rewards_reward_tier_check'; 