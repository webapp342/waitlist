# Discord RLS Troubleshooting Guide

## Current Issue
Discord OAuth callback is still failing with RLS policy violation even after applying the fix scripts.

## Immediate Action Plan

### Step 1: Run Diagnostic Script
First, run the diagnostic script to understand the current state:

```sql
-- Copy and paste the contents of diagnose_discord_rls.sql
-- This will show you the current RLS policies and help identify the issue
```

### Step 2: Emergency Fix (Immediate Solution)
If the diagnostic shows RLS is still blocking operations, apply the emergency fix:

```sql
-- Copy and paste the contents of emergency_discord_fix.sql
-- This temporarily disables RLS to get Discord OAuth working immediately
```

### Step 3: Test Discord OAuth
After applying the emergency fix:
1. Try the Discord OAuth flow again
2. Check if the user data is saved successfully
3. Verify no more RLS errors in the logs

### Step 4: Re-enable RLS (After Testing)
Once Discord OAuth is working, re-enable RLS with more permissive policies:

```sql
-- Copy and paste the contents of re_enable_discord_rls.sql
-- This re-enables RLS with policies that should work with the service role
```

## Possible Root Causes

### 1. Service Role Key Issue
The `SUPABASE_SERVICE_ROLE_KEY` environment variable might not be properly set or recognized.

**Check:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in your environment
- Ensure it's the correct service role key from your Supabase dashboard
- Check if the key has the proper permissions

### 2. RLS Policy Conflicts
Multiple policies might be conflicting with each other.

**Solution:**
- The emergency fix script drops all policies and disables RLS
- This eliminates any policy conflicts

### 3. JWT Claims Format
The RLS policies might be expecting different JWT claim formats.

**Issue:**
- Policies might be looking for `wallet_address` but getting `sub`
- Or vice versa

**Solution:**
- The re-enable script uses more permissive policies that don't rely on specific JWT claims

### 4. Supabase Client Configuration
The `supabaseAdmin` client might not be properly configured.

**Check:**
- Verify the service role key is being used correctly in `lib/supabase.ts`
- Ensure the client is created with the service role key

## Verification Steps

### After Emergency Fix
1. **Check RLS Status:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'discord_%';
   ```
   All should show `false` (RLS disabled)

2. **Test Insert:**
   ```sql
   INSERT INTO discord_users (user_id, discord_id, username, discriminator, avatar_url, access_token, refresh_token, token_expires_at, is_active) 
   VALUES ('0xTEST', 'TEST123', 'test', '0', 'https://example.com', 'token', 'refresh', NOW() + INTERVAL '1 hour', true);
   ```
   Should work without errors

3. **Test Discord OAuth:**
   - Try the Discord connection flow
   - Check logs for successful database operations

### After Re-enabling RLS
1. **Check RLS Status:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'discord_%';
   ```
   All should show `true` (RLS enabled)

2. **Check Policies:**
   ```sql
   SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename LIKE 'discord_%';
   ```
   Should show policies with `auth.role() = 'service_role' OR auth.role() = 'authenticated'`

3. **Test Discord OAuth Again:**
   - Verify it still works with RLS enabled
   - Check for any new errors

## Environment Variables Checklist

Ensure these are properly set:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Discord Configuration
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://bblip.io/discord/callback
```

## Long-term Solution

Once the immediate issue is resolved, consider implementing more secure RLS policies:

1. **Proper Service Role Recognition:**
   - Ensure the service role is properly configured
   - Test service role permissions thoroughly

2. **User-specific Policies:**
   - Implement policies that restrict users to their own data
   - Use proper JWT claim extraction

3. **Regular Testing:**
   - Test Discord OAuth flow regularly
   - Monitor for RLS policy violations

## Files Created for This Issue

1. `diagnose_discord_rls.sql` - Diagnostic script
2. `emergency_discord_fix.sql` - Temporary RLS disable
3. `re_enable_discord_rls.sql` - Re-enable RLS with working policies
4. `final_discord_rls_fix.sql` - Original comprehensive fix
5. `DISCORD_RLS_FIX_README.md` - Original documentation

## Next Steps

1. **Immediate:** Run the emergency fix to get Discord OAuth working
2. **Short-term:** Test thoroughly and re-enable RLS with permissive policies
3. **Long-term:** Implement proper service role configuration and secure policies

## Support

If the issue persists after following these steps:
1. Check the Supabase logs for additional error details
2. Verify the service role key permissions in Supabase dashboard
3. Consider contacting Supabase support for service role configuration issues 