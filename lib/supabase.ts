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
  id: number
  wallet_address: string
  referred_by?: number
  referral_code_used?: string
  created_at?: string
}

// New Card interface for the unified table structure
export interface CardRow {
  id?: number
  user_id: number
  card_number_bronze: string
  card_number_silver: string
  card_number_gold: string
  cvv_bronze: string
  cvv_silver: string
  cvv_gold: string
  expiration_date_bronze: string
  expiration_date_silver: string
  expiration_date_gold: string
  created_at?: string
}

// Individual card type for backwards compatibility
export interface Card {
  id?: number
  user_id: number
  card_number: string
  cvv: string
  expiration_date: string
  card_type: 'bronze' | 'silver' | 'black'
  created_at?: string
}

// Stake log interface
export interface StakeLog {
  id?: string
  user_id: number
  transaction_hash: string
  amount: string
  action_type: 'stake' | 'unstake' | 'claim_rewards' | 'emergency_withdraw'
  block_number?: number
  gas_used?: number
  gas_price?: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at?: string
  updated_at?: string
}

// Referral code interface
export interface ReferralCode {
  id?: string
  user_id: number
  code: string
  is_active: boolean
  total_referrals: number
  total_rewards_earned: string
  created_at?: string
  updated_at?: string
}

// Referral interface
export interface Referral {
  id?: string
  referrer_id: number
  referred_id: number
  referral_code_id: string
  created_at?: string
  updated_at?: string
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

  // Get user by ID
  async getUserById(userId: number): Promise<User | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user fetch')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by ID:', error)
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
  // Get user cards by wallet address (returns array of 3 cards)
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

      // Get cards row for this user
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No cards found
          console.log('No cards found for user:', walletAddress)
          return []
        }
        console.error('Error fetching user cards:', error)
        throw error
      }

      if (!data) {
        return []
      }

      // Convert single row to array of 3 cards
      const cards: Card[] = [
        {
          id: data.id,
          user_id: data.user_id,
          card_number: data.card_number_bronze,
          cvv: data.cvv_bronze,
          expiration_date: data.expiration_date_bronze,
          card_type: 'bronze',
          created_at: data.created_at
        },
        {
          id: data.id,
          user_id: data.user_id,
          card_number: data.card_number_silver,
          cvv: data.cvv_silver,
          expiration_date: data.expiration_date_silver,
          card_type: 'silver',
          created_at: data.created_at
        },
        {
          id: data.id,
          user_id: data.user_id,
          card_number: data.card_number_gold,
          cvv: data.cvv_gold,
          expiration_date: data.expiration_date_gold,
          card_type: 'black',
          created_at: data.created_at
        }
      ]

      return cards
    } catch (error) {
      console.error('Error in getUserCards:', error)
      return []
    }
  },

  // Check if user has cards
  async userHasCards(walletAddress: string): Promise<boolean> {
    const cards = await this.getUserCards(walletAddress)
    return cards.length === 3
  },

  // Get card stats
  async getCardStats() {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default card stats')
      return { totalCards: 0 }
    }

    const { count, error } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error getting card stats:', error)
      throw error
    }

    return { totalCards: count || 0 }
  }
}

