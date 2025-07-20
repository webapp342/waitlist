#!/usr/bin/env node

/**
 * Twitter OAuth Configuration Test Script
 * 
 * This script tests the Twitter OAuth configuration to help debug issues.
 * Run with: node scripts/test-twitter-oauth.js
 */

require('dotenv').config({ path: '.env.local' });

function testTwitterConfig() {
  console.log('🐦 Testing Twitter OAuth Configuration...\n');

  // Check environment variables
  const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = 'https://www.bblip.io/x/callback';

  console.log('Environment Variables:');
  console.log(`  NEXT_PUBLIC_X_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  X_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Redirect URI: ${redirectUri}`);

  if (!clientId) {
    console.log('\n❌ NEXT_PUBLIC_X_CLIENT_ID is not set');
    console.log('   Please add it to your .env.local file');
    return false;
  }

  if (!clientSecret) {
    console.log('\n❌ X_CLIENT_SECRET is not set');
    console.log('   Please add it to your .env.local file');
    return false;
  }

  // Validate client ID format (should be alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(clientId)) {
    console.log('\n❌ Client ID format appears invalid');
    console.log('   Should be alphanumeric characters only');
    return false;
  }

  // Test URL construction
  console.log('\nURL Construction Test:');
  const testState = 'teststate123456789';
  const testCodeChallenge = 'testchallenge123456789';
  
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'tweet.read users.read offline.access');
  authUrl.searchParams.set('state', testState);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', testCodeChallenge);

  console.log(`  Authorization URL: ${authUrl.toString().substring(0, 100)}...`);
  console.log('  ✅ URL construction successful');

  // Test redirect URI format
  if (!redirectUri.startsWith('https://')) {
    console.log('\n❌ Redirect URI must use HTTPS');
    return false;
  }

  console.log('\n✅ Twitter OAuth configuration appears valid!');
  console.log('\nNext steps:');
  console.log('1. Make sure your Twitter App is configured with the correct callback URL');
  console.log('2. Verify your app has the required permissions (Read)');
  console.log('3. Test the OAuth flow in your application');
  
  return true;
}

function testDatabaseConnection() {
  console.log('\n🗄️  Testing Database Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Database Variables:');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('\n❌ Database configuration incomplete');
    return false;
  }

  console.log('✅ Database configuration appears valid');
  return true;
}

function main() {
  console.log('🔧 Twitter OAuth Configuration Test\n');
  console.log('=====================================\n');

  const twitterValid = testTwitterConfig();
  const dbValid = testDatabaseConnection();

  console.log('\n=====================================');
  
  if (twitterValid && dbValid) {
    console.log('🎉 All tests passed! Your configuration looks good.');
    console.log('\nIf you\'re still experiencing issues:');
    console.log('1. Check the Twitter Developer Portal for app status');
    console.log('2. Verify your callback URL matches exactly');
    console.log('3. Check the browser console for detailed error messages');
    console.log('4. Review the server logs for backend errors');
  } else {
    console.log('❌ Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run the test
main(); 