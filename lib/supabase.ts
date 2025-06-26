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
  created_at?: string
}

export interface Card {
  id?: number
  user_id: number
  card_number: string
  cvv: string
  expiration_date: string
  card_type: 'bronze' | 'silver' | 'gold'
  created_at?: string
}

// User service functions
export const userService = {
  // Add user wallet to database (simplified)
  async addUser(walletAddress: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user save')
      return null
    }

    try {
      // First check if user already exists
      const exists = await this.checkUserExists(walletAddress)
      if (exists) {
        console.log('User already exists, skipping insert')
        return exists
      }

      const { data: result, error } = await supabase
        .from('users')
        .insert([{ wallet_address: walletAddress }])
        .select()
        .single()

      if (error) {
        console.error('Error adding user:', error)
        throw error
      }

      console.log('User added successfully:', result)
      // Cards will be automatically created by the database trigger
      return result
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('User already exists (duplicate key)')
        // Try to fetch the existing user
        return await this.getUserByWallet(walletAddress)
      }
      throw error
    }
  },

  // Check if user exists and return user data
  async checkUserExists(walletAddress: string): Promise<User | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user check')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking user:', error)
      throw error
    }

    return data || null
  },

  // Get user by wallet address
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user fetch')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error)
      throw error
    }

    return data || null
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

// Card service functions
export const cardService = {
  // Get user cards by wallet address
  async getUserCards(walletAddress: string): Promise<Card[]> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty cards')
      return []
    }

    try {
      // First get the user
      const user = await userService.getUserByWallet(walletAddress)
      if (!user) {
        console.log('User not found for wallet:', walletAddress)
        return []
      }

      // Get cards for this user
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching user cards:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserCards:', error)
      return []
    }
  },

  // Check if user has cards
  async userHasCards(walletAddress: string): Promise<boolean> {
    const cards = await this.getUserCards(walletAddress)
    return cards.length >= 3
  },

  // Get card stats
  async getCardStats() {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default card stats')
      return { totalCards: 0, bronzeCards: 0, silverCards: 0, goldCards: 0 }
    }

    const { data, error } = await supabase
      .from('cards')
      .select('card_type')

    if (error) {
      console.error('Error getting card stats:', error)
      throw error
    }

    const stats = {
      totalCards: data?.length || 0,
      bronzeCards: data?.filter(card => card.card_type === 'bronze').length || 0,
      silverCards: data?.filter(card => card.card_type === 'silver').length || 0,
      goldCards: data?.filter(card => card.card_type === 'gold').length || 0,
    }

    return stats
  }
} 