// Stake logs service functions
export const stakeLogsService = {
  // Add a new stake log
  async addStakeLog(logData: Omit<StakeLog, 'id' | 'created_at' | 'updated_at'>) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping stake log save')
      return null
    }

    try {
      const { data: result, error } = await supabase
        .from('stake_logs')
        .insert([logData])
        .select()
        .single()

      if (error) {
        console.error('Error adding stake log:', error)
        throw error
      }

      console.log('Stake log added successfully:', result)
      return result
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('Stake log already exists (duplicate transaction hash)')
        return await this.getStakeLogByTxHash(logData.transaction_hash)
      }
      throw error
    }
  },

  // Get stake log by transaction hash
  async getStakeLogByTxHash(transactionHash: string): Promise<StakeLog | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping stake log fetch')
      return null
    }

    const { data, error } = await supabase
      .from('stake_logs')
      .select('*')
      .eq('transaction_hash', transactionHash)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching stake log:', error)
      throw error
    }

    return data || null
  },

  // Get all stake logs for a user
  async getUserStakeLogs(walletAddress: string): Promise<StakeLog[]> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty stake logs')
      return []
    }

    try {
      // First get the user
      const user = await userService.getUserByWallet(walletAddress)
      if (!user) {
        console.log('User not found for wallet:', walletAddress)
        return []
      }

      const { data, error } = await supabase
        .from('stake_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user stake logs:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserStakeLogs:', error)
      return []
    }
  },

  // Update stake log status
  async updateStakeLogStatus(transactionHash: string, status: 'pending' | 'confirmed' | 'failed', blockNumber?: number | undefined, gasUsed?: number, gasPrice?: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping stake log update')
      return null
    }

    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }

      if (blockNumber) updateData.block_number = blockNumber
      if (gasUsed) updateData.gas_used = gasUsed
      if (gasPrice) updateData.gas_price = gasPrice

      const { data: result, error } = await supabase
        .from('stake_logs')
        .update(updateData)
        .eq('transaction_hash', transactionHash)
        .select()
        .single()

      if (error) {
        console.error('Error updating stake log:', error)
        throw error
      }

      console.log('Stake log updated successfully:', result)
      return result
    } catch (error) {
      console.error('Error in updateStakeLogStatus:', error)
      throw error
    }
  },

  // Get stake logs stats
  async getStakeLogsStats() {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default stake logs stats')
      return { totalLogs: 0, totalStaked: '0', totalUnstaked: '0' }
    }

    try {
      const { count, error } = await supabase
        .from('stake_logs')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Error getting stake logs stats:', error)
        throw error
      }

      // Get total staked and unstaked amounts
      const { data: stakeData, error: stakeError } = await supabase
        .from('stake_logs')
        .select('amount')
        .eq('action_type', 'stake')
        .eq('status', 'confirmed')

      const { data: unstakeData, error: unstakeError } = await supabase
        .from('stake_logs')
        .select('amount')
        .eq('action_type', 'unstake')
        .eq('status', 'confirmed')

      if (stakeError || unstakeError) {
        console.error('Error getting stake/unstake amounts:', { stakeError, unstakeError })
      }

      const totalStaked = stakeData?.reduce((sum, log) => sum + parseFloat(log.amount), 0) || 0
      const totalUnstaked = unstakeData?.reduce((sum, log) => sum + parseFloat(log.amount), 0) || 0

      return { 
        totalLogs: count || 0,
        totalStaked: totalStaked.toString(),
        totalUnstaked: totalUnstaked.toString()
      }
    } catch (error) {
      console.error('Error in getStakeLogsStats:', error)
      return { totalLogs: 0, totalStaked: '0', totalUnstaked: '0' }
    }
  }
}

