-- Disable RLS for X OAuth tables
-- Run this if you want to disable RLS completely

-- Disable RLS on x_oauth_sessions
ALTER TABLE x_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on x_users
ALTER TABLE x_users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('x_oauth_sessions', 'x_users'); 