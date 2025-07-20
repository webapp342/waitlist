#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script ensures all required database tables exist for OAuth functionality.
 * Run with: node scripts/setup-database.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function setupDatabase() {
  console.log('🗄️  Setting up database for OAuth...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test connection
    console.log('Testing database connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Check if x_users table exists
    console.log('\nChecking x_users table...');
    const { data: xUsersData, error: xUsersError } = await supabase
      .from('x_users')
      .select('count')
      .limit(1);

    if (xUsersError) {
      console.log('❌ x_users table does not exist or has issues');
      console.log('Please run the SQL schema files in your Supabase dashboard:');
      console.log('1. x_oauth_schema.sql');
      console.log('2. x_oauth_fix_columns.sql');
      console.log('3. x_oauth_fix_rls.sql');
    } else {
      console.log('✅ x_users table exists');
    }

    // Check if x_oauth_sessions table exists
    console.log('\nChecking x_oauth_sessions table...');
    const { data: oauthData, error: oauthError } = await supabase
      .from('x_oauth_sessions')
      .select('count')
      .limit(1);

    if (oauthError) {
      console.log('❌ x_oauth_sessions table does not exist');
      console.log('Please run x_oauth_schema.sql in your Supabase dashboard');
    } else {
      console.log('✅ x_oauth_sessions table exists');
    }

    // Check Twitter OAuth environment variables
    console.log('\nChecking Twitter OAuth configuration...');
    const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!clientId) {
      console.log('❌ NEXT_PUBLIC_X_CLIENT_ID is not set');
    } else {
      console.log('✅ NEXT_PUBLIC_X_CLIENT_ID is set');
    }

    if (!clientSecret) {
      console.log('❌ X_CLIENT_SECRET is not set');
    } else {
      console.log('✅ X_CLIENT_SECRET is set');
    }

    console.log('\n=====================================');
    console.log('🎉 OAuth database setup check completed!');
    console.log('\nIf any tables are missing, please run the SQL files in your Supabase dashboard.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase(); 