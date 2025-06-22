import { createClient } from '@supabase/supabase-js'

// Get environment variables with better error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your-supabase-url') {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key') {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create Supabase client with fallback values that won't cause URL errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Database types
export interface User {
  id?: number
  wallet_address: string
  chain_id?: number
  network_name?: string
  created_at?: string
  updated_at?: string
}

// User service functions
export const userService = {
  // Add user wallet to database
  async addUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user save')
      return null
    }

    try {
      // First check if user already exists
      const exists = await this.checkUserExists(data.wallet_address)
      if (exists) {
        console.log('User already exists, skipping insert')
        return null
      }

      const { data: result, error } = await supabase
        .from('users')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding user:', error)
        throw error
      }

      console.log('User added successfully:', result)
      return result
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('User already exists (duplicate key)')
        return null
      }
      throw error
    }
  },

  // Check if user exists
  async checkUserExists(walletAddress: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user check')
      return false
    }

    const { data, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking user:', error)
      throw error
    }

    return !!data
  },

  // Get user stats
  async getUserStats() {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default stats')
      return { totalUsers: 0 }
    }

    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error getting user stats:', error)
      throw error
    }

    return { totalUsers: count || 0 }
  }
} 