const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Lihat informasi profil Anda atau user lain')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User yang ingin dilihat (kosongkan untuk melihat profil sendiri)')
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

      // Create profile embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(`📋 Profile: ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { 
            name: '📧 Email', 
            value: userData.isVerified ? userData.email : '❌ Not verified', 
            inline: true 
          },
          { 
            name: '👤 Pterodactyl Username', 
            value: userData.pterodactylUsername || '❌ Not created', 
            inline: true 
          },
          { 
            name: '✅ Verification Status', 
            value: userData.isVerified ? '✅ Verified' : '❌ Not verified', 
            inline: true 
          },
          { 
            name: '💰 Coins', 
            value: `${userData.coins.toLocaleString()} coins`, 
            inline: true 
          },
          { 
            name: '🔥 Daily Streak', 
            value: `${userData.dailyStreak} days`, 
            inline: true 
          },
          { 
            name: '🎖️ Status', 
            value: userData.isPremium ? '⭐ Premium' : '🆓 Free', 
            inline: true 
          }
        )
        .setFooter({ text: `User ID: ${userData.discordId}` })
        .setTimestamp();

      // Add admin badge if user is admin
      if (userData.isAdmin) {
        embed.setDescription('👑 **Server Administrator**');
      }

      // Add banned status if banned
      if (userData.isBanned) {
        embed.setColor('#ff0000');
        embed.setDescription('🚫 **User is Banned**');
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in profile command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data profil.'
        )]
      });
    }
  }
};