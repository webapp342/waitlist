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

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Discord Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`📊 Monitoring guild: ${GUILD_ID}`);
});

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

// Add XP to user
async function addXP(discordId, xpAmount, reason = 'activity') {
  try {
    // Get current activity
    const { data: activity, error: activityError } = await supabase
      .from('discord_activities')
      .select('total_xp, current_level')
      .eq('discord_id', discordId)
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Error fetching Discord activity:', activityError);
      return false;
    }

    const currentXP = activity?.total_xp || 0;
    const newXP = currentXP + xpAmount;
    const oldLevel = getCurrentLevel(currentXP);
    const newLevel = getCurrentLevel(newXP);

    // Update activity
    const { error: updateError } = await supabase
      .from('discord_activities')
      .update({
        total_xp: newXP,
        current_level: newLevel.name === 'Bronze' ? 1 : 
                     newLevel.name === 'Silver' ? 2 : 
                     newLevel.name === 'Gold' ? 3 : 
                     newLevel.name === 'Platinum' ? 4 : 5,
        updated_at: new Date().toISOString()
      })
      .eq('discord_id', discordId);

    if (updateError) {
      console.error('Error updating Discord activity:', updateError);
      return false;
    }

    // Check for level up
    if (oldLevel.name !== newLevel.name) {
      console.log(`🎉 Level up! User ${discordId} reached ${newLevel.name} level`);
      return { levelUp: true, oldLevel: oldLevel.name, newLevel: newLevel.name, newXP };
    }

    return { levelUp: false, newXP };
  } catch (error) {
    console.error('Error adding XP:', error);
    return false;
  }
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

  const userId = message.author.id;
  const channel = message.channel;

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

  // Check if user is connected
  const { data: discordUser, error: userError } = await supabase
    .from('discord_users')
    .select('discord_id, username')
    .eq('discord_id', userId)
    .eq('is_active', true)
    .single();

  if (userError || !discordUser) {
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

  // Record message and add XP
  const xpResult = await addXP(userId, MESSAGE_XP, 'message');
  
  if (xpResult && xpResult.levelUp) {
    await sendLevelUpNotification(channel, userId, xpResult.oldLevel, xpResult.newLevel, xpResult.newXP);
  }

  // Log message for tracking
  try {
    await supabase
      .from('discord_message_logs')
      .insert({
        discord_id: userId,
        guild_id: message.guildId,
        channel_id: message.channelId,
        message_id: message.id,
        message_content: message.content.substring(0, 500), // Limit content length
        xp_earned: MESSAGE_XP
      });
  } catch (error) {
    console.error('Error logging message:', error);
  }
});

// Handle reactions
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  // Only process in our guild
  if (reaction.message.guildId !== GUILD_ID) return;

  const userId = user.id;
  const channel = reaction.message.channel;

  // Check if user is connected
  const { data: discordUser, error: userError } = await supabase
    .from('discord_users')
    .select('discord_id')
    .eq('discord_id', userId)
    .eq('is_active', true)
    .single();

  if (userError || !discordUser) return;

  // Add XP for reaction
  const xpResult = await addXP(userId, REACTION_XP, 'reaction');
  
  if (xpResult && xpResult.levelUp) {
    await sendLevelUpNotification(channel, userId, xpResult.oldLevel, xpResult.newLevel, xpResult.newXP);
  }

  // Log reaction
  try {
    await supabase
      .from('discord_reaction_logs')
      .insert({
        discord_id: userId,
        message_id: reaction.message.id,
        reaction_type: reaction.emoji.name,
        xp_earned: REACTION_XP
      });
  } catch (error) {
    console.error('Error logging reaction:', error);
  }
});

// Handle new member joins
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  const channel = member.guild.systemChannel;
  if (!channel) return;

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
    case 'help':
      await handleHelpCommand(interaction);
      break;
  }
});

// XP command
async function handleXPCommand(interaction) {
  const userId = interaction.user.id;

  // Check if user is connected
  const { data: discordUser, error: userError } = await supabase
    .from('discord_users')
    .select('discord_id, username')
    .eq('discord_id', userId)
    .eq('is_active', true)
    .single();

  if (userError || !discordUser) {
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

  // Get user stats
  const { data: activity, error: activityError } = await supabase
    .from('discord_activities')
    .select('*')
    .eq('discord_id', userId)
    .single();

  if (activityError) {
    await interaction.reply({ content: '❌ Error fetching your stats.', ephemeral: true });
    return;
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
      { name: 'Messages Sent', value: activity.message_count.toString(), inline: true },
      { name: 'Reactions Received', value: activity.total_reactions.toString(), inline: true },
      { name: 'Day Streak', value: activity.weekly_streak.toString(), inline: true }
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
      message_count,
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
      value: `Level: ${level.name} | XP: ${entry.total_xp} | Messages: ${entry.message_count}`,
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
      { name: '/help', value: 'Show this help message', inline: true },
      { name: 'XP System', value: '• Messages: +1 XP\n• Reactions: +2 XP\n• Daily activity: +5 XP\n• Weekly streak: +10 XP', inline: false },
      { name: 'Levels', value: 'Bronze (0-100 XP): 1 BBLP/day\nSilver (101-250 XP): 3 BBLP/day\nGold (251-500 XP): 5 BBLP/day\nPlatinum (501-1000 XP): 10 BBLP/day\nDiamond (1001+ XP): 20 BBLP/day', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start the bot
if (BOT_TOKEN) {
  client.login(BOT_TOKEN);
} else {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
} 