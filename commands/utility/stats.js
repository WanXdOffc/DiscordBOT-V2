const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerStatistics } = require('../../utils/monitor');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot statistics'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await getServerStatistics();
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor(uptime / 3600) % 24;
      const minutes = Math.floor(uptime / 60) % 60;

      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('📊 Bot Statistics')
        .setDescription(`OnePanel Bot v1.0 - Running smoothly!`)
        .addFields(
          {
            name: '👥 Users',
            value: 
              `Total: ${stats.users.total}\n` +
              `Verified: ${stats.users.verified}\n` +
              `Premium: ${stats.users.premium}`,
            inline: true
          },
          {
            name: '🖥️ Servers',
            value: 
              `Total: ${stats.servers.total}\n` +
              `Active: ${stats.servers.active}\n` +
              `Expired: ${stats.servers.expired}`,
            inline: true
          },
          {
            name: '💰 Economy',
            value: 
              `Total Coins: ${stats.economy.totalCoins.toLocaleString()}\n` +
              `Total Spent: ${stats.economy.totalSpent.toLocaleString()}\n` +
              `Circulation: ${stats.economy.circulation.toLocaleString()}`,
            inline: true
          },
          {
            name: '⏰ Uptime',
            value: `${days}d ${hours}h ${minutes}m`,
            inline: true
          },
          {
            name: '📦 Commands',
            value: `${interaction.client.commands.size}`,
            inline: true
          },
          {
            name: '🌐 Servers',
            value: `${interaction.client.guilds.cache.size}`,
            inline: true
          }
        )
        .setFooter({ text: 'OnePanel Bot - All systems operational' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in stats command:', error);
      
      await interaction.editReply({
        embeds: [require('../../utils/embeds').errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil statistik.'
        )]
      });
    }
  }
};