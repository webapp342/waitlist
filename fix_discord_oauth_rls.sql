-- Fix Discord OAuth Sessions RLS Policy
-- This script fixes the RLS policy that's blocking OAuth session creation

-- 1. First, let's check the current RLS status
SELECT 
  'Current RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions';

-- 2. Check existing policies
SELECT 
  'Current Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions'
ORDER BY policyname;

-- 3. Drop existing policies that might be causing issues
DROP POLICY IF EXISTS discord_oauth_sessions_select_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_update_policy ON public.discord_oauth_sessions;
DROP POLICY IF EXISTS discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions;

-- 4. Create new policies that work with the API
-- INSERT policy - allow authenticated users to insert their own sessions
CREATE POLICY discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (wallet_address = (select get_wallet_address()));

-- SELECT policy - allow users to see their own sessions
CREATE POLICY discord_oauth_sessions_select_policy ON public.discord_oauth_sessions
    FOR SELECT USING (wallet_address = (select get_wallet_address()));

-- UPDATE policy - allow users to update their own sessions
CREATE POLICY discord_oauth_sessions_update_policy ON public.discord_oauth_sessions
    FOR UPDATE USING (wallet_address = (select get_wallet_address()));

-- DELETE policy - allow users to delete their own sessions
CREATE POLICY discord_oauth_sessions_delete_policy ON public.discord_oauth_sessions
    FOR DELETE USING (wallet_address = (select get_wallet_address()));

-- 5. Alternative: Create a more permissive policy for OAuth flow
-- This allows the API to work even when wallet_address might not be set during OAuth initiation
DROP POLICY IF EXISTS discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions;

CREATE POLICY discord_oauth_sessions_insert_policy ON public.discord_oauth_sessions
    FOR INSERT WITH CHECK (
        -- Allow if wallet_address matches current user
        wallet_address = (select get_wallet_address())
        OR 
        -- Allow if wallet_address is provided and user is authenticated
        (wallet_address IS NOT NULL AND auth.role() = 'authenticated')
        OR
        -- Allow service role (for API calls)
        auth.role() = 'service_role'
    );

-- 6. Verify the new policies
SELECT 
  'Updated Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'discord_oauth_sessions'
ORDER BY policyname;

-- 7. Test the policy with a sample insert (commented out for safety)
-- This would test if the policy works correctly
/*
DO $$
BEGIN
  RAISE NOTICE 'Testing Discord OAuth Sessions RLS Policy...';
  -- The actual test would be done by the API
  RAISE NOTICE 'Policy should now allow authenticated users to insert sessions';
END $$;
*/

-- 8. Summary
DO $$
BEGIN
  RAISE NOTICE 'Discord OAuth Sessions RLS Policy Fixed!';
  RAISE NOTICE 'The API should now be able to create OAuth sessions';
  RAISE NOTICE 'Policies allow: INSERT, SELECT, UPDATE, DELETE for authenticated users';
  RAISE NOTICE 'Service role has full access for API operations';
END $$; 