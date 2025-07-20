# Discord RLS Fix

## Issue Description

The Discord OAuth callback was failing with a Row Level Security (RLS) policy violation error:

```
Error saving Discord user: {
  code: '42501',
  message: 'new row violates row-level security policy for table "discord_users"',
  details: null,
  hint: null
}
```

## Root Cause

The issue was that the RLS policies for Discord tables were not properly configured to allow the service role (`supabaseAdmin`) to perform insert operations. The service role is used in the Discord callback route (`app/api/discord/callback/route.ts`) to save Discord user data to the database.

## Solution

The fix involves updating the RLS policies for all Discord-related tables to properly allow service role operations while maintaining security for regular users.

### Files Created

1. **`final_discord_rls_fix.sql`** - The main fix script that:
   - Temporarily disables RLS to clean up existing policies
   - Drops all existing Discord RLS policies
   - Re-enables RLS
   - Creates new, simplified policies that work with the service role
   - Uses `COALESCE` to handle different JWT claim formats

2. **`fix_discord_rls.sql`** - Alternative fix approach
3. **`fix_discord_rls_alternative.sql`** - Another alternative approach
4. **`test_service_role.sql`** - Test script to verify service role permissions

## How to Apply the Fix

1. **Run the main fix script** in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of final_discord_rls_fix.sql
   ```

2. **Verify the fix worked** by checking the logs after a Discord OAuth attempt

3. **Test the service role** using the test script if needed:
   ```sql
   -- Copy and paste the contents of test_service_role.sql
   ```

## Key Changes Made

### Before (Problematic Policies)
```sql
CREATE POLICY "Service role can manage discord users" ON discord_users
    FOR ALL USING (auth.role() = 'service_role');
```

### After (Fixed Policies)
```sql
CREATE POLICY "discord_users_all_operations" ON discord_users
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'wallet_address',
            current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
```

## Why This Fixes the Issue

1. **Service Role Recognition**: The new policies explicitly check for `auth.role() = 'service_role'`
2. **JWT Claim Flexibility**: Uses `COALESCE` to handle different JWT claim formats (`wallet_address` vs `sub`)
3. **Simplified Structure**: Single policy per table instead of separate policies for each operation type
4. **Proper Cleanup**: Removes all conflicting policies before creating new ones

## Tables Affected

- `discord_users`
- `discord_oauth_sessions`
- `discord_activities`
- `discord_daily_claims`
- `discord_message_logs`
- `discord_reaction_logs`

## Verification

After applying the fix, you should see:
- Successful Discord OAuth callbacks
- No more RLS policy violation errors
- Discord user data being saved to the database
- Discord activity records being created

## Environment Variables

Ensure these environment variables are properly set:
- `SUPABASE_SERVICE_ROLE_KEY` - The service role key for admin operations
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Notes

- The service role key should be kept secure and only used server-side
- Regular users can still only access their own data through the JWT claims
- The fix maintains security while allowing the OAuth callback to function properly 