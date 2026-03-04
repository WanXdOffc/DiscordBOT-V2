const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`🤖 Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Total users: ${client.users.cache.size}`);
    
    // Set bot status
    client.user.setPresence({
      activities: [{
        name: '/help | OnePanel Bot',
        type: ActivityType.Playing
      }],
      status: 'online'
    });

    // Register slash commands
    try {
      const { REST, Routes } = require('discord.js');
      const config = require('../config/config');
      
      const commands = [];
      client.commands.forEach(command => {
        commands.push(command.data.toJSON());
      });

      const rest = new REST().setToken(config.discord.token);
      
      console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

      // Register commands globally or for a specific guild
      if (config.discord.guildId) {
        // Guild-specific (faster for development)
        await rest.put(
          Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
          { body: commands }
        );
        console.log(`✅ Successfully registered ${commands.length} guild commands.`);
      } else {
        // Global commands (takes up to 1 hour to propagate)
        await rest.put(
          Routes.applicationCommands(config.discord.clientId),
          { body: commands }
        );
        console.log(`✅ Successfully registered ${commands.length} global commands.`);
      }
    } catch (error) {
      console.error('Error registering commands:', error);
    }

    // Start background jobs
    console.log('\n🚀 Starting background jobs...');
    
    try {
      const { startBillingJob } = require('../jobs/billingJob');
      const { startExpirationJob } = require('../jobs/expirationJob');
      const { startNotificationJob } = require('../jobs/notificationJob');
      const { startGiveawayJob } = require('../jobs/giveawayJob');

      startBillingJob(client);
      startExpirationJob(client);
      startNotificationJob(client);
      startGiveawayJob(client);

      console.log('\n✅ All background jobs started successfully!');
    } catch (error) {
      console.error('❌ Error starting background jobs:', error);
    }

    console.log('\n✅ OnePanel Bot is fully operational!\n');
  }
};