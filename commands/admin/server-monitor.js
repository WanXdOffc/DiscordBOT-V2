const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { getServerStatistics, formatBytes } = require('../../utils/monitor');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-monitor')
    .setDescription('View live server statistics and monitoring (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }); // Public display

    try {
      // Check if executor is admin
      const adminUser = await User.findOne({ 
        discordId: interaction.user.id,
        isAdmin: true 
      });

      if (!adminUser) {
        return interaction.editReply({
          embeds: [require('../../utils/embeds').errorEmbed(
            'Permission Denied',
            'Anda tidak memiliki permission untuk menggunakan command ini.'
          )]
        });
      }

      // Get statistics
      const stats = await getServerStatistics();

      // Calculate percentages
      const verifiedPercentage = stats.users.total > 0 
        ? ((stats.users.verified / stats.users.total) * 100).toFixed(1)
        : 0;

      const activePercentage = stats.servers.total > 0
        ? ((stats.servers.active / stats.servers.total) * 100).toFixed(1)
        : 0;

      // Create monitor embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('📊 Server Monitor - Live Statistics')
        .setDescription('Real-time bot statistics and server monitoring')
        .addFields(
          {
            name: '👥 User Statistics',
            value: 
              `**Total Users:** ${stats.users.total}\n` +
              `**Verified:** ${stats.users.verified} (${verifiedPercentage}%)\n` +
              `**Premium:** ${stats.users.premium}\n` +
              `**Admins:** ${stats.users.admin}\n` +
              `**Banned:** ${stats.users.banned}`,
            inline: true
          },
          {
            name: '🖥️ Server Statistics',
            value: 
              `**Total Servers:** ${stats.servers.total}\n` +
              `**Active:** ${stats.servers.active} (${activePercentage}%)\n` +
              `**Expired:** ${stats.servers.expired}\n` +
              `**Success Rate:** ${activePercentage}%`,
            inline: true
          },
          {
            name: '💰 Economy Statistics',
            value: 
              `**Total Coins:** ${stats.economy.totalCoins.toLocaleString()}\n` +
              `**Total Spent:** ${stats.economy.totalSpent.toLocaleString()}\n` +
              `**Circulation:** ${stats.economy.circulation.toLocaleString()}\n` +
              `**Avg per User:** ${Math.floor(stats.economy.totalCoins / Math.max(1, stats.users.verified)).toLocaleString()}`,
            inline: true
          },
          {
            name: '🎯 Resource Usage',
            value: 
              `**Total RAM:** ${formatBytes(stats.resources.ram)}\n` +
              `**Total Disk:** ${formatBytes(stats.resources.disk)}\n` +
              `**Total CPU:** ${stats.resources.cpu}%`,
            inline: true
          },
          {
            name: '📦 Catalog & Products',
            value: 
              `**Total Products:** ${stats.products.total}\n` +
              `**Available:** ${stats.products.available}\n` +
              `**Active Vouchers:** ${stats.vouchers.active}/${stats.vouchers.total}\n` +
              `**Redeem Codes:** ${stats.redeemCodes.total - stats.redeemCodes.used} unused`,
            inline: true
          },
          {
            name: '⚙️ System Status',
            value: 
              `**Bot Status:** 🟢 Online\n` +
              `**Database:** 🟢 Connected\n` +
              `**Pterodactyl:** 🟢 Connected\n` +
              `**Jobs:** 🟢 Running`,
            inline: true
          }
        )
        .setFooter({ 
          text: `OnePanel Bot v1.0 | Requested by ${interaction.user.username}` 
        })
        .setTimestamp();

      // Add top performers if available
      if (stats.users.verified > 0) {
        const topCoins = await require('../../utils/monitor').getTopUsers(3);
        if (topCoins.length > 0) {
          const topList = topCoins.map((u, i) => 
            `${i + 1}. **${u.discordUsername}** - ${u.coins.toLocaleString()} coins`
          ).join('\n');

          embed.addFields({
            name: '🏆 Top Users (by Coins)',
            value: topList,
            inline: false
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });

      console.log(`📊 Server monitor viewed by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in server-monitor command:', error);
      
      await interaction.editReply({
        embeds: [require('../../utils/embeds').errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data monitoring.'
        )]
      });
    }
  }
};