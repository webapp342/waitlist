require('dotenv').config();

const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

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

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cache system for performance optimization
const userCache = new Map(); // discordId -> { userData, lastUpdate, xpData }
const processedMessages = new Set(); // messageId -> true (prevent duplicates)
const processedReactions = new Set(); // reactionId -> true (prevent duplicates)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
const BATCH_INTERVAL = 60 * 1000; // 60 seconds batch processing

// Rate limiting configuration
const RATE_LIMIT_DELAY = 50;
const RATE_LIMIT_RETRY_DELAY = 2000;
const MAX_MESSAGES_PER_MINUTE = 10;
const MAX_MESSAGES_PER_HOUR = 100;

// User rate limiting
const userRateLimits = new Map();

// XP configuration
const MESSAGE_XP = 1;
const REACTION_XP = 2;
const DAILY_ACTIVITY_XP = 5;
const WEEKLY_STREAK_XP = 10;

// Level configuration
const LEVELS = [
  { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
  { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
  { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
  { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
  { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
];

// Performance monitoring
let messageCount = 0;
let lastMessageTime = Date.now();
const PERFORMANCE_LOG_INTERVAL = 100;

// Batch processing queue
const xpUpdateQueue = new Map(); // discordId -> { xpAmount, reason, timestamp }
let batchProcessingInterval = null;

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
  
  // Start batch processing
  startBatchProcessing();
  
  // Initialize Discord invite tracking
  if (DISCORD_INVITE_SYSTEM_ENABLED) {
    initializeDiscordInviteTracking();
  }
});

// Cache management functions
function getCachedUser(discordId) {
  const cached = userCache.get(discordId);
  if (cached && Date.now() - cached.lastUpdate < CACHE_TTL) {
    return cached;
  }
  return null;
}

function setCachedUser(discordId, userData, xpData = null) {
  userCache.set(discordId, {
    userData,
    xpData,
    lastUpdate: Date.now()
  });
}

function clearExpiredCache() {
  const now = Date.now();
  for (const [discordId, cached] of userCache.entries()) {
    if (now - cached.lastUpdate > CACHE_TTL) {
      userCache.delete(discordId);
    }
  }
}

// Start batch processing for XP updates
function startBatchProcessing() {
  if (batchProcessingInterval) {
    clearInterval(batchProcessingInterval);
  }
  
  batchProcessingInterval = setInterval(async () => {
    await processBatchXPUpdates();
  }, BATCH_INTERVAL);
  
  console.log('🔄 Batch processing started');
}

// Process batch XP updates
async function processBatchXPUpdates() {
  if (xpUpdateQueue.size === 0) return;
  
  console.log(`🔄 Processing ${xpUpdateQueue.size} XP updates in batch`);
  
  const updates = Array.from(xpUpdateQueue.entries());
  xpUpdateQueue.clear();
  
  for (const [discordId, updateData] of updates) {
    try {
      await processSingleXPUpdate(discordId, updateData.xpAmount, updateData.reason);
    } catch (error) {
      console.error(`❌ Error processing XP update for ${discordId}:`, error);
    }
  }
}

// Process single XP update
async function processSingleXPUpdate(discordId, xpAmount, reason = 'activity') {
  try {
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
      });

    if (updateError) {
      console.error('Error updating Discord activity:', updateError);
      return false;
    }

    // Update cache
    const cached = getCachedUser(discordId);
    if (cached) {
      cached.xpData = { total_xp: newXP, current_level: newLevel.name === 'Bronze' ? 1 : 
                       newLevel.name === 'Silver' ? 2 : 
                       newLevel.name === 'Gold' ? 3 : 
                       newLevel.name === 'Platinum' ? 4 : 5 };
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
  // Add to batch queue instead of immediate processing
  const existing = xpUpdateQueue.get(discordId);
  if (existing) {
    existing.xpAmount += xpAmount;
    existing.timestamp = Date.now();
  } else {
    xpUpdateQueue.set(discordId, {
      xpAmount,
      reason,
      timestamp: Date.now()
    });
  }
  
  return { levelUp: false, newXP: 0 }; // Will be processed in batch
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

// Handle new messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process in our guild
  if (message.guildId !== GUILD_ID) return;

  // Prevent duplicate processing
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);

  const userId = message.author.id;
  const channel = message.channel;

  // Performance monitoring
  messageCount++;
  if (messageCount % PERFORMANCE_LOG_INTERVAL === 0) {
    const now = Date.now();
    const rate = PERFORMANCE_LOG_INTERVAL / ((now - lastMessageTime) / 1000);
    console.log(`📊 Processed ${messageCount} messages, rate: ${rate.toFixed(2)} msg/s`);
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
        .setColor(0xff6b6b)
        .setTitle('🔗 Connect Your Account')
        .setDescription(`Hey <@${userId}>! To earn XP and rewards, connect your Discord account to your wallet.`)
        .addFields(
          { name: 'What you\'ll get:', value: '• XP for messages and reactions\n• Daily BBLP rewards\n• Level progression\n• Community leaderboards' }
        )
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Connect Account')
            .setStyle(ButtonStyle.Link)
            .setURL(`${WEB_APP_URL}/discord`)
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

// Handle reactions
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  // Only process in our guild
  if (reaction.message.guildId !== GUILD_ID) return;

  // Prevent duplicate processing
  const reactionId = `${reaction.message.id}-${user.id}-${reaction.emoji.name}`;
  if (processedReactions.has(reactionId)) return;
  processedReactions.add(reactionId);

  const userId = user.id;
  const channel = reaction.message.channel;

  // Check if user is connected (use cache)
  let discordUser = getCachedUser(userId)?.userData;
  
  if (!discordUser) {
    const { data, error } = await supabase
      .from('discord_users')
      .select('discord_id')
      .eq('discord_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) return;
    
    discordUser = data;
    setCachedUser(userId, data);
  }

  // Add XP for reaction (batch processing)
  addXP(userId, REACTION_XP, 'reaction');
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
        
        // Award XP to inviter
        addXP(inviteData.inviterId, DISCORD_INVITE_XP_REWARD, 'discord_invite');
        
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
        .setURL(`${WEB_APP_URL}/discord`)
    );

  await channel.send({ embeds: [embed], components: [row] });
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
    case 'connect':
      await handleConnectCommand(interaction);
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
            .setURL(`${WEB_APP_URL}/discord`)
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
      .select('total_xp, current_level')
      .eq('discord_id', userId)
      .single();

    if (error) {
      await interaction.reply({ content: '❌ Error fetching your stats.', ephemeral: true });
      return;
    }
    
    activity = data || { total_xp: 0, current_level: 1 };
    const cached = getCachedUser(userId);
    if (cached) {
      cached.xpData = activity;
      setCachedUser(userId, cached.userData, cached.xpData);
    }
  }

  const currentLevel = getCurrentLevel(activity.total_xp);
  const nextLevel = getNextLevel(currentLevel);
  const progressToNext = activity.total_xp - currentLevel.minXP;
  const maxXPForLevel = currentLevel.maxXP - currentLevel.minXP;
  const progressPercentage = Math.round((progressToNext / maxXPForLevel) * 100);

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`📊 XP Stats for ${discordUser.username}`)
    .addFields(
      { name: 'Current Level', value: currentLevel.name, inline: true },
      { name: 'Total XP', value: activity.total_xp.toString(), inline: true },
      { name: 'Daily Reward', value: `${currentLevel.reward} BBLP`, inline: true },
      { name: 'Day Streak', value: '0', inline: true }
    )
    .setTimestamp();

  if (nextLevel) {
    embed.addFields(
      { name: 'Progress to Next Level', value: `${progressPercentage}% (${progressToNext}/${maxXPForLevel} XP)`, inline: false }
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Leaderboard command
async function handleLeaderboardCommand(interaction) {
  const { data: leaderboard, error } = await supabase
    .from('discord_activities')
    .select(`
      total_xp,
      discord_users!inner(username, discriminator)
    `)
    .order('total_xp', { ascending: false })
    .limit(10);

  if (error) {
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
      name: `#${index + 1} ${entry.discord_users.username}#${entry.discord_users.discriminator}`,
      value: `Level: ${level.name} | XP: ${entry.total_xp}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
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
        .setURL(`${WEB_APP_URL}/discord`)
    );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// Invite command
async function handleInviteCommand(interaction) {
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
            .setURL(`${WEB_APP_URL}/discord`)
        );

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }
    
    discordUser = data;
    setCachedUser(userId, data);
  }

  try {
    // Create invite for the user
    const invite = await interaction.guild.invites.create(interaction.channel, {
      maxAge: 0, // Never expires
      maxUses: 0, // Unlimited uses
      unique: true,
      reason: `Invite created by ${discordUser.username}`
    });

    // Track this invite
    discordInviteTracking.set(invite.code, {
      inviterId: userId,
      uses: 0,
      createdAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🔗 Your Invite Link')
      .setDescription(`Here's your personal invite link for the BBLIP Discord server!`)
      .addFields(
        { name: 'Invite Link', value: `https://discord.gg/${invite.code}`, inline: false },
        { name: 'Rewards', value: `• +${DISCORD_INVITE_XP_REWARD} XP per invite\n• +${DISCORD_INVITE_BBLP_REWARD} BBLP per invite`, inline: false },
        { name: 'How it works', value: 'Share this link with friends. When they join, you\'ll automatically get rewarded!', inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🔗 Copy Invite Link')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.gg/${invite.code}`)
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
    .setTitle('🤖 BBLIP Discord Bot Commands')
    .setDescription('Available commands and features')
    .addFields(
      { name: '/xp', value: 'View your XP stats and level', inline: true },
      { name: '/leaderboard', value: 'View top users by XP', inline: true },
      { name: '/connect', value: 'Get connection instructions', inline: true },
      { name: '/invite', value: 'Create your invite link', inline: true },
      { name: '/help', value: 'Show this help message', inline: true },
      { name: 'XP System', value: '• Messages: +1 XP\n• Reactions: +2 XP\n• Daily activity: +5 XP\n• Weekly streak: +10 XP\n• Discord invites: +25 XP', inline: false },
      { name: 'Levels', value: 'Bronze (0-100 XP): 1 BBLP/day\nSilver (101-250 XP): 3 BBLP/day\nGold (251-500 XP): 5 BBLP/day\nPlatinum (501-1000 XP): 10 BBLP/day\nDiamond (1001+ XP): 20 BBLP/day', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Cleanup functions
function cleanup() {
  console.log('🧹 Cleaning up...');
  
  if (batchProcessingInterval) {
    clearInterval(batchProcessingInterval);
  }
  
  // Process remaining XP updates
  if (xpUpdateQueue.size > 0) {
    console.log(`🔄 Processing ${xpUpdateQueue.size} remaining XP updates...`);
    processBatchXPUpdates().then(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    });
  } else {
    console.log('✅ Cleanup completed');
    process.exit(0);
  }
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

// Discord invite tracking functions
async function initializeDiscordInviteTracking() {
  try {
    console.log('🔗 Initializing Discord invite tracking...');
    
    // Get all active invites for the guild
    const invites = await client.guilds.cache.get(GUILD_ID)?.invites.fetch();
    
    if (invites) {
      invites.forEach(invite => {
        discordInviteTracking.set(invite.code, {
          inviterId: invite.inviter?.id,
          uses: invite.uses || 0,
          createdAt: invite.createdAt?.getTime() || Date.now()
        });
      });
      
      console.log(`✅ Loaded ${invites.size} Discord invites for tracking`);
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
        console.log(`🎯 Invite ${code} was used by ${newMemberId}, inviter: ${invite.inviter?.id}`);
        
        // Update tracking data
        discordInviteTracking.set(code, {
          inviterId: invite.inviter?.id,
          uses: invite.uses,
          createdAt: previousData.createdAt
        });
        
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

// Periodic cache cleanup
setInterval(clearExpiredCache, CACHE_TTL);

// Memory management - clear processed messages/reactions periodically
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Clear old processed messages (older than 1 hour)
  for (const messageId of processedMessages) {
    // This is a simple cleanup - in production you might want more sophisticated tracking
    if (Math.random() < 0.1) { // 10% chance to clear each time
      processedMessages.delete(messageId);
    }
  }
  
  // Clear old processed reactions (older than 1 hour)
  for (const reactionId of processedReactions) {
    if (Math.random() < 0.1) { // 10% chance to clear each time
      processedReactions.delete(reactionId);
    }
  }
  
  console.log(`🧹 Memory cleanup: ${processedMessages.size} messages, ${processedReactions.size} reactions tracked`);
}, 30 * 60 * 1000); // Every 30 minutes

// Start the bot
if (BOT_TOKEN) {
  client.login(BOT_TOKEN);
} else {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
} 