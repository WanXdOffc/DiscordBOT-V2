const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { errorEmbed } = require('../../utils/embeds');
const { formatPrice } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('View detailed user information (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to view')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if executor is admin
      const adminUser = await User.findOne({ 
        discordId: interaction.user.id,
        isAdmin: true 
      });

      if (!adminUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Permission Denied',
            'Anda tidak memiliki permission untuk menggunakan command ini.'
          )]
        });
      }

      const targetDiscordUser = interaction.options.getUser('user');

      // Find user
      const user = await User.findOne({ discordId: targetDiscordUser.id });

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Found',
            `${targetDiscordUser.username} tidak ditemukan di database.`
          )]
        });
      }

      // Get user's servers
      const servers = await Server.find({ ownerId: user.discordId });
      const activeServers = servers.filter(s => s.isActive);
      const totalSpent = servers.reduce((sum, s) => sum + s.totalPaid, 0);

      // Create info embed
      const embed = new EmbedBuilder()
        .setColor(user.isBanned ? '#ff0000' : config.bot.embedColor)
        .setTitle(`👤 User Info: ${user.discordUsername}`)
        .setThumbnail(targetDiscordUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: '📋 Basic Information',
            value: 
              `**Discord ID:** ${user.discordId}\n` +
              `**Email:** ${user.email}\n` +
              `**Full Name:** ${user.firstName} ${user.lastName}\n` +
              `**Pterodactyl ID:** ${user.pterodactylId || 'N/A'}`,
            inline: false
          },
          {
            name: '🎖️ Status',
            value: 
              `**Verified:** ${user.isVerified ? '✅ Yes' : '❌ No'}\n` +
              `**Admin:** ${user.isAdmin ? '👑 Yes' : '❌ No'}\n` +
              `**Premium:** ${user.isPremium ? '⭐ Yes' : '🆓 Free'}\n` +
              `**Banned:** ${user.isBanned ? '🚫 Yes' : '✅ No'}`,
            inline: true
          },
          {
            name: '💰 Economy',
            value: 
              `**Balance:** ${formatPrice(user.coins)}\n` +
              `**Daily Streak:** ${user.dailyStreak} days\n` +
              `**Last Daily:** ${user.lastDaily ? `<t:${Math.floor(new Date(user.lastDaily).getTime() / 1000)}:R>` : 'Never'}\n` +
              `**Total Spent:** ${formatPrice(totalSpent)}`,
            inline: true
          },
          {
            name: '🖥️ Servers',
            value: 
              `**Total Created:** ${servers.length}\n` +
              `**Active:** ${activeServers.length}\n` +
              `**Expired:** ${servers.length - activeServers.length}\n` +
              `**Limit:** ${user.isPremium ? 'Unlimited' : '2 servers'}`,
            inline: true
          },
          {
            name: '📅 Account Dates',
            value: 
              `**Registered:** <t:${Math.floor(new Date(user.createdAt).getTime() / 1000)}:R>\n` +
              `**Last Updated:** <t:${Math.floor(new Date(user.updatedAt).getTime() / 1000)}:R>`,
            inline: false
          }
        )
        .setFooter({ text: `Requested by ${interaction.user.username}` })
        .setTimestamp();

      // Add active servers list if any
      if (activeServers.length > 0) {
        const serverList = activeServers.slice(0, 5).map(s => 
          `• **${s.productName}** (\`${s.serverId}\`) - Expires <t:${Math.floor(s.expiresAt.getTime() / 1000)}:R>`
        ).join('\n');

        embed.addFields({
          name: '📋 Active Servers',
          value: serverList + (activeServers.length > 5 ? `\n...and ${activeServers.length - 5} more` : ''),
          inline: false
        });
      }

      // Add warning if banned
      if (user.isBanned) {
        embed.setDescription('⚠️ **THIS USER IS BANNED**');
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in user-info command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data user.'
        )]
      });
    }
  }
};