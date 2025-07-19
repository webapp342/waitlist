require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3000';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// XP calculation constants
const XP_REWARDS = {
  MESSAGE: 1,
  REACTION_RECEIVED: 2,
  REACTION_GIVEN: 1,
  HELPFUL_MESSAGE: 5,
  DAILY_ACTIVE: 5,
  WEEKLY_STREAK: 10,
  RULE_VIOLATION: -10
};

// Level thresholds
const LEVELS = [
  { name: 'Bronze', minXP: 0, maxXP: 100, reward: 1 },
  { name: 'Silver', minXP: 101, maxXP: 250, reward: 3 },
  { name: 'Gold', minXP: 251, maxXP: 500, reward: 5 },
  { name: 'Platinum', minXP: 501, maxXP: 1000, reward: 10 },
  { name: 'Diamond', minXP: 1001, maxXP: 999999, reward: 20 }
];

// Bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const args = msg.text.split(' ');
  
  console.log(`🚀 /start command received:`);
  console.log(`  - Chat ID: ${chatId}`);
  console.log(`  - User ID: ${userId}`);
  console.log(`  - Username: @${username}`);
  console.log(`  - Args: ${JSON.stringify(args)}`);
  
  try {
    console.log(`🔍 Checking if user ${userId} exists in database...`);
    
    // Check if user is in our database
    const { data: telegramUser, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    console.log(`📊 Database query result:`);
    console.log(`  - User found: ${!!telegramUser}`);
    console.log(`  - Error: ${error ? JSON.stringify(error) : 'None'}`);
    console.log(`  - User data: ${telegramUser ? JSON.stringify(telegramUser) : 'Not found'}`);
    
    if (error || !telegramUser) {
      console.log(`❌ User not connected, sending connection instructions...`);
      
      if (args[1] === 'connect') {
        const message = `🔗 Manual Connection Mode\n\n` +
          `To connect your Telegram account:\n\n` +
          `1. Visit our web app: ${WEB_APP_URL}/telegram\n` +
          `2. Connect your wallet\n` +
          `3. Click "Connect Telegram" button\n` +
          `4. Use the Telegram Login Widget\n\n` +
          `Your Telegram ID: ${userId}\n` +
          `Your Username: @${username}\n\n` +
          `Once connected, you can use:\n` +
          `/my_xp - View your XP and level\n` +
          `/leaderboard - View top users\n` +
          `/help - Show all commands`;
        
        console.log(`📤 Sending manual connection message...`);
        await bot.sendMessage(chatId, message);
        console.log(`✅ Manual connection message sent`);
      } else {
        const message = `Welcome to BBLIP Telegram Bot! 🤖\n\n` +
          `To start earning XP, connect your Telegram account:\n\n` +
          `1. Visit: ${WEB_APP_URL}/telegram\n` +
          `2. Connect your wallet\n` +
          `3. Click "Connect Telegram" button\n` +
          `4. Use the Telegram Login Widget\n\n` +
          `Your messages and reactions in our group will earn you XP automatically!`;
        
        console.log(`📤 Sending welcome message...`);
        await bot.sendMessage(chatId, message);
        console.log(`✅ Welcome message sent`);
      }
      return;
    }
    
    console.log(`✅ User already connected to wallet: ${telegramUser.user_id}`);
    const message = `Welcome back! You are connected to wallet: ${telegramUser.user_id}\n\n` +
      'Your messages and reactions in the group will earn you XP automatically!';
    
    console.log(`📤 Sending welcome back message...`);
    await bot.sendMessage(chatId, message);
    console.log(`✅ Welcome back message sent`);
    
  } catch (error) {
    console.error('❌ Error in /start command:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/my_xp/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get user's activity data
    const { data: activity, error } = await supabase
      .from('telegram_activities')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    if (error || !activity) {
      await bot.sendMessage(chatId, 'You are not connected to our system. Please visit our web app first.');
      return;
    }
    
    const currentLevel = LEVELS.find(level => 
      activity.total_xp >= level.minXP && activity.total_xp <= level.maxXP
    ) || LEVELS[0];
    
    const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
    const xpToNext = nextLevel ? nextLevel.minXP - activity.total_xp : 0;
    
    const message = `📊 Your XP Stats\n\n` +
      `🏆 Level: ${currentLevel.name} (${LEVELS.indexOf(currentLevel) + 1})\n` +
      `⭐ Total XP: ${activity.total_xp}\n` +
      `💬 Messages: ${activity.message_count}\n` +
      `❤️ Reactions: ${activity.total_reactions}\n` +
      `🔥 Daily Streak: ${activity.weekly_streak} days\n\n`;
    
    if (nextLevel) {
      message += `📈 ${xpToNext} XP needed for ${nextLevel.name}`;
    } else {
      message += `🎉 You've reached the maximum level!`;
    }
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /my_xp command:', error);
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Get top 10 users by XP
    const { data: topUsers, error } = await supabase
      .from('telegram_activities')
      .select(`
        total_xp,
        telegram_users!inner(username, first_name)
      `)
      .order('total_xp', { ascending: false })
      .limit(10);
    
    if (error || !topUsers.length) {
      await bot.sendMessage(chatId, 'No leaderboard data available yet.');
      return;
    }
    
    let message = `🏆 Top 10 XP Leaderboard\n\n`;
    
    topUsers.forEach((user, index) => {
      const username = user.telegram_users.username || user.telegram_users.first_name;
      const level = LEVELS.find(level => 
        user.total_xp >= level.minXP && user.total_xp <= level.maxXP
      ) || LEVELS[0];
      
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      message += `${emoji} ${index + 1}. @${username} - ${user.total_xp} XP (${level.name})\n`;
    });
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const message = `🤖 BBLIP Telegram Bot Commands\n\n` +
    `/start - Connect your account\n` +
    `/my_xp - View your XP and level\n` +
    `/leaderboard - View top users\n` +
    `/help - Show this help message\n\n` +
    `💡 How to earn XP:\n` +
    `• Send messages: +1 XP\n` +
    `• Receive reactions: +2 XP\n` +
    `• Give reactions: +1 XP\n` +
    `• Daily activity: +5 XP\n` +
    `• Weekly streak: +10 XP\n\n` +
    `🎁 Daily Rewards:\n` +
    `• Bronze: 1 BBLP/day\n` +
    `• Silver: 3 BBLP/day\n` +
    `• Gold: 5 BBLP/day\n` +
    `• Platinum: 10 BBLP/day\n` +
    `• Diamond: 20 BBLP/day`;
  
  await bot.sendMessage(chatId, message);
});

// Handle new messages
bot.on('message', async (msg) => {
  // Only process messages from the main group
  if (msg.chat.id.toString() !== GROUP_ID) {
    return;
  }
  
  const userId = msg.from.id;
  const messageId = msg.message_id;
  const chatId = msg.chat.id;
  const messageText = msg.text || '';
  
  try {
    // Check if user is connected
    const { data: telegramUser, error: userError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    if (userError || !telegramUser) {
      // User not connected, ignore
      return;
    }
    
    // Save message to database
    await supabase
      .from('telegram_messages')
      .insert([{
        telegram_id: userId,
        message_id: messageId,
        chat_id: chatId,
        message_text: messageText,
        message_type: msg.photo ? 'photo' : 'text',
        is_helpful: isHelpfulMessage(messageText)
      }])
      .single();
    
    // Update user's activity
    await updateUserActivity(userId, {
      messageCount: 1,
      xpEarned: XP_REWARDS.MESSAGE + (isHelpfulMessage(messageText) ? XP_REWARDS.HELPFUL_MESSAGE : 0)
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Handle reactions
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  
  // Only process reactions from the main group
  if (msg.chat.id.toString() !== GROUP_ID) {
    return;
  }
  
  try {
    // Check if user is connected
    const { data: telegramUser, error: userError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    if (userError || !telegramUser) {
      return;
    }
    
    // Update user's activity for giving reaction
    await updateUserActivity(userId, {
      xpEarned: XP_REWARDS.REACTION_GIVEN
    });
    
  } catch (error) {
    console.error('Error processing reaction:', error);
  }
});

// Helper functions
function isHelpfulMessage(text) {
  const helpfulKeywords = [
    'help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial',
    'explain', 'assist', 'support', 'answer', 'question', 'problem',
    'solution', 'advice', 'tip', 'recommend', 'suggest'
  ];
  
  const lowerText = text.toLowerCase();
  return helpfulKeywords.some(keyword => lowerText.includes(keyword));
}

async function updateUserActivity(telegramId, updates) {
  try {
    // Get current activity
    const { data: currentActivity, error: fetchError } = await supabase
      .from('telegram_activities')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
    
    if (!currentActivity) {
      // Create new activity record
      await supabase
        .from('telegram_activities')
        .insert([{
          telegram_id: telegramId,
          message_count: updates.messageCount || 0,
          total_xp: updates.xpEarned || 0,
          current_level: 1,
          last_activity: new Date().toISOString()
        }]);
    } else {
      // Update existing activity
      const newTotalXP = currentActivity.total_xp + (updates.xpEarned || 0);
      const newMessageCount = currentActivity.message_count + (updates.messageCount || 0);
      const newLevel = calculateLevel(newTotalXP);
      
      await supabase
        .from('telegram_activities')
        .update({
          message_count: newMessageCount,
          total_xp: newTotalXP,
          current_level: newLevel,
          last_activity: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);
    }
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

function calculateLevel(totalXP) {
  if (totalXP >= 1001) return 5;  // Diamond
  if (totalXP >= 501) return 4;   // Platinum
  if (totalXP >= 251) return 3;   // Gold
  if (totalXP >= 101) return 2;   // Silver
  return 1;                       // Bronze
}

// Daily XP calculation job (run every day at midnight)
async function calculateDailyXP() {
  try {
    console.log('Starting daily XP calculation...');
    
    // Get all connected users
    const { data: users, error } = await supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    for (const user of users) {
      try {
        // Check if user was active today
        const today = new Date().toISOString().split('T')[0];
        const { data: todayMessages, error: messageError } = await supabase
          .from('telegram_messages')
          .select('id')
          .eq('telegram_id', user.telegram_id)
          .gte('created_at', today)
          .limit(1);
        
        if (messageError) {
          console.error('Error checking today messages:', messageError);
          continue;
        }
        
        if (todayMessages.length > 0) {
          // User was active today, give daily bonus
          await updateUserActivity(user.telegram_id, {
            xpEarned: XP_REWARDS.DAILY_ACTIVE
          });
          
          console.log(`Daily bonus given to user ${user.telegram_id}`);
        }
      } catch (error) {
        console.error(`Error processing user ${user.telegram_id}:`, error);
      }
    }
    
    console.log('Daily XP calculation completed');
  } catch (error) {
    console.error('Error in daily XP calculation:', error);
  }
}

// Schedule daily XP calculation (every 24 hours)
setInterval(calculateDailyXP, 24 * 60 * 60 * 1000);

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🤖 Telegram bot started...');
console.log('📊 Bot Info:');
console.log('  - Bot Token:', BOT_TOKEN ? '✅ Set' : '❌ Missing');
console.log('  - Group ID:', GROUP_ID);
console.log('  - Supabase URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('  - Web App URL:', WEB_APP_URL);
console.log('🔍 Waiting for messages...');

module.exports = bot; 