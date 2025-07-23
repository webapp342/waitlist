require('dotenv').config();

const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { LRUCache } = require('lru-cache');

// Import optimizations
const {
  userCache,
  processedMessages,
  processedReactions,
  metrics,
  dbCircuitBreaker,
  xpBatchProcessor,
  rateLimiter,
  executeQueryOptimized,
  getCachedUserOptimized,
  setCachedUserOptimized,
  addXPOptimized,
  processMessageOptimized,
  cleanup: cleanupOptimizations,
  initializeOptimizations,
  setSupabaseClient
} = require('./optimizations');

// Environment variables
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdsoduzvmnuyhwbbnkwi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc29kdXp2bW51eWh3YmJua3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTczNDUsImV4cCI6MjA2NjE5MzM0NX0.stWTGS03eY8IdftKpeylOHURDAkmf6LiKas4_Jdd5cw';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://bblip.io';

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// Supabase client with enhanced connection pooling
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: {
    schema: 'public',
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  },
  auth: {
    persistSession: false // Discord bot doesn't need session persistence
  },
  global: {
    headers: {
      'X-Client-Info': 'discord-bot-optimized'
    }
  }
});

// Pass supabase client to optimizations
setSupabaseClient(supabase);

// Legacy performance monitoring (kept for compatibility)
let dbQueryCount = 0;
let dbQueryTime = 0;
let cacheHitCount = 0;
let cacheMissCount = 0;

// Legacy database performance wrapper (kept for compatibility)
async function executeQuery(queryFn, operation = 'unknown') {
  return await executeQueryOptimized(queryFn, operation);
}

// Cache system for performance optimization (now using LRU cache from optimizations)
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL
const BATCH_INTERVAL = 30 * 1000; // 30 seconds batch processing

// Rate limiting configuration (optimized)
const RATE_LIMIT_DELAY = 50;
const RATE_LIMIT_RETRY_DELAY = 2000;
const MAX_MESSAGES_PER_MINUTE = 10;
const MAX_MESSAGES_PER_HOUR = 100;

