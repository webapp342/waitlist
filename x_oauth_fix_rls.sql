-- Fix RLS Policies for X OAuth
-- Run this to fix the RLS policy issues

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can insert their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can update their own oauth sessions" ON x_oauth_sessions;
DROP POLICY IF EXISTS "Users can view their own x connections" ON x_users;
DROP POLICY IF EXISTS "Users can insert their own x connections" ON x_users;
DROP POLICY IF EXISTS "Users can update their own x connections" ON x_users;

-- Create new policies that allow all operations
CREATE POLICY "Allow all operations on x_oauth_sessions" ON x_oauth_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on x_users" ON x_users
    FOR ALL USING (true) WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('x_oauth_sessions', 'x_users'); 