-- Test Service Role Permissions
-- This script tests if the service role can perform operations on Discord tables

-- Test 1: Check if service role can select from discord_users
SELECT 
    'Service role can select from discord_users' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM discord_users 
            WHERE auth.role() = 'service_role'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- Test 2: Check if service role can insert into discord_users (with a test record)
-- Note: This will fail if the user doesn't exist in the users table
INSERT INTO discord_users (
    user_id, 
    discord_id, 
    username, 
    discriminator, 
    avatar_url, 
    access_token, 
    refresh_token, 
    token_expires_at, 
    is_active
) VALUES (
    '0xTESTWALLET123456789', 
    'TEST_DISCORD_ID_123', 
    'test_user', 
    '0', 
    'https://example.com/avatar.png', 
    'test_access_token', 
    'test_refresh_token', 
    NOW() + INTERVAL '1 hour', 
    true
) ON CONFLICT (discord_id) DO NOTHING;

-- Test 3: Check if the test record was inserted
SELECT 
    'Service role can insert into discord_users' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM discord_users 
            WHERE discord_id = 'TEST_DISCORD_ID_123'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as result;

-- Test 4: Clean up test record
DELETE FROM discord_users WHERE discord_id = 'TEST_DISCORD_ID_123';

-- Test 5: Check current RLS policies
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

-- Test 6: Check if RLS is enabled on Discord tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename LIKE 'discord_%'
ORDER BY tablename; 