// User rate limiting (now using optimized rate limiter)
const userRateLimits = new LRUCache({
  max: 1000,
  maxAge: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

// Global variables for compatibility (already defined elsewhere)

// XP configuration
const MESSAGE_XP = 1;
const DAILY_ACTIVITY_XP = 5;
const WEEKLY_STREAK_XP = 10;

// Discord invite tracking
const DISCORD_INVITE_XP_REWARD = 25; // XP for successful Discord invite
const DISCORD_INVITE_BBLP_REWARD = 5; // BBLP for successful Discord invite (daha önce 3 idi)
const DISCORD_INVITE_SYSTEM_ENABLED = true; // Enable/disable Discord invite system

// Level configuration
const LEVELS = [
  { name: 'Bronze', minXP: 0, maxXP: 250, reward: 1 },
  { name: 'Silver', minXP: 251, maxXP: 500, reward: 2 },
  { name: 'Gold', minXP: 501, maxXP: 1000, reward: 3 },
  { name: 'Platinum', minXP: 1001, maxXP: 2000, reward: 4 },
  { name: 'Diamond', minXP: 2001, maxXP: 999999, reward: 5 }
];

// Performance monitoring
let messageCount = 0;
let lastMessageTime = Date.now();
const PERFORMANCE_LOG_INTERVAL = 100;

// Batch processing queue
const xpUpdateQueue = new Map(); // discordId -> { xpAmount, reason, timestamp }
let batchProcessingInterval = null;

// Discord invite tracking
const discordInviteTracking = new Map(); // inviteCode -> { inviterId, uses, createdAt }
const customInviteTracking = new Map(); // customCode -> { userId, inviteCode, createdAt }

// Yeni anti-spam ve XP kontrolü (Telegram ile birebir)
const userSpamData = new Map(); // userId -> { lastMessage: '', warnings: 0, messageTimestamps: [] }

console.log('🌐 [DISCORD BOT] Environment Configuration:');
console.log('  - BOT_TOKEN:', BOT_TOKEN ? '✅ Set' : '❌ Missing');
console.log('  - SUPABASE_URL:', SUPABASE_URL);
console.log('  - GUILD_ID:', GUILD_ID);
console.log('  - WEB_APP_URL:', WEB_APP_URL);
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Discord Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`📊 Monitoring guild: ${GUILD_ID}`);
  console.log(`⚡ Cache TTL: ${CACHE_TTL / 1000}s | Batch Interval: ${BATCH_INTERVAL / 1000}s`);
  console.log(`🔄 Performance monitoring: Every ${PERFORMANCE_LOG_INTERVAL} messages`);
  console.log(`🎯 Discord invite system: ${DISCORD_INVITE_SYSTEM_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log(`💾 Database-first invite tracking: Enabled`);
  console.log(`🧠 Memory tracking: Secondary (for performance)`);
  
  // Start batch processing
  startBatchProcessing();
  
  // Initialize Discord invite tracking
  if (DISCORD_INVITE_SYSTEM_ENABLED) {
    initializeDiscordInviteTracking();
    loadSavedInviteLinks();
  }
});

// Cache management functions (optimized)
function getCachedUser(discordId) {
  return getCachedUserOptimized(discordId);
}

function setCachedUser(discordId, userData, xpData = null) {
  setCachedUserOptimized(discordId, userData, xpData);
}

function clearExpiredCache() {
  // Cache cleanup is now handled automatically by LRU cache
  // No manual cleanup needed
}

// Start batch processing for XP updates (optimized)
function startBatchProcessing() {
  // Batch processing is now handled by the optimized xpBatchProcessor
  // No need for manual setInterval - it's managed by the optimization module
  console.log('🔄 Optimized batch processing started');
}

// Process batch XP updates (optimized)
async function processBatchXPUpdates() {
  // This function is now handled by the optimized xpBatchProcessor
  // No manual processing needed
}

// Process single XP update
async function processSingleXPUpdate(discordId, xpAmount, reason = 'activity') {
  try {
    // Check if user is connected to the platform first
    const { data: discordUser, error: userError } = await executeQuery(
      () => supabase
        .from('discord_users')
        .select('discord_id')
        .eq('discord_id', discordId)
        .eq('is_active', true)
        .single(),
      'check_user_connection'
    );
    
    if (userError || !discordUser) {
      console.log(`⚠️ User ${discordId} is not connected to the platform, skipping XP update`);
      return false;
    }
    
    // Get current activity from cache or database
    let activity = getCachedUser(discordId)?.xpData;
    
    if (!activity) {
      const { data, error } = await supabase
        .from('discord_activities')
        .select('total_xp, current_level')
        .eq('discord_id', discordId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Discord activity:', error);
        return false;
      }
      
      activity = data || { total_xp: 0, current_level: 1 };
    }

    const currentXP = activity.total_xp || 0;
    const newXP = currentXP + xpAmount;
    const oldLevel = getCurrentLevel(currentXP);
    const newLevel = getCurrentLevel(newXP);

    // Update activity in database
    const { error: updateError } = await supabase
      .from('discord_activities')
      .upsert({
        discord_id: discordId,
        total_xp: newXP,
        current_level: newLevel.name === 'Bronze' ? 1 : 
                     newLevel.name === 'Silver' ? 2 : 
                     newLevel.name === 'Gold' ? 3 : 
                     newLevel.name === 'Platinum' ? 4 : 5,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'discord_id'
      });

    if (updateError) {
      console.error('Error updating Discord activity:', updateError);
      return false;
    }

    // Update cache
    const cached = getCachedUser(discordId);
    if (cached) {
      cached.xpData = { 
        total_xp: newXP, 
        current_level: newLevel.name === 'Bronze' ? 1 : 
                     newLevel.name === 'Silver' ? 2 : 
                     newLevel.name === 'Gold' ? 3 : 
                     newLevel.name === 'Platinum' ? 4 : 5,
        invite_count: cached.xpData?.invite_count || 0
      };
      setCachedUser(discordId, cached.userData, cached.xpData);
    }

    // Check for level up
    if (oldLevel.name !== newLevel.name) {
      console.log(`🎉 Level up! User ${discordId} reached ${newLevel.name} level`);
      
      // Send level up notification to a general channel
      try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) {
          const generalChannel = guild.channels.cache.find(channel => 
            channel.type === 0 && // Text channel
            (channel.name === 'general' || channel.name === 'chat' || channel.name === 'lobby')
          );
          
          if (generalChannel) {
            await sendLevelUpNotification(generalChannel, discordId, oldLevel.name, newLevel.name, newXP);
          }
        }
      } catch (error) {
        console.error('Error sending level up notification:', error);
      }
      
      return { levelUp: true, oldLevel: oldLevel.name, newLevel: newLevel.name, newXP };
    }

    return { levelUp: false, newXP };
  } catch (error) {
    console.error('Error processing XP update:', error);
    return false;
  }
}

// Add XP to user (now uses batch processing)
async function addXP(discordId, xpAmount, reason = 'activity') {
  // Use optimized XP adding
  return await addXPOptimized(discordId, xpAmount, reason);
}

// Rate limiting helper
function isRateLimited(userId) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId) || { messages: [], lastWarning: 0, warnings: 0 };
  
  // Clean old messages (older than 1 hour)
  userLimit.messages = userLimit.messages.filter(time => now - time < 60 * 60 * 1000);
  
  // Check minute limit
  const messagesLastMinute = userLimit.messages.filter(time => now - time < 60 * 1000).length;
  if (messagesLastMinute > MAX_MESSAGES_PER_MINUTE) {
    return true;
  }
  
  // Check hour limit
  if (userLimit.messages.length > MAX_MESSAGES_PER_HOUR) {
    return true;
  }
  
  return false;
}

// Add message to rate limit tracking
function addMessageToRateLimit(userId) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId) || { messages: [], lastWarning: 0, warnings: 0 };
  userLimit.messages.push(now);
  userRateLimits.set(userId, userLimit);
}

// Get user display name
function getUserDisplayName(member) {
  return member.nickname || member.user.username;
}

// Get current level for XP
function getCurrentLevel(totalXP) {
  return LEVELS.find(level => totalXP >= level.minXP && totalXP <= level.maxXP) || LEVELS[0];
}

// Get next level
function getNextLevel(currentLevel) {
  const currentIndex = LEVELS.findIndex(level => level.name === currentLevel.name);
  return LEVELS[currentIndex + 1] || null;
}

// Send level up notification
async function sendLevelUpNotification(channel, userId, oldLevel, newLevel, newXP) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎉 Level Up!')
      .setDescription(`Congratulations <@${userId}>! You've reached **${newLevel}** level!`)
      .addFields(
        { name: 'Previous Level', value: oldLevel, inline: true },
        { name: 'New Level', value: newLevel, inline: true },
        { name: 'Total XP', value: newXP.toString(), inline: true },
        { name: 'Daily Reward', value: `${getCurrentLevel(newXP).reward} BBLP`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending level up notification:', error);
  }
}

// Handle new messages (optimized)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Use optimized message processing
  await processMessageOptimized(message);
  
  const userId = message.author.id;
  const channel = message.channel;
  const now = Date.now();

  // Kullanıcı spam verisi (optimized with LRU cache)
  let spamData = userSpamData.get(userId) || { lastMessage: '', warnings: 0, messageTimestamps: [] };
  // 1 dakikalık mesaj zaman damgalarını güncelle
  spamData.messageTimestamps = spamData.messageTimestamps.filter(ts => now - ts < 60000);
  spamData.messageTimestamps.push(now);

  // Kısa sürede 3 mesaj arka arkaya kontrolü (10 saniye içinde 3 mesaj)
  const recentMessages = spamData.messageTimestamps.filter(ts => now - ts < 10000);
  if (recentMessages.length >= 3) {
    spamData.warnings++;
    let timeoutDuration = 5 * 60 * 1000; // 5 dakika
    if (spamData.warnings === 2) timeoutDuration = 30 * 60 * 1000; // 30 dakika
    if (spamData.warnings >= 3) timeoutDuration = 24 * 60 * 60 * 1000; // 24 saat
    try {
      const member = await message.guild.members.fetch(userId);
      await member.timeout(timeoutDuration, 'Spam/Arka arkaya mesaj');
      await channel.send(`⚠️ <@${userId}> kısa sürede çok fazla mesaj attığı için ${timeoutDuration/60000} dakika susturuldu. (Uyarı: ${spamData.warnings})`);
    } catch (error) { console.error('Timeout error:', error); }
    userSpamData.set(userId, spamData);
    return;
  }

  // Aynı mesajı tekrar atma kontrolü
  if (message.content === spamData.lastMessage) {
    await channel.send(`⚠️ <@${userId}> aynı mesajı tekrar atıyorsun, XP kazanamazsın!`);
    spamData.lastMessage = message.content;
    userSpamData.set(userId, spamData);
    return;
  }

  // 10 karakterden kısa mesajlara XP verme
  if (message.content.length < 10) {
    userSpamData.set(userId, spamData);
    return;
  }

  // XP ver ve son mesajı güncelle (optimized)
  await addXP(userId, MESSAGE_XP, 'message');
  spamData.lastMessage = message.content;
  userSpamData.set(userId, spamData);

  // Only process in our guild
  if (message.guildId !== GUILD_ID) return;

  // Prevent duplicate processing
  if (processedMessages.has(message.id)) return;
      processedMessages.set(message.id, true);

  // Performance monitoring
  messageCount++;
  if (messageCount % PERFORMANCE_LOG_INTERVAL === 0) {
    const now = Date.now();
    const rate = PERFORMANCE_LOG_INTERVAL / ((now - lastMessageTime) / 1000);
    const avgQueryTime = dbQueryCount > 0 ? (dbQueryTime / dbQueryCount).toFixed(2) : 0;
    const cacheHitRate = (cacheHitCount + cacheMissCount) > 0 ? 
      ((cacheHitCount / (cacheHitCount + cacheMissCount)) * 100).toFixed(1) : 0;
    
    console.log(`📊 Performance Stats:`);
    console.log(`  - Messages: ${messageCount} (${rate.toFixed(2)} msg/s)`);
    console.log(`  - DB Queries: ${dbQueryCount} (avg: ${avgQueryTime}ms)`);
    console.log(`  - Cache Hit Rate: ${cacheHitRate}% (${cacheHitCount}/${cacheHitCount + cacheMissCount})`);
    console.log(`  - Cache Size: ${userCache.size} users`);
    console.log(`  - Queue Size: ${xpUpdateQueue.size} pending updates`);
    
    lastMessageTime = now;
  }

  // Rate limiting check
  if (isRateLimited(userId)) {
    const userLimit = userRateLimits.get(userId);
    const now = Date.now();
    
    // Warn user if not warned recently
    if (now - userLimit.lastWarning > 60000) { // 1 minute
      userLimit.warnings++;
      userLimit.lastWarning = now;
      
      if (userLimit.warnings >= 3) {
        // Timeout user for 5 minutes
        try {
          const member = await message.guild.members.fetch(userId);
          await member.timeout(5 * 60 * 1000, 'Rate limit exceeded');
          await channel.send(`⚠️ <@${userId}> has been timed out for 5 minutes due to excessive messaging.`);
        } catch (error) {
          console.error('Error timing out user:', error);
        }
      } else {
        await channel.send(`⚠️ <@${userId}> Please slow down your messaging. Warning ${userLimit.warnings}/3`);
      }
    }
    
    return;
  }

  // Add message to rate limit tracking
  addMessageToRateLimit(userId);

  // Check if user is connected (use cache)
  let discordUser = getCachedUser(userId)?.userData;
  
  if (!discordUser) {
    const { data, error } = await supabase
      .from('discord_users')
      .select('discord_id, username')
      .eq('discord_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // User not connected - send connection message
      const embed = new EmbedBuilder()
        .setColor(0x4fd1c5)
        .setTitle('🔗 Connect Your Account to Unlock Rewards!')
        .setDescription(`Hi <@${userId}>! Connect your Discord account to your wallet and start earning exclusive rewards.`)
        .addFields(
          { name: 'Why Connect?', value: '• Earn XP for every message you send\n• Daily and weekly BBLP token bonuses\n• Level up and climb the leaderboard\n• Unlock special community perks and events', inline: false },
          { name: 'How to Connect', value: 'Go to [bblip.io/social-connections](https://bblip.io/social-connections) and link your wallet in seconds.', inline: false }
        )
        .setFooter({ text: 'BBLIP — Secure, rewarding, and community-driven.' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Connect Account')
            .setStyle(ButtonStyle.Link)
            .setURL(`${WEB_APP_URL}/social-connections`)
        );

      await channel.send({ embeds: [embed], components: [row] });
      return;
    }
    
    discordUser = data;
    setCachedUser(userId, data);
  }

  // Add XP for message (batch processing)
  addXP(userId, MESSAGE_XP, 'message');
});

// Handle new member joins
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  const channel = member.guild.systemChannel;
  if (!channel) return;

  // Check if user joined via invite (Discord invite tracking)
  if (DISCORD_INVITE_SYSTEM_ENABLED) {
    try {
      const inviteData = await processDiscordInvite(member.id);
      if (inviteData && inviteData.inviterId) {
        console.log(`🎯 Discord invite detected: ${inviteData.inviterId} invited ${member.id}`);
        
        // Check if inviter is connected to the platform
        const { data: inviterUser, error: inviterError } = await supabase
          .from('discord_users')
          .select('discord_id, username')
          .eq('discord_id', inviteData.inviterId)
          .eq('is_active', true)
          .single();
        
        if (inviterError || !inviterUser) {
          console.log(`⚠️ Inviter ${inviteData.inviterId} is not connected to the platform, skipping rewards`);
          return;
        }
        
        console.log(`✅ Inviter ${inviteData.inviterId} is connected, checking eligibility`);
        
        // Check if user is eligible for invite rewards
        console.log(`🔍 Checking eligibility for user: ${member.id}`);
        
        // Debug function'ı çağır
        const { data: debugData, error: debugError } = await supabase
          .rpc('debug_discord_invite_eligibility', { user_discord_id: member.id });
        
        console.log(`🔍 DEBUG Function result:`, {
          debugData: debugData,
          debugError: debugError
        });
        
        // Normal function'ı çağır
        const { data: eligibilityData, error: eligibilityError } = await supabase
          .rpc('check_discord_invite_eligibility', { user_discord_id: member.id });
        
        console.log(`🔍 Normal Eligibility check result:`, {
          data: eligibilityData,
          error: eligibilityError,
          rawResponse: eligibilityData
        });
        
        if (eligibilityError) {
          console.error('Error checking invite eligibility:', eligibilityError);
          return;
        }
        
        const eligibility = eligibilityData?.[0];
        console.log(`🔍 Parsed eligibility:`, eligibility);
        
        // Debug: Check if eligibility is undefined
        if (!eligibility) {
          console.log(`⚠️ Eligibility is undefined! eligibilityData:`, eligibilityData);
          console.log(`⚠️ Using debug function result instead`);
          
          // Use debug function result if normal function fails
          if (debugData && debugData[0]) {
            const debugEligibility = debugData[0];
            console.log(`🔍 Using debug eligibility:`, debugEligibility);
            
            if (debugEligibility.is_eligible) {
              console.log(`✅ User is eligible according to debug function`);
            } else {
              console.log(`⚠️ User is not eligible according to debug function`);
            }
          }
        }
        
        // Use debug function result if normal function fails
        let finalEligibility = eligibility;
        if (!eligibility && debugData && debugData[0]) {
          finalEligibility = debugData[0];
          console.log(`🔍 Using debug eligibility as fallback:`, finalEligibility);
        }
        
        if (!finalEligibility?.is_eligible) {
          console.log(`⚠️ User ${member.id} is not eligible for invite rewards. Previous inviter: ${finalEligibility?.previous_inviter}, joined: ${finalEligibility?.previous_join_date}`);
          
          // Send message to inviter about ineligible user
          const ineligibleEmbed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle('⚠️ Invite Not Eligible')
            .setDescription(`<@${member.id}> was previously invited by another user and is not eligible for rewards.`)
            .addFields(
              { name: 'Previous Inviter', value: `<@${finalEligibility?.previous_inviter}>`, inline: true },
              { name: 'Previous Join Date', value: finalEligibility?.previous_join_date ? new Date(finalEligibility.previous_join_date).toLocaleDateString() : 'Unknown', inline: true }
            )
            .setTimestamp();

          await channel.send({ embeds: [ineligibleEmbed] });
          return;
        }
        
        // Record the invite
        console.log(`🔍 Recording invite: ${member.id} invited by ${inviteData.inviterId} using code ${inviteData.inviteCode}`);
        
        const { error: recordError } = await supabase
          .rpc('record_discord_invite', {
            invited_discord_id: member.id,
            inviter_discord_id: inviteData.inviterId,
            invite_code: inviteData.inviteCode
          });
        
        if (recordError) {
          console.error('Error recording invite:', recordError);
          console.log(`⚠️ Error details:`, {
            code: recordError.code,
            message: recordError.message,
            details: recordError.details,
            hint: recordError.hint
          });
          console.log(`⚠️ Continuing with rewards despite database error`);
          // Continue with rewards even if database record fails
        } else {
          console.log(`✅ Invite recorded successfully for ${member.id}`);
        }
        
        console.log(`✅ Invite recorded for ${member.id} by ${inviteData.inviterId}`);
        
        // Award XP to inviter
        addXP(inviteData.inviterId, DISCORD_INVITE_XP_REWARD, 'discord_invite');
        
        // Award BBLP to inviter via referral_rewards table
        try {
          // Get inviter's user ID from wallet address
          const { data: inviterUser, error: userError } = await supabase
            .from('discord_users')
            .select('user_id')
            .eq('discord_id', inviteData.inviterId)
            .eq('is_active', true)
            .single();
          
          if (userError || !inviterUser?.user_id) {
            console.error('Error fetching inviter user ID:', userError);
          } else {
            // Get user ID from users table
            const { data: userData, error: walletError } = await supabase
              .from('users')
              .select('id')
              .eq('wallet_address', inviterUser.user_id)
              .single();
            
            if (walletError || !userData?.id) {
              console.error('Error fetching user ID from wallet address:', walletError);
            } else {
              // Add BBLP reward to referral_rewards table
              const { error: rewardError } = await supabase
                .from('referral_rewards')
                .insert({
                  referrer_id: userData.id,
                  referred_id: userData.id, // Use same user as placeholder since Discord invite doesn't have referred user
                  referrer_reward_amount: (DISCORD_INVITE_BBLP_REWARD * 10).toString(), // Convert to BBLP (1 BBLP = 0.1 USDT)
                  referred_reward_amount: '0',
                  reward_tier: 'tier1', // Default tier for Discord invites
                  created_at: new Date().toISOString()
                });
              
              if (rewardError) {
                console.error('Error adding BBLP reward:', rewardError);
              } else {
                console.log(`✅ Added ${DISCORD_INVITE_BBLP_REWARD} BBLP reward for ${inviteData.inviterId}`);
              }
            }
          }
        } catch (error) {
          console.error('Error processing BBLP reward:', error);
        }
        
        // Update invite count in database
        try {
          // First get current invite count
          const { data: currentData, error: fetchError } = await supabase
            .from('discord_activities')
            .select('invite_count')
            .eq('discord_id', inviteData.inviterId)
            .single();
          
          if (fetchError) {
            console.error('Error fetching current invite count:', fetchError);
            return;
          }
          
          const currentInviteCount = currentData?.invite_count || 0;
          const newInviteCount = currentInviteCount + 1;
          
          const { error: updateError } = await supabase
            .from('discord_activities')
            .update({ 
              invite_count: newInviteCount,
              updated_at: new Date().toISOString()
            })
            .eq('discord_id', inviteData.inviterId);
          
          if (updateError) {
            console.error('Error updating invite count:', updateError);
          } else {
            console.log(`✅ Updated invite count for ${inviteData.inviterId}: ${currentInviteCount} -> ${newInviteCount}`);
            
            // Update cache
            const cached = getCachedUser(inviteData.inviterId);
            if (cached) {
              if (cached.xpData) {
                cached.xpData.invite_count = newInviteCount;
              } else {
                // If xpData doesn't exist in cache, create it
                cached.xpData = { invite_count: newInviteCount };
              }
              setCachedUser(inviteData.inviterId, cached.userData, cached.xpData);
              console.log(`✅ Updated cache for ${inviteData.inviterId}: invite_count = ${newInviteCount}`);
            }
          }
        } catch (error) {
          // Don't log foreign key constraint errors as they're expected for unconnected users
          if (error.code === '23503' && error.message.includes('discord_users')) {
            console.log(`⚠️ Inviter ${inviteData.inviterId} not connected, skipping invite count update`);
          } else {
            console.error('Error updating invite count:', error);
          }
        }
        
        // Send congratulation message to inviter
        const inviterEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🎉 Invite Reward!')
          .setDescription(`Congratulations <@${inviteData.inviterId}>! You successfully invited <@${member.id}> to our server!`)
          .addFields(
            { name: 'Reward Earned', value: `+${DISCORD_INVITE_XP_REWARD} XP`, inline: true },
            { name: 'BBLP Reward', value: `+${DISCORD_INVITE_BBLP_REWARD} BBLP`, inline: true }
          )
          .setTimestamp();

        await channel.send({ embeds: [inviterEmbed] });
      }
    } catch (error) {
      console.error('Error processing Discord invite:', error);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🎉 Welcome to BBLIP Community!')
    .setDescription(`Welcome <@${member.id}> to our Discord server!`)
    .addFields(
      { name: 'Getting Started', value: 'Connect your Discord account to your wallet to start earning XP and rewards!' },
      { name: 'Features', value: '• Earn XP for messages and reactions\n• Daily BBLP token rewards\n• Level progression system\n• Community leaderboards' }
    )
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Connect Account')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_APP_URL}/social-connections`)
    );

  await channel.send({ embeds: [embed], components: [row] });
});

