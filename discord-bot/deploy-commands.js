const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID');
  process.exit(1);
}

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('View your XP stats and level'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View top users by XP'),
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Create your personal invite link for rewards'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot commands and features'),
];

// Deploy commands
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log('🚀 Started refreshing application (/) commands.');

    // Deploy to guild (faster for development)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
    console.log(`📊 Deployed ${commands.length} commands to guild ${GUILD_ID}`);
    
    // List deployed commands
    const deployedCommands = await rest.get(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    );
    
    console.log('\n📋 Deployed Commands:');
    deployedCommands.forEach((command, index) => {
      console.log(`${index + 1}. /${command.name} - ${command.description}`);
    });

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})(); 