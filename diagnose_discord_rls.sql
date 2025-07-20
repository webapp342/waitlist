-- Discord RLS Diagnostic Script
-- This script helps diagnose why the RLS policies are still blocking the service role

-- 1. Check if RLS is enabled on Discord tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename;

-- 2. Check current RLS policies for Discord tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename, policyname;

-- 3. Check if the service role exists and has proper permissions
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin
FROM pg_roles 
WHERE rolname = 'service_role';

-- 4. Check current user and role context
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- 5. Test if we can access the discord_users table at all
SELECT COUNT(*) as total_discord_users FROM discord_users;

-- 6. Check if there are any conflicting policies
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename LIKE 'discord_%'
GROUP BY tablename
ORDER BY tablename;

-- 7. Check the exact policy conditions for discord_users
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'discord_users'
ORDER BY policyname;

-- 8. Test a simple insert with explicit service role check
-- This will help us understand if the service role is being recognized
SELECT 
    'Service role check' as test,
    CASE 
        WHEN auth.role() = 'service_role' THEN 'Service role is active'
        ELSE 'Service role is NOT active - current role: ' || auth.role()
    END as result; 