// Referral service functions
export const referralService = {
  // Generate a unique referral code for a user
  async generateReferralCode(walletAddress: string): Promise<ReferralCode | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping referral code generation')
      return null
    }

    try {
      // First get the user
      const user = await userService.getUserByWallet(walletAddress)
      if (!user) {
        console.log('User not found for wallet:', walletAddress)
        return null
      }

      // Check if user already has a referral code
      const existingCode = await this.getReferralCodeByUserId(user.id)
      if (existingCode) {
        console.log('User already has a referral code:', existingCode.code)
        return existingCode
      }

      // Generate a unique referral code
      let code = this.generateUniqueCode()
      let attempts = 0
      const maxAttempts = 10
      
      // Ensure the code is unique
      while (attempts < maxAttempts) {
        const codeExists = await this.getReferralCodeByCode(code)
        if (!codeExists) {
          break
        }
        code = this.generateUniqueCode()
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique referral code after multiple attempts')
      }
      
      const { data: result, error } = await supabase
        .from('referral_codes')
        .insert([{
          user_id: user.id,
          code: code,
          is_active: true,
          total_referrals: 0,
          total_rewards_earned: '0'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error generating referral code:', error)
        throw error
      }

      console.log('Referral code generated successfully:', result.code)
      return result
    } catch (error) {
      console.error('Error in generateReferralCode:', error)
      throw error
    }
  },

  // Get referral code by user ID
  async getReferralCodeByUserId(userId: number): Promise<ReferralCode | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping referral code fetch')
      return null
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching referral code:', error)
      throw error
    }

    return data || null
  },

  // Get referral code by code string
  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping referral code fetch')
      return null
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching referral code:', error)
      throw error
    }

    return data || null
  },

  // Process referral when a new user signs up
  async processReferral(referralCode: string, newUserWallet: string): Promise<boolean> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping referral processing')
      return false
    }

    try {
      // Get the referral code
      const referralCodeData = await this.getReferralCodeByCode(referralCode)
      if (!referralCodeData) {
        console.log('Invalid referral code:', referralCode)
        return false
      }

      // Get the referrer user by ID (not by wallet address)
      const referrerUser = await userService.getUserById(referralCodeData.user_id)
      if (!referrerUser) {
        console.log('Referrer user not found')
        return false
      }

      // Get the new user
      const newUser = await userService.getUserByWallet(newUserWallet)
      if (!newUser) {
        console.log('New user not found')
        return false
      }

      // Check if user is referring themselves
      if (referrerUser.id === newUser.id) {
        console.log('User cannot refer themselves')
        return false
      }

      // Check if user was already referred
      if (newUser.referred_by) {
        console.log('User was already referred')
        return false
      }

      console.log('Creating referral with data:', {
        referrer_id: referrerUser.id,
        referred_id: newUser.id,
        referral_code_id: referralCodeData.id
      })

      // Create referral record
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: referrerUser.id,
          referred_id: newUser.id,
          referral_code_id: referralCodeData.id
        }])
        .select()
        .single()

      if (referralError) {
        console.error('Detailed referral error:', {
          code: referralError.code,
          message: referralError.message,
          details: referralError.details,
          hint: referralError.hint
        })
        throw referralError
      }

      console.log('Referral created successfully:', referral)

      // Update new user with referral information
      const { error: updateError } = await supabase
        .from('users')
        .update({
          referred_by: referrerUser.id,
          referral_code_used: referralCode
        })
        .eq('id', newUser.id)

      if (updateError) {
        console.error('Detailed user update error:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        throw updateError
      }

      console.log('User updated with referral info')

      // Update referral code stats
      const { error: statsError } = await supabase
        .from('referral_codes')
        .update({
          total_referrals: referralCodeData.total_referrals + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', referralCodeData.id)

      if (statsError) {
        console.error('Detailed stats update error:', {
          code: statsError.code,
          message: statsError.message,
          details: statsError.details,
          hint: statsError.hint
        })
        throw statsError
      }

      console.log('Referral code stats updated')
      return true
    } catch (error: any) {
      console.error('Detailed error in processReferral:', {
        error: error,
        errorMessage: error.message,
        errorStack: error.stack
      })
      return false
    }
  },

  // Get user's referral statistics
  async getUserReferralStats(walletAddress: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default referral stats')
      return { totalReferrals: 0, totalRewards: '0', referralCode: null }
    }

    try {
      const user = await userService.getUserByWallet(walletAddress)
      if (!user) {
        return { totalReferrals: 0, totalRewards: '0', referralCode: null }
      }

      const referralCode = await this.getReferralCodeByUserId(user.id)
      
      return {
        totalReferrals: referralCode?.total_referrals || 0,
        totalRewards: referralCode?.total_rewards_earned || '0',
        referralCode: referralCode
      }
    } catch (error) {
      console.error('Error in getUserReferralStats:', error)
      return { totalReferrals: 0, totalRewards: '0', referralCode: null }
    }
  },

  // Get user's referral list
  async getUserReferrals(walletAddress: string): Promise<Referral[]> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty referrals')
      return []
    }

    try {
      const user = await userService.getUserByWallet(walletAddress)
      if (!user) {
        return []
      }

      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred_user:users!referrals_referred_id_fkey(wallet_address)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user referrals:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserReferrals:', error)
      return []
    }
  },

  // Generate unique referral code
  generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
} 