// Handle member leave
client.on(Events.GuildMemberRemove, async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  console.log(`👋 Member left: ${member.id} (${member.user.username})`);
  
  // Mark user as left in invite tracking
  try {
    const { error } = await supabase
      .rpc('mark_discord_user_left', { user_discord_id: member.id });
    
    if (error) {
      console.error('Error marking user as left:', error);
    } else {
      console.log(`✅ User ${member.id} marked as left in invite tracking`);
    }
  } catch (error) {
    console.error('Error in leave handler:', error);
  }
});

// Bot commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  switch (commandName) {
    case 'xp':
      await handleXPCommand(interaction);
      break;
    case 'leaderboard':
      await handleLeaderboardCommand(interaction);
      break;
    case 'invite':
      await handleInviteCommand(interaction);
      break;
    case 'help':
      await handleHelpCommand(interaction);
      break;
  }
});

// XP command
async function handleXPCommand(interaction) {
  const userId = interaction.user.id;

  // Check if user is connected (use cache)
  let discordUser = getCachedUser(userId)?.userData;
  
  if (!discordUser) {
    const { data, error } = await supabase
      .from('discord_users')
      .select('discord_id, username')
      .eq('discord_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('❌ Account Not Connected')
        .setDescription('You need to connect your Discord account to your wallet first.')
        .addFields(
          { name: 'How to connect:', value: 'Visit our website and connect your wallet, then link your Discord account.' }
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Connect Account')
            .setStyle(ButtonStyle.Link)
            .setURL(`${WEB_APP_URL}/social-connections`)
        );

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }
    
    discordUser = data;
    setCachedUser(userId, data);
  }

  // Get user stats (use cache)
  let activity = getCachedUser(userId)?.xpData;
  
  if (!activity) {
    const { data, error } = await supabase
      .from('discord_activities')
      .select('total_xp, current_level, invite_count')
      .eq('discord_id', userId)
      .single();

    if (error) {
      await interaction.reply({ content: '❌ Error fetching your stats.', ephemeral: true });
      return;
    }
    
    activity = data || { total_xp: 0, current_level: 1, invite_count: 0 };
    const cached = getCachedUser(userId);
    if (cached) {
      cached.xpData = activity;
      setCachedUser(userId, cached.userData, cached.xpData);
    }
  } else {
    // If cache exists but invite_count is missing, fetch from database
    if (activity.invite_count === undefined) {
      const { data, error } = await supabase
        .from('discord_activities')
        .select('invite_count')
        .eq('discord_id', userId)
        .single();

      if (!error && data) {
        activity.invite_count = data.invite_count || 0;
        const cached = getCachedUser(userId);
        if (cached) {
          cached.xpData = activity;
          setCachedUser(userId, cached.userData, cached.xpData);
        }
      }
    }
  }

  const currentLevel = getCurrentLevel(activity.total_xp);
  const nextLevel = getNextLevel(currentLevel);
  const progressToNext = activity.total_xp - currentLevel.minXP;
  const maxXPForLevel = currentLevel.maxXP - currentLevel.minXP;
  const progressPercentage = Math.round((progressToNext / maxXPForLevel) * 100);

  // Debug log
  console.log(`🔍 XP Command Debug for ${userId}:`, {
    total_xp: activity.total_xp,
    current_level: activity.current_level,
    invite_count: activity.invite_count,
    from_cache: !!getCachedUser(userId)?.xpData
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`📊 XP Stats for ${discordUser.username}`)
    .addFields(
      { name: 'Current Level', value: currentLevel.name, inline: true },
      { name: 'Total XP', value: activity.total_xp.toString(), inline: true },
      { name: 'Daily Reward', value: `${currentLevel.reward} BBLP`, inline: true },
      { name: 'Invites', value: (activity.invite_count || 0).toString(), inline: true }
    )
    .setTimestamp();

  if (nextLevel) {
    embed.addFields(
      { name: 'Progress to Next Level', value: `${progressPercentage}% (${progressToNext}/${maxXPForLevel} XP)`, inline: false }
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Leaderboard command (direct query without RPC)
async function handleLeaderboardCommand(interaction) {
  try {
    // Direct query to avoid RPC function issues
    const { data: leaderboard, error } = await supabase
      .from('discord_activities')
      .select(`
        total_xp,
        discord_users!inner(username)
      `)
      .order('total_xp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      await interaction.reply({ content: '❌ Error fetching leaderboard.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🏆 Discord Leaderboard')
      .setDescription('Top 10 users by XP')
      .setTimestamp();

    leaderboard.forEach((entry, index) => {
      const level = getCurrentLevel(entry.total_xp);
      embed.addFields({
        name: `#${index + 1} ${entry.discord_users.username}`,
        value: `Level: ${level.name} | XP: ${entry.total_xp}`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in leaderboard command:', error);
    await interaction.reply({ content: '❌ Error fetching leaderboard.', ephemeral: true });
  }
}

// Connect command
async function handleConnectCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🔗 Connect Your Account')
    .setDescription('Connect your Discord account to your wallet to start earning XP and rewards!')
    .addFields(
      { name: 'Benefits', value: '• Earn XP for messages and reactions\n• Daily BBLP token rewards\n• Level progression\n• Community leaderboards' },
      { name: 'How to connect', value: '1. Visit our website\n2. Connect your wallet\n3. Link your Discord account' }
    )
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Connect Account')
        .setStyle(ButtonStyle.Link)
        .setURL(`${WEB_APP_URL}/social-connections`)
    );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Invite command
async function handleInviteCommand(interaction) {
  const userId = interaction.user.id;

  // Check if user is connected and get their data (including invite_link)
  let discordUser = getCachedUser(userId)?.userData;
  
  if (!discordUser) {
    const { data, error } = await supabase
      .from('discord_users')
      .select('discord_id, username, invite_link')
      .eq('discord_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('❌ Account Not Connected')
        .setDescription('You need to connect your Discord account to your wallet first.')
        .addFields(
          { name: 'How to connect:', value: 'Visit our website and connect your wallet, then link your Discord account.' }
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Connect Account')
            .setStyle(ButtonStyle.Link)
            .setURL(`${WEB_APP_URL}/social-connections`)
        );

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }
    
    discordUser = data;
    setCachedUser(userId, data);
  }

  try {
    let inviteLink = discordUser.invite_link;
    let inviteCode = null;
    let isNewInvite = false;

    // Check if user already has a saved invite link
    if (inviteLink) {
      // Extract invite code from the link
      inviteCode = inviteLink.split('/').pop();
      console.log(`✅ Found existing invite link for user ${userId}: ${inviteCode}`);
      
      // Verify the invite still exists on Discord
      try {
        const invites = await interaction.guild.invites.fetch();
        const existingInvite = invites.get(inviteCode);
        
        if (existingInvite) {
          console.log(`✅ Verified existing invite ${inviteCode} is still valid`);
        } else {
          console.log(`⚠️ Saved invite ${inviteCode} not found on Discord, will create new one`);
          inviteLink = null;
          inviteCode = null;
        }
      } catch (error) {
        console.log(`⚠️ Error verifying invite ${inviteCode}, will create new one:`, error.message);
        inviteLink = null;
        inviteCode = null;
      }
    }

    // Create new invite if needed
    if (!inviteLink) {
      console.log(`🔄 Creating new invite for user ${userId}`);
      
      // Check if user already has a custom invite on Discord
      let existingInvite = null;
      const invites = await interaction.guild.invites.fetch();
      
      // Look for existing custom invite for this user
      for (const [code, invite] of invites) {
        if (code.startsWith(`bblip-${userId}`)) {
          existingInvite = invite;
          break;
        }
      }
      
      let invite;
      if (existingInvite) {
        // Use existing invite
        invite = existingInvite;
        inviteCode = invite.code;
        console.log(`✅ Found existing Discord invite for user ${userId}: ${inviteCode}`);
      } else {
        // Create new custom invite
        const customInviteCode = `bblip-${userId}`;
        
        try {
          invite = await interaction.guild.invites.create(interaction.channel, {
            maxAge: 0, // Never expires
            maxUses: 0, // Unlimited uses
            unique: true,
            code: customInviteCode,
            reason: `Invite created by ${discordUser.username}`
          });
          inviteCode = invite.code;
          console.log(`✅ Created new custom invite for user ${userId}: ${inviteCode}`);
        } catch (error) {
          console.log(`❌ Custom invite code ${customInviteCode} failed:`, error.message);
          // Fallback to random code
          invite = await interaction.guild.invites.create(interaction.channel, {
            maxAge: 0, // Never expires
            maxUses: 0, // Unlimited uses
            unique: true,
            reason: `Invite created by ${discordUser.username}`
          });
          inviteCode = invite.code;
          console.log(`✅ Created fallback invite for user ${userId}: ${inviteCode}`);
        }
      }

      // Create invite link
      inviteLink = `https://discord.gg/${inviteCode}`;
      isNewInvite = true;

      // Track this invite with the actual inviter
      discordInviteTracking.set(inviteCode, {
        inviterId: userId,
        uses: invite.uses || 0,
        createdAt: Date.now()
      });

      // Track custom invite mapping (both custom codes and fallback codes)
      if (inviteCode.startsWith('bblip-')) {
        customInviteTracking.set(inviteCode, {
          userId: userId,
          inviteCode: inviteCode,
          createdAt: Date.now()
        });
        console.log(`🔗 Custom invite tracking set: ${inviteCode} -> User: ${userId}`);
      } else {
        // Track fallback invites as well
        customInviteTracking.set(inviteCode, {
          userId: userId,
          inviteCode: inviteCode,
          createdAt: Date.now()
        });
        console.log(`🔗 Fallback invite tracking set: ${inviteCode} -> User: ${userId}`);
      }

      // Save invite link to database
      try {
        const { error: updateError } = await supabase
          .from('discord_users')
          .update({ 
            invite_link: inviteLink,
            updated_at: new Date().toISOString()
          })
          .eq('discord_id', userId);

        if (updateError) {
          console.error('Error saving invite link to database:', updateError);
        } else {
          console.log(`✅ Saved invite link to database for user ${userId}: ${inviteLink}`);
          
          // Update cache
          const cached = getCachedUser(userId);
          if (cached && cached.userData) {
            cached.userData.invite_link = inviteLink;
            setCachedUser(userId, cached.userData, cached.xpData);
          }
        }
      } catch (error) {
        console.error('Error updating database with invite link:', error);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🔗 Your Invite Link')
      .setDescription(`Here's your personal invite link for the BBLIP Discord server!`)
      .addFields(
        { name: 'Invite Link', value: inviteLink, inline: false },
        { name: 'Rewards', value: `• +${DISCORD_INVITE_XP_REWARD} XP per invite\n• +${DISCORD_INVITE_BBLP_REWARD} BBLP per invite`, inline: false },
        { name: 'How it works', value: 'Share this link with friends. When they join, you\'ll automatically get rewarded!', inline: false }
      )
      .setTimestamp();

    if (isNewInvite) {
      embed.addFields(
        { name: 'Status', value: '🆕 New invite created and saved!', inline: false }
      );
    } else {
      embed.addFields(
        { name: 'Status', value: '✅ Using your existing invite link', inline: false }
      );
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🔗 Copy Invite Link')
          .setStyle(ButtonStyle.Link)
          .setURL(inviteLink)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  } catch (error) {
    console.error('Error creating invite:', error);
    await interaction.reply({ 
      content: '❌ Error creating invite link. Please try again later.', 
      ephemeral: true 
    });
  }
}

// Help command
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🤖 BBLIP Discord Bot — Help & Features')
    .setDescription('Welcome! Here are the main commands and features you can use:')
    .addFields(
      { name: '/xp', value: 'Check your current XP, level, and progress.', inline: true },
      { name: '/leaderboard', value: 'See the top users by XP in the server.', inline: true },
      { name: '/invite', value: 'Get your personal invite link and earn rewards for inviting friends.', inline: true },
      { name: '/help', value: 'Show this help message.', inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: 'XP & Level System', value: '• Send messages to earn XP\n• Daily activity and weekly streak bonuses\n• Level up to earn more BBLP token rewards', inline: false },
      { name: 'Invite Rewards', value: '• Share your invite link\n• Earn XP and BBLP when friends join\n• Track your invites easily', inline: false },
      { name: 'How to Connect', value: 'Go to [bblip.io/social-connections](https://bblip.io/social-connections) to link your Discord and wallet for full rewards.', inline: false }
    )
    .setFooter({ text: 'BBLIP — Secure, rewarding, and community-driven.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Cache management command
async function handleCacheCommand(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin (you can customize this check)
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'clear':
      await clearAllCache(interaction);
      break;
    case 'stats':
      await showCacheStats(interaction);
      break;
    case 'user':
      await clearUserCache(interaction);
      break;
    default:
      await interaction.reply({ 
        content: '❌ Invalid subcommand. Use `/cache stats` or `/cache clear`', 
        ephemeral: true 
      });
  }
}

async function clearAllCache(interaction) {
  try {
    // Clear user cache
    const userCacheSize = userCache.size;
    userCache.clear();
    
    // Clear processed messages/reactions
    const processedMessagesSize = processedMessages.size;
    const processedReactionsSize = processedReactions.size;
    processedMessages.clear();
    processedReactions.clear();
    
    // Clear invite tracking
    const inviteTrackingSize = discordInviteTracking.size;
    const customInviteTrackingSize = customInviteTracking.size;
    discordInviteTracking.clear();
    customInviteTracking.clear();
    
    // Clear XP update queue
    const xpQueueSize = xpUpdateQueue.size;
    xpUpdateQueue.clear();
    
    // Reset performance counters
    dbQueryCount = 0;
    dbQueryTime = 0;
    cacheHitCount = 0;
    cacheMissCount = 0;
    
    // Re-initialize Discord invite tracking
    await initializeDiscordInviteTracking();
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🧹 Cache Cleared Successfully')
      .setDescription('All bot caches have been cleared and reset.')
      .addFields(
        { name: 'User Cache', value: `${userCacheSize} users cleared`, inline: true },
        { name: 'Processed Messages', value: `${processedMessagesSize} messages cleared`, inline: true },
        { name: 'Processed Reactions', value: `${processedReactionsSize} reactions cleared`, inline: true },
        { name: 'Invite Tracking', value: `${inviteTrackingSize} invites cleared`, inline: true },
        { name: 'Custom Invites', value: `${customInviteTrackingSize} custom invites cleared`, inline: true },
        { name: 'XP Queue', value: `${xpQueueSize} pending updates cleared`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🧹 Cache cleared by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    await interaction.reply({ 
      content: '❌ Error clearing cache. Check console for details.', 
      ephemeral: true 
    });
  }
}

async function showCacheStats(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('📊 Cache Statistics')
    .setDescription('Current cache usage and performance metrics')
    .addFields(
      { name: 'User Cache', value: `${userCache.size} users cached`, inline: true },
      { name: 'Processed Messages', value: `${processedMessages.size} messages tracked`, inline: true },
      { name: 'Processed Reactions', value: `${processedReactions.size} reactions tracked`, inline: true },
      { name: 'Invite Tracking', value: `${discordInviteTracking.size} invites tracked`, inline: true },
      { name: 'Custom Invites', value: `${customInviteTracking.size} custom invites tracked`, inline: true },
      { name: 'XP Queue', value: `${xpUpdateQueue.size} pending updates`, inline: true },
      { name: 'Cache Hit Rate', value: `${(cacheHitCount + cacheMissCount) > 0 ? ((cacheHitCount / (cacheHitCount + cacheMissCount)) * 100).toFixed(1) : 0}%`, inline: true },
      { name: 'DB Queries', value: `${dbQueryCount} queries (avg: ${dbQueryCount > 0 ? (dbQueryTime / dbQueryCount).toFixed(2) : 0}ms)`, inline: true },
      { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function clearUserCache(interaction) {
  const targetUserId = interaction.options.getString('user_id');
  
  if (!targetUserId) {
    await interaction.reply({ 
      content: '❌ Please provide a user ID to clear their cache.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    const wasCached = userCache.has(targetUserId);
    userCache.delete(targetUserId);
    
    const embed = new EmbedBuilder()
      .setColor(wasCached ? 0x00ff00 : 0xffa500)
      .setTitle('👤 User Cache Cleared')
      .setDescription(`Cache for user <@${targetUserId}> has been cleared.`)
      .addFields(
        { name: 'User ID', value: targetUserId, inline: true },
        { name: 'Was Cached', value: wasCached ? 'Yes' : 'No', inline: true },
        { name: 'Remaining Users', value: `${userCache.size} users in cache`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`👤 User cache cleared for ${targetUserId} by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error clearing user cache:', error);
    await interaction.reply({ 
      content: '❌ Error clearing user cache.', 
      ephemeral: true 
    });
  }
}

// Admin command for managing invite records
async function handleAdminCommand(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'delete_invite':
      await deleteInviteRecord(interaction);
      break;
    case 'list_invites':
      await listInviteRecords(interaction);
      break;
    case 'reset_user':
      await resetUserInviteStatus(interaction);
      break;
    case 'clear_invites':
      await clearAllInvites(interaction);
      break;
    case 'reset_invite_tracking':
      await resetInviteTracking(interaction);
      break;
    case 'debug_invite':
      await debugInviteEligibility(interaction);
      break;
    case 'batch_status':
      await showBatchStatus(interaction);
      break;
    case 'list_saved_invites':
      await listSavedInviteLinks(interaction);
      break;
    case 'clear_saved_invite':
      await clearSavedInviteLink(interaction);
      break;
    case 'sync_invites':
      await syncInviteLinks(interaction);
      break;
    case 'debug_tracking':
      await debugTrackingStatus(interaction);
      break;
    default:
      await interaction.reply({ 
        content: '❌ Invalid subcommand. Use `/admin list_invites`, `/admin delete_invite`, `/admin list_saved_invites`, `/admin clear_saved_invite`, `/admin sync_invites`, or `/admin debug_tracking`', 
        ephemeral: true 
      });
  }
}

async function deleteInviteRecord(interaction) {
  const targetUserId = interaction.options.getString('user_id');
  
  if (!targetUserId) {
    await interaction.reply({ 
      content: '❌ Please provide a user ID to delete their invite record.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Delete from database
    const { error } = await supabase
      .from('discord_invited_users')
      .delete()
      .eq('discord_id', targetUserId);
    
    if (error) {
      console.error('Error deleting invite record:', error);
      await interaction.reply({ 
        content: '❌ Error deleting invite record from database.', 
        ephemeral: true 
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🗑️ Invite Record Deleted')
      .setDescription(`Invite record for user <@${targetUserId}> has been deleted.`)
      .addFields(
        { name: 'User ID', value: targetUserId, inline: true },
        { name: 'Status', value: 'Deleted from database', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🗑️ Invite record deleted for ${targetUserId} by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in deleteInviteRecord:', error);
    await interaction.reply({ 
      content: '❌ Error deleting invite record.', 
      ephemeral: true 
    });
  }
}

async function listInviteRecords(interaction) {
  try {
    const { data: records, error } = await supabase
      .from('discord_invited_users')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching invite records:', error);
      await interaction.reply({ 
        content: '❌ Error fetching invite records.', 
        ephemeral: true 
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📋 Recent Invite Records')
      .setDescription(`Showing last ${records.length} invite records`)
      .setTimestamp();

    records.forEach((record, index) => {
      embed.addFields({
        name: `${index + 1}. ${record.discord_id}`,
        value: `Inviter: <@${record.inviter_discord_id}>\nJoined: ${new Date(record.joined_at).toLocaleDateString()}\nActive: ${record.is_active ? 'Yes' : 'No'}\nReward: ${record.reward_claimed ? 'Claimed' : 'Not Claimed'}`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error('Error in listInviteRecords:', error);
    await interaction.reply({ 
      content: '❌ Error listing invite records.', 
      ephemeral: true 
    });
  }
}

async function resetUserInviteStatus(interaction) {
  const targetUserId = interaction.options.getString('user_id');
  
  if (!targetUserId) {
    await interaction.reply({ 
      content: '❌ Please provide a user ID to reset their invite status.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Reset user to eligible status (mark as left 31 days ago)
    const { error } = await supabase
      .from('discord_invited_users')
      .update({
        left_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('discord_id', targetUserId);
    
    if (error) {
      console.error('Error resetting user invite status:', error);
      await interaction.reply({ 
        content: '❌ Error resetting user invite status.', 
        ephemeral: true 
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🔄 User Invite Status Reset')
      .setDescription(`User <@${targetUserId}> can now be invited again.`)
      .addFields(
        { name: 'User ID', value: targetUserId, inline: true },
        { name: 'Status', value: 'Reset to eligible', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🔄 User invite status reset for ${targetUserId} by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in resetUserInviteStatus:', error);
    await interaction.reply({ 
      content: '❌ Error resetting user invite status.', 
      ephemeral: true 
    });
  }
}

// Clear all Discord invites (DANGEROUS - requires confirmation)
async function clearAllInvites(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }

  const confirmation = interaction.options.getString('confirmation');
  
  if (confirmation !== 'YES_DELETE_ALL') {
    await interaction.reply({ 
      content: '⚠️ **DANGEROUS OPERATION** ⚠️\n\n' +
               'This will delete ALL Discord invite links from your server!\n\n' +
               'To confirm, use:\n' +
               '`/admin clear_invites confirmation:YES_DELETE_ALL`\n\n' +
               '⚠️ This action cannot be undone!',
      ephemeral: true 
    });
    return;
  }
  
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      await interaction.reply({ 
        content: '❌ Guild not found.', 
        ephemeral: true 
      });
      return;
    }

    // Get all invites
    const invites = await guild.invites.fetch();
    const inviteCount = invites.size;
    
    if (inviteCount === 0) {
      await interaction.reply({ 
        content: 'ℹ️ No invite links found to delete.', 
        ephemeral: true 
      });
      return;
    }

    // Delete all invites
    let deletedCount = 0;
    for (const [code, invite] of invites) {
      try {
        await invite.delete('Admin command: clear_all_invites');
        deletedCount++;
        console.log(`🗑️ Deleted invite: ${code}`);
      } catch (error) {
        console.error(`❌ Failed to delete invite ${code}:`, error);
      }
    }

    // Clear bot's tracking cache
    discordInviteTracking.clear();
    customInviteTracking.clear();
    
    // Re-initialize tracking (will be empty now)
    await initializeDiscordInviteTracking();

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🗑️ All Invite Links Deleted')
      .setDescription(`Successfully deleted ${deletedCount}/${inviteCount} invite links.`)
      .addFields(
        { name: 'Deleted Count', value: deletedCount.toString(), inline: true },
        { name: 'Total Found', value: inviteCount.toString(), inline: true },
        { name: 'Status', value: 'All invites cleared', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🗑️ All invite links deleted by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in clearAllInvites:', error);
    await interaction.reply({ 
      content: '❌ Error deleting invite links.', 
      ephemeral: true 
    });
  }
}

// Reset bot's invite tracking cache
async function resetInviteTracking(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Clear bot's tracking cache
    const oldTrackingSize = discordInviteTracking.size;
    const oldCustomSize = customInviteTracking.size;
    
    discordInviteTracking.clear();
    customInviteTracking.clear();
    
    // Re-initialize tracking
    await initializeDiscordInviteTracking();
    
    const newTrackingSize = discordInviteTracking.size;
    const newCustomSize = customInviteTracking.size;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🔄 Invite Tracking Reset')
      .setDescription('Bot invite tracking cache has been reset and reloaded.')
      .addFields(
        { name: 'Old Tracking Size', value: oldTrackingSize.toString(), inline: true },
        { name: 'New Tracking Size', value: newTrackingSize.toString(), inline: true },
        { name: 'Old Custom Size', value: oldCustomSize.toString(), inline: true },
        { name: 'New Custom Size', value: newCustomSize.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🔄 Invite tracking reset by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in resetInviteTracking:', error);
    await interaction.reply({ 
      content: '❌ Error resetting invite tracking.', 
      ephemeral: true 
    });
  }
}

// Debug invite eligibility for a specific user
async function debugInviteEligibility(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }

  const targetUserId = interaction.options.getString('user_id');
  
  if (!targetUserId) {
    await interaction.reply({ 
      content: '❌ Please provide a user ID to debug.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Check database directly
    const { data: dbRecord, error: dbError } = await supabase
      .from('discord_invited_users')
      .select('*')
      .eq('discord_id', targetUserId)
      .single();
    
    // Check all records in table
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('discord_invited_users')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(5);
    
    // Check eligibility function
    const { data: eligibilityData, error: eligibilityError } = await supabase
      .rpc('check_discord_invite_eligibility', { user_discord_id: targetUserId });
    
    // Check bot cache
    const botCacheData = discordInviteTracking.get(targetUserId);
    const customCacheData = customInviteTracking.get(targetUserId);
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🔍 Invite Eligibility Debug')
      .setDescription(`Debug information for user <@${targetUserId}>`)
      .addFields(
        { name: 'User ID', value: targetUserId, inline: true },
        { name: 'Database Record', value: dbRecord ? 'Found' : 'Not Found', inline: true },
        { name: 'Database Error', value: dbError ? dbError.message : 'None', inline: true },
        { name: 'All Records Count', value: allRecords ? allRecords.length.toString() : 'Error', inline: true },
        { name: 'Eligibility Function', value: eligibilityError ? eligibilityError.message : 'Success', inline: true },
        { name: 'Eligibility Result', value: eligibilityData?.[0]?.is_eligible ? 'Eligible' : 'Not Eligible', inline: true },
        { name: 'Previous Inviter', value: eligibilityData?.[0]?.previous_inviter || 'None', inline: true },
        { name: 'Bot Cache Data', value: botCacheData ? 'Found' : 'Not Found', inline: true },
        { name: 'Custom Cache Data', value: customCacheData ? 'Found' : 'Not Found', inline: true }
      )
      .setTimestamp();

    if (dbRecord) {
      embed.addFields({
        name: 'Database Record Details',
        value: `Inviter: ${dbRecord.inviter_discord_id}\nJoined: ${new Date(dbRecord.joined_at).toLocaleDateString()}\nActive: ${dbRecord.is_active}\nReward Claimed: ${dbRecord.reward_claimed}`,
        inline: false
      });
    }
    
    if (allRecords && allRecords.length > 0) {
      let allRecordsText = '';
      allRecords.forEach((record, index) => {
        allRecordsText += `${index + 1}. ${record.discord_id} (inviter: ${record.inviter_discord_id})\n`;
      });
      embed.addFields({
        name: 'All Records in Table',
        value: allRecordsText,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🔍 Debug invite eligibility for ${targetUserId} by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in debugInviteEligibility:', error);
    await interaction.reply({ 
      content: '❌ Error debugging invite eligibility.', 
      ephemeral: true 
    });
  }
}

// List saved invite links from database
async function listSavedInviteLinks(interaction) {
  try {
    const { data: savedInvites, error } = await supabase
      .from('discord_users')
      .select('discord_id, username, invite_link, updated_at')
      .not('invite_link', 'is', null)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching saved invite links:', error);
      await interaction.reply({ 
        content: '❌ Error fetching saved invite links.', 
        ephemeral: true 
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('📋 Saved Invite Links')
      .setDescription(`Showing last ${savedInvites.length} saved invite links`)
      .setTimestamp();

    if (savedInvites && savedInvites.length > 0) {
      savedInvites.forEach((invite, index) => {
        const inviteCode = invite.invite_link.split('/').pop();
        embed.addFields({
          name: `${index + 1}. ${invite.username} (${invite.discord_id})`,
          value: `Invite: \`${inviteCode}\`\nLink: ${invite.invite_link}\nUpdated: ${new Date(invite.updated_at).toLocaleDateString()}`,
          inline: false
        });
      });
    } else {
      embed.setDescription('No saved invite links found');
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error('Error in listSavedInviteLinks:', error);
    await interaction.reply({ 
      content: '❌ Error listing saved invite links.', 
      ephemeral: true 
    });
  }
}

// Clear saved invite link for a user
async function clearSavedInviteLink(interaction) {
  const targetUserId = interaction.options.getString('user_id');
  
  if (!targetUserId) {
    await interaction.reply({ 
      content: '❌ Please provide a user ID to clear their saved invite link.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Get current invite link
    const { data: currentData, error: fetchError } = await supabase
      .from('discord_users')
      .select('invite_link, username')
      .eq('discord_id', targetUserId)
      .single();
    
    if (fetchError || !currentData) {
      await interaction.reply({ 
        content: '❌ User not found or no saved invite link.', 
        ephemeral: true 
      });
      return;
    }
    
    // Clear the invite link
    const { error: updateError } = await supabase
      .from('discord_users')
      .update({ 
        invite_link: null,
        updated_at: new Date().toISOString()
      })
      .eq('discord_id', targetUserId);
    
    if (updateError) {
      console.error('Error clearing saved invite link:', updateError);
      await interaction.reply({ 
        content: '❌ Error clearing saved invite link.', 
        ephemeral: true 
      });
      return;
    }
    
    // Clear from cache
    const cached = getCachedUser(targetUserId);
    if (cached) {
      cached.userData.invite_link = null;
      setCachedUser(targetUserId, cached.userData, cached.xpData);
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🗑️ Saved Invite Link Cleared')
      .setDescription(`Saved invite link for user <@${targetUserId}> has been cleared.`)
      .addFields(
        { name: 'User', value: `<@${targetUserId}> (${currentData.username})`, inline: true },
        { name: 'Previous Link', value: currentData.invite_link || 'None', inline: true },
        { name: 'Status', value: 'Cleared from database and cache', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🗑️ Saved invite link cleared for ${targetUserId} by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in clearSavedInviteLink:', error);
    await interaction.reply({ 
      content: '❌ Error clearing saved invite link.', 
      ephemeral: true 
    });
  }
}

// Debug tracking status
async function debugTrackingStatus(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🔍 Tracking Status Debug')
      .setDescription('Current tracking system status')
      .addFields(
        { name: 'Discord Tracking Size', value: discordInviteTracking.size.toString(), inline: true },
        { name: 'Custom Tracking Size', value: customInviteTracking.size.toString(), inline: true },
        { name: 'Bot User ID', value: client.user.id, inline: true }
      )
      .setTimestamp();

    // Show first 5 entries from each tracking map
    let discordTrackingText = '';
    let customTrackingText = '';
    
    let count = 0;
    for (const [code, data] of discordInviteTracking) {
      if (count < 5) {
        discordTrackingText += `${code}: ${data.inviterId} (${data.uses} uses)\n`;
        count++;
      }
    }
    
    count = 0;
    for (const [code, data] of customInviteTracking) {
      if (count < 5) {
        customTrackingText += `${code}: ${data.userId}\n`;
        count++;
      }
    }
    
    if (discordTrackingText) {
      embed.addFields({
        name: 'Discord Tracking (First 5)',
        value: discordTrackingText,
        inline: false
      });
    }
    
    if (customTrackingText) {
      embed.addFields({
        name: 'Custom Tracking (First 5)',
        value: customTrackingText,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error('Error in debugTrackingStatus:', error);
    await interaction.reply({ 
      content: '❌ Error showing tracking status.', 
      ephemeral: true 
    });
  }
}

// Sync invite links between Discord and database
async function syncInviteLinks(interaction) {
  try {
    console.log('🔄 Starting invite link sync...');
    
    // Get all Discord invites
    const discordInvites = await client.guilds.cache.get(GUILD_ID)?.invites.fetch();
    
    if (!discordInvites) {
      await interaction.reply({ 
        content: '❌ Could not fetch Discord invites.', 
        ephemeral: true 
      });
      return;
    }
    
    // Get all saved invite links from database
    const { data: savedInvites, error: dbError } = await supabase
      .from('discord_users')
      .select('discord_id, invite_link')
      .not('invite_link', 'is', null)
      .eq('is_active', true);
    
    if (dbError) {
      console.error('Error fetching saved invites:', dbError);
      await interaction.reply({ 
        content: '❌ Error fetching saved invite links.', 
        ephemeral: true 
      });
      return;
    }
    
    let syncedCount = 0;
    let invalidCount = 0;
    let missingCount = 0;
    
    // Check each saved invite
    for (const savedInvite of savedInvites || []) {
      if (savedInvite.invite_link) {
        const inviteCode = savedInvite.invite_link.split('/').pop();
        
        if (discordInvites.has(inviteCode)) {
          // Valid invite, sync to tracking
          const discordInvite = discordInvites.get(inviteCode);
          
          discordInviteTracking.set(inviteCode, {
            inviterId: savedInvite.discord_id,
            uses: discordInvite.uses || 0,
            createdAt: discordInvite.createdAt?.getTime() || Date.now()
          });
          
          if (inviteCode.startsWith('bblip-')) {
            customInviteTracking.set(inviteCode, {
              userId: savedInvite.discord_id,
              inviteCode: inviteCode,
              createdAt: discordInvite.createdAt?.getTime() || Date.now()
            });
          }
          
          syncedCount++;
        } else {
          // Invalid invite, mark for cleanup
          invalidCount++;
          console.log(`⚠️ Invalid saved invite: ${inviteCode} for user ${savedInvite.discord_id}`);
        }
      }
    }
    
    // Check for Discord invites not in database
    for (const [code, invite] of discordInvites) {
      const foundInDb = savedInvites?.find(saved => saved.invite_link?.includes(code));
      if (!foundInDb && invite.inviter?.id === client.user.id) {
        missingCount++;
        console.log(`⚠️ Discord invite not in database: ${code}`);
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🔄 Invite Link Sync Complete')
      .setDescription('Sync between Discord and database completed.')
      .addFields(
        { name: 'Synced Invites', value: syncedCount.toString(), inline: true },
        { name: 'Invalid Saved', value: invalidCount.toString(), inline: true },
        { name: 'Missing in DB', value: missingCount.toString(), inline: true },
        { name: 'Total Discord', value: discordInvites.size.toString(), inline: true },
        { name: 'Total Saved', value: (savedInvites?.length || 0).toString(), inline: true },
        { name: 'Bot Tracking', value: discordInviteTracking.size.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🔄 Invite sync completed by admin ${interaction.user.tag}: ${syncedCount} synced, ${invalidCount} invalid, ${missingCount} missing`);
    
  } catch (error) {
    console.error('Error in syncInviteLinks:', error);
    await interaction.reply({ 
      content: '❌ Error syncing invite links.', 
      ephemeral: true 
    });
  }
}

// Show batch processing status
async function showBatchStatus(interaction) {
  const userId = interaction.user.id;
  
  // Check if user is admin
  const isAdmin = interaction.member.permissions.has('Administrator') || 
                  interaction.member.roles.cache.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    await interaction.reply({ 
      content: '❌ You need administrator permissions to use this command.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // Get batch queue status
    const queueSize = xpUpdateQueue.size;
    const queueEntries = Array.from(xpUpdateQueue.entries());
    
    // Get batch processing status
    const isBatchRunning = batchProcessingInterval !== null;
    const batchInterval = BATCH_INTERVAL / 1000; // Convert to seconds
    
    // Calculate next batch time
    const now = Date.now();
    const lastBatchTime = now - (now % BATCH_INTERVAL);
    const nextBatchTime = lastBatchTime + BATCH_INTERVAL;
    const timeUntilNextBatch = nextBatchTime - now;
    
    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle('🔄 Batch Processing Status')
      .setDescription('Current batch processing information')
      .addFields(
        { name: 'Batch Running', value: isBatchRunning ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Batch Interval', value: `${batchInterval}s`, inline: true },
        { name: 'Queue Size', value: queueSize.toString(), inline: true },
        { name: 'Time Until Next Batch', value: `${Math.ceil(timeUntilNextBatch / 1000)}s`, inline: true },
        { name: 'Next Batch Time', value: new Date(nextBatchTime).toLocaleTimeString(), inline: true },
        { name: 'Cache TTL', value: `${CACHE_TTL / 1000}s`, inline: true }
      )
      .setTimestamp();

    // Add queue details if there are pending updates
    if (queueSize > 0) {
      let queueDetails = '';
      queueEntries.slice(0, 5).forEach(([discordId, data], index) => {
        queueDetails += `${index + 1}. <@${discordId}>: +${data.xpAmount} XP (${data.reason})\n`;
      });
      if (queueSize > 5) {
        queueDetails += `... and ${queueSize - 5} more`;
      }
      
      embed.addFields({
        name: 'Pending Updates',
        value: queueDetails,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🔄 Batch status checked by admin ${interaction.user.tag}`);
    
  } catch (error) {
    console.error('Error in showBatchStatus:', error);
    await interaction.reply({ 
      content: '❌ Error showing batch status.', 
      ephemeral: true 
    });
  }
}

// Cleanup functions (optimized)
function cleanup() {
  console.log('🧹 Cleaning up...');
  
  // Use optimized cleanup
  cleanupOptimizations();
  
  if (batchProcessingInterval) {
    clearInterval(batchProcessingInterval);
  }
  
  // Cleanup is now handled by optimizations
  console.log('✅ Cleanup completed');
  process.exit(0);
}

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Load saved invite links from database
async function loadSavedInviteLinks() {
  try {
    console.log('🔗 Loading saved invite links from database...');
    
    const { data: savedInvites, error } = await supabase
      .from('discord_users')
      .select('discord_id, invite_link')
      .not('invite_link', 'is', null)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading saved invite links:', error);
      return;
    }
    
    if (savedInvites && savedInvites.length > 0) {
      console.log(`✅ Loaded ${savedInvites.length} saved invite links from database`);
      
      // Verify these invites still exist on Discord
      try {
        const discordInvites = await client.guilds.cache.get(GUILD_ID)?.invites.fetch();
        
        for (const savedInvite of savedInvites) {
          if (savedInvite.invite_link) {
            const inviteCode = savedInvite.invite_link.split('/').pop();
            
            if (discordInvites && discordInvites.has(inviteCode)) {
              const discordInvite = discordInvites.get(inviteCode);
              
              // Add to tracking
              discordInviteTracking.set(inviteCode, {
                inviterId: savedInvite.discord_id,
                uses: discordInvite.uses || 0,
                createdAt: discordInvite.createdAt?.getTime() || Date.now()
              });
              
              // Track custom invites (ALL invites, not just bblip- ones)
              customInviteTracking.set(inviteCode, {
                userId: savedInvite.discord_id,
                inviteCode: inviteCode,
                createdAt: discordInvite.createdAt?.getTime() || Date.now()
              });
              
              console.log(`✅ Verified and loaded saved invite: ${inviteCode} -> User: ${savedInvite.discord_id}`);
              console.log(`🔗 Added to custom tracking: ${inviteCode} -> User: ${savedInvite.discord_id}`);
            } else {
              console.log(`⚠️ Saved invite ${inviteCode} not found on Discord, will be recreated when user requests`);
            }
          }
        }
      } catch (error) {
        console.error('Error verifying saved invites on Discord:', error);
      }
    } else {
      console.log('ℹ️ No saved invite links found in database');
    }
  } catch (error) {
    console.error('Error in loadSavedInviteLinks:', error);
  }
}

// Discord invite tracking functions
async function initializeDiscordInviteTracking() {
  try {
    console.log('🔗 Initializing Discord invite tracking...');
    
    // Get all active invites for the guild
    const invites = await client.guilds.cache.get(GUILD_ID)?.invites.fetch();
    
    if (invites) {
      invites.forEach(invite => {
        // For custom invites created by bot, use the actual user ID from the code
        let actualInviterId = invite.inviter?.id;
        if (invite.code.startsWith('bblip-') && invite.inviter?.id === client.user.id) {
          actualInviterId = invite.code.replace('bblip-', '');
          console.log(`🔗 Bot-created custom invite detected: ${invite.code} -> Actual User: ${actualInviterId}`);
        }
        
        discordInviteTracking.set(invite.code, {
          inviterId: actualInviterId,
          uses: invite.uses || 0,
          createdAt: invite.createdAt?.getTime() || Date.now()
        });
        
        // Track custom invites (ALL bot-created invites, not just bblip- ones)
        if (invite.inviter?.id === client.user.id) {
          if (invite.code.startsWith('bblip-')) {
            const customUserId = invite.code.replace('bblip-', '');
            customInviteTracking.set(invite.code, {
              userId: customUserId,
              inviteCode: invite.code,
              createdAt: invite.createdAt?.getTime() || Date.now()
            });
            console.log(`🔗 Found bot-created custom invite: ${invite.code} -> User: ${customUserId}`);
          } else {
            // For fallback invites, we'll need to look up the user from database
            console.log(`🔗 Found bot-created fallback invite: ${invite.code} (will be linked via database lookup)`);
          }
        }
      });
      
      console.log(`✅ Loaded ${invites.size} Discord invites for tracking`);
      console.log(`✅ Loaded ${customInviteTracking.size} custom invites for tracking`);
    }
  } catch (error) {
    console.error('Error initializing Discord invite tracking:', error);
  }
}

async function processDiscordInvite(newMemberId) {
  try {
    // Get current invites
    const currentInvites = await client.guilds.cache.get(GUILD_ID)?.invites.fetch();
    
    if (!currentInvites) return null;
    
    // Find which invite was used by comparing uses count
    for (const [code, invite] of currentInvites) {
      const previousData = discordInviteTracking.get(code);
      
      if (previousData && invite.uses > previousData.uses) {
        // This invite was used
        console.log(`🎯 Invite ${code} was used by ${newMemberId}, Discord inviter: ${invite.inviter?.id}`);
        console.log(`🔍 Processing invite: ${code}`);
        
        // Update tracking data
        discordInviteTracking.set(code, {
          inviterId: invite.inviter?.id,
          uses: invite.uses,
          createdAt: previousData.createdAt
        });
        
        // PRIORITY 1: Database lookup (most reliable, persistent)
        console.log(`🔍 Priority 1: Checking database for invite ${code}`);
        try {
          const { data: userData, error } = await supabase
            .from('discord_users')
            .select('discord_id, username')
            .eq('invite_link', `https://discord.gg/${code}`)
            .eq('is_active', true)
            .single();
          
          if (!error && userData) {
            console.log(`✅ Found user from database for invite ${code}: ${userData.discord_id} (${userData.username})`);
            return {
              inviteCode: code,
              inviterId: userData.discord_id,
              uses: invite.uses
            };
          } else {
            console.log(`❌ No database record found for invite ${code}`);
          }
        } catch (dbError) {
          console.error('Error looking up user from database:', dbError);
        }
        
        // PRIORITY 2: Memory tracking (fast but temporary)
        console.log(`🔍 Priority 2: Checking memory tracking for invite ${code}`);
        const customTracking = customInviteTracking.get(code);
        if (customTracking) {
          console.log(`✅ Found memory tracking data for invite ${code}: User ${customTracking.userId}`);
          return {
            inviteCode: code,
            inviterId: customTracking.userId,
            uses: invite.uses
          };
        } else {
          console.log(`❌ No memory tracking found for invite ${code}`);
        }
        
        // PRIORITY 3: Custom invite code parsing (bblip-USER_ID format)
        console.log(`🔍 Priority 3: Checking custom invite code format for ${code}`);
        if (code.startsWith('bblip-')) {
          const customInviterId = code.replace('bblip-', '');
          console.log(`✅ Custom invite code detected, actual inviter: ${customInviterId}`);
          return {
            inviteCode: code,
            inviterId: customInviterId,
            uses: invite.uses
          };
        }
        
        // PRIORITY 4: Discord inviter (least reliable for bot-created invites)
        console.log(`🔍 Priority 4: Using Discord inviter as fallback: ${invite.inviter?.id}`);
        if (invite.inviter?.id === client.user.id) {
          console.log(`⚠️ Bot-created invite but no tracking found - this should not happen!`);
        }
        
        return {
          inviteCode: code,
          inviterId: invite.inviter?.id,
          uses: invite.uses
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing Discord invite:', error);
    return null;
  }
}

// Initialize optimizations
initializeOptimizations();

// Start batch processing (optimized)
startBatchProcessing();

// Memory management is now handled automatically by LRU cache
// No manual cleanup needed

// Start the bot
if (BOT_TOKEN) {
  client.login(BOT_TOKEN);
  console.log('🚀 Discord bot started with optimizations');
} else {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
} 