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
    .setName('connect')
    .setDescription('Get instructions to connect your account'),
  
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Create your personal invite link for rewards'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot commands and features'),
  
  new SlashCommandBuilder()
    .setName('cache')
    .setDescription('Manage bot cache (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all bot caches')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Show cache statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Clear cache for specific user')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('Discord user ID to clear cache for')
            .setRequired(true)
        )
    ),
  
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing bot (Admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete_invite')
        .setDescription('Delete invite record for a user')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('Discord user ID to delete invite record for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list_invites')
        .setDescription('List recent invite records')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset_user')
        .setDescription('Reset user invite status to eligible')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('Discord user ID to reset invite status for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear_invites')
        .setDescription('Delete ALL Discord invite links (DANGEROUS)')
        .addStringOption(option =>
          option
            .setName('confirmation')
            .setDescription('Type YES_DELETE_ALL to confirm')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset_invite_tracking')
        .setDescription('Reset bot invite tracking cache')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('debug_invite')
        .setDescription('Debug invite eligibility for a user')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('Discord user ID to debug')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('batch_status')
        .setDescription('Show batch processing status')
    ),
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