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
  password_hash?: string
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
  },

  // Set user password
  async setUserPassword(walletAddress: string, passwordHash: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping password save')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) {
        console.error('Error setting user password:', error)
        throw error
      }

      console.log('Password set successfully for user:', walletAddress)
      return data
    } catch (error) {
      console.error('Error in setUserPassword:', error)
      throw error
    }
  },

  // Verify user password
  async getUserPasswordHash(walletAddress: string): Promise<string | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping password check')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user password:', error)
        throw error
      }

      return data?.password_hash || null
    } catch (error) {
      console.error('Error in getUserPasswordHash:', error)
      return null
    }
  },

  // Check if user has password set (excludes placeholder values)
  async hasPasswordSet(walletAddress: string): Promise<boolean> {
    const passwordHash = await this.getUserPasswordHash(walletAddress)
    
    // Check if password hash exists and is not a placeholder value
    if (!passwordHash) return false
    
    // List of placeholder values that indicate password is NOT set
    const placeholderValues = [
      'CHANGE_PASSWORD_REQUIRED',
      'NULL',
      'null',
      'undefined',
      'PLACEHOLDER',
      ''
    ]
    
    // Check if the password hash is actually a real bcrypt hash (starts with $2b$ or $2a$ or $2y$)
    const isBcryptHash = /^\$2[aby]\$\d+\$/.test(passwordHash)
    
    // Check if it's not a placeholder value
    const isNotPlaceholder = !placeholderValues.includes(passwordHash.toUpperCase())
    
    return isBcryptHash && isNotPlaceholder
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
        // Don't throw error here, just return null
        return null
      }

      console.log('Stake log added successfully:', result)
      return result
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('Stake log already exists (duplicate transaction hash)')
        try {
          return await this.getStakeLogByTxHash(logData.transaction_hash)
        } catch (fetchError) {
          console.error('Error fetching existing stake log:', fetchError)
          return null
        }
      }
      console.error('Error in addStakeLog:', error)
      return null
    }
  },

  // Get stake log by transaction hash
  async getStakeLogByTxHash(transactionHash: string): Promise<StakeLog | null> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping stake log fetch')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('stake_logs')
        .select('*')
        .eq('transaction_hash', transactionHash)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching stake log:', error)
        return null
      }

      return data || null
    } catch (error) {
      console.error('Error in getStakeLogByTxHash:', error)
      return null
    }
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
        return []
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

      console.log('Updating stake log status:', { transactionHash, updateData })

      const { data: result, error } = await supabase
        .from('stake_logs')
        .update(updateData)
        .eq('transaction_hash', transactionHash)
        .select()

      if (error) {
        console.error('CRITICAL ERROR - Failed to update stake log status:', error)
        console.error('Transaction hash:', transactionHash)
        console.error('Update data:', updateData)
        // This is critical for tier system - we need to throw this error
        throw error
      }

      console.log('✅ Stake log status updated successfully:', result)
      return result
    } catch (error) {
      console.error('CRITICAL ERROR in updateStakeLogStatus:', error)
      // This is critical - we need to throw this error so the frontend knows
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
      
      // Get actual referral count from referrals table
      const { count: actualReferralCount, error: countError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)

      if (countError) {
        console.error('Error counting referrals:', countError)
      }
      
      // Calculate total rewards from referral_rewards table with tier support
      // Get rewards where user is the referrer (davet eden)
      const { data: referrerRewards, error: referrerError } = await supabase
        .from('referral_rewards')
        .select('referrer_reward_amount, reward_tier')
        .eq('referrer_id', user.id)

      if (referrerError) {
        console.error('Error fetching referrer rewards:', referrerError)
      }

      // Get rewards where user is the referred (davet edilen)
      const { data: referredRewards, error: referredError } = await supabase
        .from('referral_rewards')
        .select('referred_reward_amount, reward_tier')
        .eq('referred_id', user.id)

      if (referredError) {
        console.error('Error fetching referred rewards:', referredError)
      }

      // Calculate total rewards with tier breakdown
      let totalRewardAmount = 0
      let tier1Rewards = 0
      let tier2Rewards = 0
      let tier3Rewards = 0
      let tier4Rewards = 0
      let tier5Rewards = 0

      // Sum referrer rewards
      if (referrerRewards && referrerRewards.length > 0) {
        referrerRewards.forEach(reward => {
          if (reward.referrer_reward_amount) {
            const amount = parseFloat(reward.referrer_reward_amount)
            totalRewardAmount += amount
            
            if (reward.reward_tier === 'tier1') {
              tier1Rewards += amount
            } else if (reward.reward_tier === 'tier2') {
              tier2Rewards += amount
            } else if (reward.reward_tier === 'tier3') {
              tier3Rewards += amount
            } else if (reward.reward_tier === 'tier4') {
              tier4Rewards += amount
            } else if (reward.reward_tier === 'tier5') {
              tier5Rewards += amount
            }
          }
        })
      }

      // Sum referred rewards
      if (referredRewards && referredRewards.length > 0) {
        referredRewards.forEach(reward => {
          if (reward.referred_reward_amount) {
            const amount = parseFloat(reward.referred_reward_amount)
            totalRewardAmount += amount
            
            if (reward.reward_tier === 'tier1') {
              tier1Rewards += amount
            } else if (reward.reward_tier === 'tier2') {
              tier2Rewards += amount
            } else if (reward.reward_tier === 'tier3') {
              tier3Rewards += amount
            } else if (reward.reward_tier === 'tier4') {
              tier4Rewards += amount
            } else if (reward.reward_tier === 'tier5') {
              tier5Rewards += amount
            }
          }
        })
      }

      // If no specific columns exist, try the general reward_amount column (backward compatibility)
      if (totalRewardAmount === 0) {
        const { data: allRewards, error: allRewardsError } = await supabase
          .from('referral_rewards')
          .select('reward_amount')
          .or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`)

        if (!allRewardsError && allRewards) {
          allRewards.forEach(reward => {
            if (reward.reward_amount) {
              totalRewardAmount += parseFloat(reward.reward_amount)
            }
          })
        }
      }
      
      return {
        totalReferrals: actualReferralCount || referralCode?.total_referrals || 0,
        totalRewards: totalRewardAmount.toString(),
        tier1Rewards: tier1Rewards.toString(),
        tier2Rewards: tier2Rewards.toString(),
        tier3Rewards: tier3Rewards.toString(),
        tier4Rewards: tier4Rewards.toString(),
        tier5Rewards: tier5Rewards.toString(),
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
  },

  // Update referral code statistics
  async updateReferralCodeStats(userId: number) {
    try {
      // Get the user's referral stats
      const user = await userService.getUserById(userId)
      if (!user) return
      
      const stats = await this.getUserReferralStats(user.wallet_address)
      
      // Update the referral_codes table with the latest stats
      const { error } = await supabase
        .from('referral_codes')
        .update({
          total_referrals: stats.totalReferrals,
          total_rewards_earned: stats.totalRewards,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating referral code stats:', error)
      }
    } catch (error) {
      console.error('Error in updateReferralCodeStats:', error)
    }
  },

  // Get referral leaderboard
  async getLeaderboard(walletAddress: string) {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty leaderboard')
      return { topUsers: [], currentUserRank: null }
    }

    try {
      // Get current user
      const currentUser = await userService.getUserByWallet(walletAddress)
      if (!currentUser) {
        return { topUsers: [], currentUserRank: null }
      }

      // Get all referral codes with user data, sorted by total_rewards_earned
      const { data: allReferralCodes, error } = await supabase
        .from('referral_codes')
        .select(`
          id,
          user_id,
          total_rewards_earned,
          users!referral_codes_user_id_fkey (
            id,
            wallet_address
          )
        `)
        .order('total_rewards_earned', { ascending: false, nullsFirst: false })

      if (error) {
        console.error('Error fetching leaderboard data:', error)
        throw error
      }

      // Filter out entries with 0 rewards and map to leaderboard entries
      const leaderboardEntries = (allReferralCodes || [])
        .filter(code => parseFloat(code.total_rewards_earned || '0') > 0)
        .map((code, index) => ({
          rank: index + 1,
          userId: code.user_id,
          walletAddress: (code as any).users?.wallet_address || '',
          totalRewards: code.total_rewards_earned || '0'
        }))

      // Get top 5 users
      const topUsers = leaderboardEntries.slice(0, 5)

      // Find current user's rank
      const currentUserEntry = leaderboardEntries.find(entry => entry.userId === currentUser.id)
      const currentUserRank = currentUserEntry ? {
        ...currentUserEntry,
        isCurrentUser: true
      } : null

      return {
        topUsers,
        currentUserRank
      }
    } catch (error) {
      console.error('Error in getLeaderboard:', error)
      return { topUsers: [], currentUserRank: null }
    }
  }
} 