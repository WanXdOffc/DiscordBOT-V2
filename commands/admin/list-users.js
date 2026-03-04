const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-users')
    .setDescription('List all registered users (Admin only)')
    .addStringOption(option =>
      option
        .setName('filter')
        .setDescription('Filter users')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Verified', value: 'verified' },
          { name: 'Unverified', value: 'unverified' },
          { name: 'Premium', value: 'premium' },
          { name: 'Banned', value: 'banned' },
          { name: 'Admins', value: 'admin' }
        )
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

      const filter = interaction.options.getString('filter') || 'all';

      // Build query
      let query = {};
      switch (filter) {
        case 'verified':
          query = { isVerified: true };
          break;
        case 'unverified':
          query = { isVerified: false };
          break;
        case 'premium':
          query = { isPremium: true };
          break;
        case 'banned':
          query = { isBanned: true };
          break;
        case 'admin':
          query = { isAdmin: true };
          break;
      }

      // Get users
      const users = await User.find(query).sort({ createdAt: -1 }).limit(25);

      if (users.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Users Found',
            `Tidak ada user dengan filter: **${filter}**`
          )]
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(`👥 User List (${filter})`)
        .setDescription(`Total: **${users.length}** users`)
        .setTimestamp();

      // Add users
      for (const user of users.slice(0, 20)) {
        let badges = [];
        if (user.isAdmin) badges.push('👑 Admin');
        if (user.isPremium) badges.push('⭐ Premium');
        if (user.isBanned) badges.push('🚫 Banned');
        if (!user.isVerified) badges.push('❌ Unverified');

        const badgeString = badges.length > 0 ? badges.join(' ') : '✅ Verified';

        embed.addFields({
          name: `${user.discordUsername}`,
          value: 
            `${badgeString}\n` +
            `💰 ${user.coins.toLocaleString()} coins | 🔥 ${user.dailyStreak} streak\n` +
            `📧 ${user.email}`,
          inline: false
        });
      }

      if (users.length > 20) {
        embed.setFooter({ text: `Showing 20 of ${users.length} users` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in list-users command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data users.'
        )]
      });
    }
  }
};