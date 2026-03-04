require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { connectDB } = require('./utils/database');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Load handlers
commandHandler(client);
eventHandler(client);

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('✅ Database connected successfully');
    
    // Login to Discord
    client.login(process.env.DISCORD_TOKEN);
  })
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });

// Global error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Disconnect from Discord
  client.destroy();
  
  // Close database connection
  const { disconnectDB } = require('./utils/database');
  await disconnectDB();
  
  console.log('👋 Bot shut down successfully');
  process.exit(0);
});

module.exports = client;