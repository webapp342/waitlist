# Twitter OAuth Setup Guide

This guide will help you configure Twitter OAuth to fix the 400 errors you're experiencing.

## Prerequisites

1. A Twitter Developer Account
2. A Twitter App created in the Twitter Developer Portal
3. Environment variables configured

## Step 1: Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. Navigate to "App Settings" > "User authentication settings"
4. Enable OAuth 2.0
5. Set the following:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URLs**: `https://www.bblip.io/x/callback`
   - **Website URL**: `https://www.bblip.io`

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Twitter OAuth Configuration
NEXT_PUBLIC_X_CLIENT_ID=your_twitter_client_id_here
X_CLIENT_SECRET=your_twitter_client_secret_here

# Other required variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id_here
```

## Step 3: Database Setup

Make sure you have the required database tables. Run the following SQL files in order:

1. `schema.sql` - Main database schema
2. `x_oauth_schema.sql` - Twitter OAuth tables
3. `x_oauth_fix_columns.sql` - Fix any column issues
4. `x_oauth_fix_rls.sql` - Configure Row Level Security

## Step 4: Verify Configuration

1. Check that your Twitter App has the correct callback URL
2. Verify that your environment variables are loaded correctly
3. Test the OAuth flow

## Common Issues and Solutions

### 400 Bad Request Errors

**Problem**: Getting 400 errors from Twitter API

**Solutions**:
1. Verify your `client_id` and `client_secret` are correct
2. Ensure the callback URL matches exactly what's configured in Twitter
3. Check that your app has the correct permissions
4. Verify the redirect URI in your code matches the callback URL

### CSP Violations

**Problem**: Content Security Policy blocking scripts

**Solution**: The CSP headers have been updated in `next.config.mjs` to allow necessary scripts.

### SES Deprecation Warnings

**Problem**: Secure EcmaScript warnings in console

**Solution**: These warnings are now suppressed in the layout file.

## Testing the OAuth Flow

1. Start your development server: `npm run dev`
2. Navigate to the X/Twitter connection page
3. Click "Connect Twitter"
4. Complete the OAuth flow
5. Check the console for any errors

## Debugging

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Verify the network requests in the browser's Network tab
3. Check the server logs for any backend errors
4. Ensure all environment variables are properly set

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your `X_CLIENT_SECRET` secure and private
- Use environment-specific configurations for different deployments
- Regularly rotate your API keys

## Support

If you continue to experience issues:

1. Check the Twitter API documentation for any recent changes
2. Verify your Twitter App status in the developer portal
3. Check the Twitter API status page for any service issues
4. Review the error logs for specific error codes and messages 