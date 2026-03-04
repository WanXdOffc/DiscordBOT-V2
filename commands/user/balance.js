const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const { formatCoins, getTimeUntilDaily } = require('../../utils/economy');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance and economy stats')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Find user in database
      const userData = await User.findOne({ discordId: targetUser.id });

      if (!userData) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Found',
            `${targetUser.username} belum terdaftar.\n\n` +
            'Gunakan `/register` untuk mendaftar.'
          )]
        });
      }

      if (!userData.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Verified',
            `${targetUser.username} belum terverifikasi.\n\n` +
            'Gunakan `/verify <code>` untuk verifikasi.'
          )]
        });
      }

      // Calculate next daily
      const nextDaily = getTimeUntilDaily(userData.lastDaily);
      const isAvailable = nextDaily === 'Available now!';

      // Create balance embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(`💰 ${targetUser.username}'s Balance`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: '💳 Current Balance',
            value: formatCoins(userData.coins),
            inline: true
          },
          {
            name: '🔥 Daily Streak',
            value: `**${userData.dailyStreak}** days`,
            inline: true
          },
          {
            name: '⏰ Next Daily',
            value: isAvailable ? '✅ Available now!' : `⏳ ${nextDaily}`,
            inline: true
          }
        )
        .setFooter({ text: `User ID: ${userData.discordId}` })
        .setTimestamp();

      // Add status badges
      const badges = [];
      if (userData.isPremium) badges.push('⭐ Premium');
      if (userData.isAdmin) badges.push('👑 Admin');
      if (userData.dailyStreak >= 7) badges.push('🔥 Streak Master');
      if (userData.coins >= 10000) badges.push('💎 Rich');
      
      if (badges.length > 0) {
        embed.addFields({
          name: '🏅 Badges',
          value: badges.join(' • '),
          inline: false
        });
      }

      // Add streak bonus info
      const nextMilestone = Math.ceil((userData.dailyStreak + 1) / 7) * 7;
      const daysUntilBonus = nextMilestone - userData.dailyStreak;
      
      if (daysUntilBonus <= 7 && daysUntilBonus > 0) {
        embed.addFields({
          name: '🎯 Next Milestone',
          value: `${daysUntilBonus} more day(s) until **${nextMilestone} days** streak bonus!`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in balance command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data balance.'
        )]
      });
    }
  }
};