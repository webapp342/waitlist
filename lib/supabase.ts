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

// Create Supabase client with service role for server-side operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder-key'
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
  users?: {
    created_at: string
  }
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

// Airdrop interface
export interface Airdrop {
  id?: string
  ethereum_address: string
  xp_amount: number
  created_at?: string
  updated_at?: string
}

// ETH Tokens interface
export interface EthTokens {
  id?: number
  steth: number
  weth: number
  eth: number
  weeth: number
  eeth: number
  ethx: number
  rseth: number
  ezeth: number
  pufeth: number
  wsteth: number
  created_at?: string
}

// User service functions
export const userService = {
  // Add user wallet to database (via API with rate limiting)
  async addUser(walletAddress: string, captchaToken?: string) {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress,
          captchaToken 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('Too many registration attempts. Please wait a moment and try again.');
        }
        throw new Error(result.error || 'Registration failed');
      }

      console.log('User registration successful:', result.user);
      return result.user;
    } catch (error: any) {
      console.error('Error adding user:', error);
      throw error;
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

  // Get all referral codes for ranking calculation
  async getAllReferralCodes(): Promise<ReferralCode[]> {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty referral codes')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select(`
          *,
          users!inner(created_at)
        `)
        .eq('is_active', true)
        .order('total_referrals', { ascending: false })

      if (error) {
        console.error('Error fetching all referral codes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllReferralCodes:', error)
      return []
    }
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

  // Get referral leaderboard - OPTIMIZED VERSION
  async getLeaderboard(walletAddress: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { topUsers: [], currentUserRank: null }
    }

    try {
      // Sadece top 100 kullanıcıyı çek (display için)
      const { data: topReferralCodes, error: topError } = await supabase
        .from('referral_codes')
        .select(`
          user_id,
          total_referrals,
          users!inner(id, wallet_address)
        `)
        .eq('is_active', true)
        .order('total_referrals', { ascending: false })
        .limit(100);

      if (topError) {
        console.error('Error fetching top referral codes:', topError);
        return { topUsers: [], currentUserRank: null };
      }

      // Top 100 kullanıcıyı hazırla
      const topUsers = (topReferralCodes || []).map((entry, index) => {
        // users field'ı array olarak geliyor, ilk elemanı al
        const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
        const walletAddress = userData?.wallet_address || '';
        
        console.log(`Entry ${index}: user_id=${entry.user_id}, wallet_address=${walletAddress}, referrals=${entry.total_referrals}`);
        
        return {
          rank: index + 1,
          userId: entry.user_id,
          walletAddress,
          totalRewards: '0', // Will be added from referral_rewards table later
          invitedCount: entry.total_referrals || 0
        };
      });

      // Mevcut kullanıcının sırasını bul
      let currentUserRank = null;
      console.log('Looking for current user with wallet:', walletAddress);
      
      if (walletAddress && walletAddress !== '0x0000000000000000000000000000000000000000') {
        // Önce top 100'de ara
        const currentUser = topUsers.find(
          entry => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
        
        console.log('Current user in top 100:', currentUser);
        
        if (currentUser) {
          currentUserRank = { ...currentUser, isCurrentUser: true };
          console.log('Found user in top 100, setting currentUserRank:', currentUserRank);
        } else {
          // Top 100'de yoksa, sadece o kullanıcının bilgilerini çek
          const { data: userReferralCode, error: userError } = await supabase
            .from('referral_codes')
            .select(`
              user_id,
              total_referrals,
              total_rewards_earned,
              users!inner(id, wallet_address)
            `)
            .eq('is_active', true)
            .eq('users.wallet_address', walletAddress.toLowerCase())
            .single();

          if (!userError && userReferralCode) {
            const referralCount = userReferralCode.total_referrals || 0;
            
            if (referralCount > 0) {
              // Referral > 0 ise, tüm kayıtlardan rank hesapla (sadece gerekirse)
              const { count: totalCount, error: countError } = await supabase
                .from('referral_codes')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .gte('total_referrals', referralCount);

              const rank = countError ? 1000 : (totalCount || 1000);
              
              // users field'ı array olarak geliyor, ilk elemanı al
              const userData = Array.isArray(userReferralCode.users) ? userReferralCode.users[0] : userReferralCode.users;
              const userWalletAddress = userData?.wallet_address || walletAddress;
              
              currentUserRank = {
                rank,
                userId: userReferralCode.user_id,
                walletAddress: userWalletAddress,
                totalRewards: userReferralCode.total_rewards_earned || '0',
                invitedCount: referralCount,
                isCurrentUser: true
              };
            } else {
              // Referral = 0 ise, users tablosundaki ID'yi kullan
              const { data: userData, error: userDataError } = await supabase
                .from('users')
                .select('id')
                .eq('wallet_address', walletAddress.toLowerCase())
                .single();

              if (!userDataError && userData) {
                currentUserRank = {
                  rank: userData.id,
                  userId: userData.id,
                  walletAddress,
                  totalRewards: '0',
                  invitedCount: 0,
                  isCurrentUser: true
                };
                             }
             }
           }
         }
       }

      console.log('Final currentUserRank calculated:', currentUserRank);
      console.log('Final result:', { topUsers, currentUserRank });
      console.log('Returning data structure:', {
        topUsersCount: topUsers.length,
        hasCurrentUserRank: !!currentUserRank,
        currentUserRankData: currentUserRank
      });
      return { topUsers, currentUserRank };
    } catch (error) {
      console.error('Error in getLeaderboard:', error)
      return { topUsers: [], currentUserRank: null }
    }
  }
}

// Airdrop service functions
export const airdropService = {
  // Add or update airdrop entry (single record)
  async addOrUpdateAirdrop(ethereumAddress: string, xpAmount: number): Promise<Airdrop | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping airdrop save')
      return null
    }

    try {
      // Check if airdrop entry already exists
      const { data: existing, error: checkError } = await supabase
        .from('airdrop')
        .select('*')
        .eq('ethereum_address', ethereumAddress.toLowerCase())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing airdrop:', checkError)
        throw checkError
      }

      if (existing) {
        // Update existing entry - add to current XP
        const newXpAmount = existing.xp_amount + xpAmount
        const { data: updated, error: updateError } = await supabase
          .from('airdrop')
          .update({ 
            xp_amount: newXpAmount,
            updated_at: new Date().toISOString()
          })
          .eq('ethereum_address', ethereumAddress.toLowerCase())
          .select()
          .single()

        if (updateError) {
          console.error('Error updating airdrop:', updateError)
          throw updateError
        }

        console.log('Airdrop updated successfully:', updated)
        return updated
      } else {
        // Create new entry
        const { data: created, error: createError } = await supabase
          .from('airdrop')
          .insert([{ 
            ethereum_address: ethereumAddress.toLowerCase(),
            xp_amount: xpAmount
          }])
          .select()
          .single()

        if (createError) {
          console.error('Error creating airdrop:', createError)
          throw createError
        }

        console.log('Airdrop created successfully:', created)
        return created
      }
    } catch (error) {
      console.error('Error in addOrUpdateAirdrop:', error)
      throw error
    }
  },

  // Get all existing airdrop data for comparison
  async getAllExistingAirdrops(): Promise<Map<string, number>> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty map')
      return new Map()
    }

    try {
      console.log('Fetching all existing airdrop data...')
      const { data: existingRecords, error: fetchError } = await supabase
        .from('airdrop')
        .select('ethereum_address, xp_amount')

      if (fetchError) {
        console.error('Error fetching all airdrops:', {
          error: fetchError,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        })
        throw fetchError
      }

      // Create map for quick lookup
      const existingMap = new Map<string, number>()
      existingRecords?.forEach(record => {
        existingMap.set(record.ethereum_address.toLowerCase(), record.xp_amount)
      })

      console.log(`Found ${existingMap.size} existing airdrop records`)
      return existingMap
    } catch (error: any) {
      console.error('Error in getAllExistingAirdrops:', {
        error: error,
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace'
      })
      return new Map()
    }
  },

  // Batch add new airdrops and update existing ones (PERFORMANCE OPTIMIZED)
  async batchAddOrUpdateAirdrops(airdropData: Array<{ethereumAddress: string, xpAmount: number}>): Promise<{successCount: number, errorCount: number, updatedCount: number, newCount: number}> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping batch airdrop save')
      return { successCount: 0, errorCount: airdropData.length, updatedCount: 0, newCount: 0 }
    }

    if (airdropData.length === 0) {
      return { successCount: 0, errorCount: 0, updatedCount: 0, newCount: 0 }
    }

    try {
      // Get all existing data first
      const existingMap = await this.getAllExistingAirdrops()
      
      // Separate new and existing records
      const newRecords: Array<{ethereum_address: string, xp_amount: number}> = []
      const updateRecords: Array<{ethereum_address: string, xp_amount: number}> = []

      airdropData.forEach(item => {
        const address = item.ethereumAddress.toLowerCase()
        const existingXp = existingMap.get(address)
        
        if (existingXp !== undefined) {
          // Update existing record - add to current XP
          updateRecords.push({
            ethereum_address: address,
            xp_amount: existingXp + item.xpAmount
          })
        } else {
          // Add new record
          newRecords.push({
            ethereum_address: address,
            xp_amount: item.xpAmount
          })
        }
      })

      console.log(`Processing: ${newRecords.length} new records, ${updateRecords.length} updates`)

      let successCount = 0
      let errorCount = 0

      // Batch insert new records
      if (newRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('airdrop')
          .insert(newRecords)

        if (insertError) {
          console.error('Error batch inserting new airdrops:', insertError)
          errorCount += newRecords.length
        } else {
          successCount += newRecords.length
          console.log(`Successfully inserted ${newRecords.length} new airdrop records`)
        }
      }

      // Batch update existing records using upsert
      if (updateRecords.length > 0) {
        const { error: updateError } = await supabase
          .from('airdrop')
          .upsert(updateRecords, { onConflict: 'ethereum_address' })

        if (updateError) {
          console.error('Error batch updating airdrops:', updateError)
          errorCount += updateRecords.length
        } else {
          successCount += updateRecords.length
          console.log(`Successfully updated ${updateRecords.length} existing airdrop records`)
        }
      }

      return { 
        successCount, 
        errorCount, 
        updatedCount: updateRecords.length, 
        newCount: newRecords.length 
      }

    } catch (error: any) {
      console.error('Error in batchAddOrUpdateAirdrops:', {
        error: error,
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        dataLength: airdropData.length
      })
      return { successCount: 0, errorCount: airdropData.length, updatedCount: 0, newCount: 0 }
    }
  },

  // Get airdrop entry by ethereum address
  async getAirdropByAddress(ethereumAddress: string): Promise<Airdrop | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping airdrop fetch')
      return null
    }

    console.log('🔍 Querying airdrop for address:', ethereumAddress);

    // Try exact lowercase match first
    let { data, error } = await supabase
      .from('airdrop')
      .select('*')
      .eq('ethereum_address', ethereumAddress.toLowerCase())
      .single()

    // If not found, try case-insensitive search
    if (error && error.code === 'PGRST116') {
      console.log('📝 Exact match not found, trying case-insensitive search...');
      const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
        .from('airdrop')
        .select('*')
        .ilike('ethereum_address', ethereumAddress)
        .single()
      
      data = caseInsensitiveData;
      error = caseInsensitiveError;
    }

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching airdrop:', error)
      throw error
    }

    console.log('✅ Airdrop query result:', data);
    return data || null
  },

  // Get all airdrop entries (for admin dashboard)
  async getAllAirdrops(): Promise<Airdrop[]> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty airdrops')
      return []
    }

    const { data, error } = await supabase
      .from('airdrop')
      .select('*')
      .order('xp_amount', { ascending: false })

    if (error) {
      console.error('Error fetching all airdrops:', error)
      throw error
    }

    return data || []
  },

  // Get airdrop statistics
  async getAirdropStats() {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { totalParticipants: 0, totalXp: 0, averageXp: 0 }
    }

    try {
      const { data, error } = await supabase
        .from('airdrop')
        .select('xp_amount')

      if (error) throw error

      const totalParticipants = data?.length || 0
      const totalXp = data?.reduce((sum, item) => sum + (item.xp_amount || 0), 0) || 0
      const averageXp = totalParticipants > 0 ? totalXp / totalParticipants : 0

      return {
        totalParticipants,
        totalXp,
        averageXp
      }
    } catch (error) {
      console.error('Error in getAirdropStats:', error)
      return { totalParticipants: 0, totalXp: 0, averageXp: 0 }
    }
  }
} 

// Whitelist service functions
export const whitelistService = {
  // Get user registration status
  async getUserRegistrationStatus(walletAddress: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default registration status')
      return { 
        registration_count: 0, 
        has_eth: false, 
        has_bnb: false, 
        is_complete: false 
      }
    }

    try {
      // Get ETH registration
      const { data: ethRegistration, error: ethError } = await supabase
        .from('whitelist_registrations')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('network_preference', 'ETH')
        .eq('status', 'active')
        .single()

      // Get BNB registration
      const { data: bnbRegistration, error: bnbError } = await supabase
        .from('whitelist_registrations')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('network_preference', 'BNB')
        .eq('status', 'active')
        .single()

      const has_eth = !ethError && ethRegistration
      const has_bnb = !bnbError && bnbRegistration
      const registration_count = (has_eth ? 1 : 0) + (has_bnb ? 1 : 0)
      const is_complete = has_eth && has_bnb

      return {
        registration_count,
        has_eth,
        has_bnb,
        is_complete
      }
    } catch (error) {
      console.error('Error getting user registration status:', error)
      return { 
        registration_count: 0, 
        has_eth: false, 
        has_bnb: false, 
        is_complete: false 
      }
    }
  },

  // Get user registrations
  async getUserRegistrations(walletAddress: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty registrations')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('whitelist_registrations')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('status', 'active')
        .order('registration_date', { ascending: false })

      if (error) {
        console.error('Error fetching user registrations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserRegistrations:', error)
      return []
    }
  },

  // Add whitelist registration
  async addWhitelistRegistration(registrationData: {
    wallet_address: string
    email: string
    network_preference: 'ETH' | 'BNB'
    wallet_balance: string
    status?: string
  }) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping whitelist registration')
      throw new Error('Database not configured')
    }

    try {
      const { data, error } = await supabase
        .from('whitelist_registrations')
        .insert([{
          wallet_address: registrationData.wallet_address.toLowerCase(),
          email: registrationData.email.toLowerCase(),
          network_preference: registrationData.network_preference,
          wallet_balance: registrationData.wallet_balance,
          status: registrationData.status || 'active',
          registration_date: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding whitelist registration:', error)
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('duplicate key')
        }
        throw error
      }

      console.log('Whitelist registration added successfully:', data)
      return data
    } catch (error) {
      console.error('Error in addWhitelistRegistration:', error)
      throw error
    }
  },

  // Get whitelist statistics
  async getWhitelistStats() {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning default whitelist stats')
      return { totalRegistrations: 0, ethRegistrations: 0, bnbRegistrations: 0 }
    }

    try {
      const { count: totalCount, error: totalError } = await supabase
        .from('whitelist_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const { count: ethCount, error: ethError } = await supabase
        .from('whitelist_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('network_preference', 'ETH')

      const { count: bnbCount, error: bnbError } = await supabase
        .from('whitelist_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('network_preference', 'BNB')

      if (totalError || ethError || bnbError) {
        console.error('Error getting whitelist stats:', { totalError, ethError, bnbError })
      }

      return {
        totalRegistrations: totalCount || 0,
        ethRegistrations: ethCount || 0,
        bnbRegistrations: bnbCount || 0
      }
    } catch (error) {
      console.error('Error in getWhitelistStats:', error)
      return { totalRegistrations: 0, ethRegistrations: 0, bnbRegistrations: 0 }
    }
  }
} 

// ETH Tokens service functions
export const ethTokensService = {
  // Get all ETH tokens data
  async getAllEthTokens(): Promise<EthTokens[]> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning empty ETH tokens')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('eth_tokens')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching ETH tokens:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllEthTokens:', error)
      return []
    }
  },

  // Get latest ETH tokens data
  async getLatestEthTokens(): Promise<EthTokens | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, returning null ETH tokens')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('eth_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching latest ETH tokens:', error)
        return null
      }

      return data || null
    } catch (error) {
      console.error('Error in getLatestEthTokens:', error)
      return null
    }
  },

  // Add new ETH tokens data
  async addEthTokens(tokensData: Omit<EthTokens, 'id' | 'created_at'>): Promise<EthTokens | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping ETH tokens save')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('eth_tokens')
        .insert([tokensData])
        .select()
        .single()

      if (error) {
        console.error('Error adding ETH tokens:', error)
        return null
      }

      console.log('ETH tokens added successfully:', data)
      return data
    } catch (error) {
      console.error('Error in addEthTokens:', error)
      return null
    }
  },

  // Get ETH tokens statistics
  async getEthTokensStats() {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { 
        totalRecords: 0, 
        totalStETH: 0, 
        totalWETH: 0, 
        totalETH: 0,
        totalWeETH: 0,
        totalEETH: 0,
        totalETHx: 0,
        totalRsETH: 0,
        totalEzETH: 0,
        totalPufETH: 0,
        totalWstETH: 0
      }
    }

    try {
      const { data, error } = await supabase
        .from('eth_tokens')
        .select('*')

      if (error) throw error

      const totalRecords = data?.length || 0
      const totalStETH = data?.reduce((sum, item) => sum + (item.steth || 0), 0) || 0
      const totalWETH = data?.reduce((sum, item) => sum + (item.weth || 0), 0) || 0
      const totalETH = data?.reduce((sum, item) => sum + (item.eth || 0), 0) || 0
      const totalWeETH = data?.reduce((sum, item) => sum + (item.weeth || 0), 0) || 0
      const totalEETH = data?.reduce((sum, item) => sum + (item.eeth || 0), 0) || 0
      const totalETHx = data?.reduce((sum, item) => sum + (item.ethx || 0), 0) || 0
      const totalRsETH = data?.reduce((sum, item) => sum + (item.rseth || 0), 0) || 0
      const totalEzETH = data?.reduce((sum, item) => sum + (item.ezeth || 0), 0) || 0
      const totalPufETH = data?.reduce((sum, item) => sum + (item.pufeth || 0), 0) || 0
      const totalWstETH = data?.reduce((sum, item) => sum + (item.wsteth || 0), 0) || 0

      return {
        totalRecords,
        totalStETH,
        totalWETH,
        totalETH,
        totalWeETH,
        totalEETH,
        totalETHx,
        totalRsETH,
        totalEzETH,
        totalPufETH,
        totalWstETH
      }
    } catch (error) {
      console.error('Error in getEthTokensStats:', error)
      return { 
        totalRecords: 0, 
        totalStETH: 0, 
        totalWETH: 0, 
        totalETH: 0,
        totalWeETH: 0,
        totalEETH: 0,
        totalETHx: 0,
        totalRsETH: 0,
        totalEzETH: 0,
        totalPufETH: 0,
        totalWstETH: 0
      }
    }
  }
} 