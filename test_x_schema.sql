-- Test X Schema
-- Run this after creating the x_users table to verify everything works

-- 1. Test table creation
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'x_users'
) as table_exists;

-- 2. Test indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'x_users';

-- 3. Test triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'x_users';

-- 4. Test functions
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%x_users%';

-- 5. Test permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'x_users';

-- 6. Test sequence
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_schema = 'public' 
AND sequence_name = 'x_users_id_seq'; 