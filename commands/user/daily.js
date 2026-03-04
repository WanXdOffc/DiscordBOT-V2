const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { 
  calculateDailyReward, 
  canClaimDaily, 
  shouldResetStreak,
  getTimeUntilDaily,
  formatCoins,
  addCoins
} = require('../../utils/economy');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward (50-500 coins + streak bonus)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find user
      const user = await User.findOne({ discordId: interaction.user.id });

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Registered',
            'Anda belum terdaftar.\n\nGunakan `/register` terlebih dahulu.'
          )]
        });
      }

      if (!user.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Verified',
            'Anda belum terverifikasi.\n\nGunakan `/verify <code>` untuk verifikasi.'
          )]
        });
      }

      // Check if can claim daily
      if (!canClaimDaily(user.lastDaily)) {
        const timeLeft = getTimeUntilDaily(user.lastDaily);
        
        return interaction.editReply({
          embeds: [errorEmbed(
            'Already Claimed',
            `Anda sudah mengambil daily reward hari ini.\n\n` +
            `⏰ Next claim in: **${timeLeft}**\n` +
            `🔥 Current streak: **${user.dailyStreak} days**`
          )]
        });
      }

      // Check if streak should reset
      let newStreak = user.dailyStreak + 1;
      if (shouldResetStreak(user.lastDaily)) {
        newStreak = 1; // Reset streak
      }

      // Calculate reward
      const dailyReward = calculateDailyReward(newStreak);
      let totalReward = dailyReward;
      let weeklyBonus = 0;

      // Check for weekly bonus (7 days streak)
      if (newStreak % 7 === 0 && newStreak > 0) {
        weeklyBonus = config.economy.weeklyBonus;
        totalReward += weeklyBonus;
      }

      // Update user
      await addCoins(user, totalReward, 'Daily Reward');
      user.lastDaily = Date.now();
      user.dailyStreak = newStreak;
      await user.save();

      // Create reward embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎁 Daily Reward Claimed!')
        .setDescription(`Congratulations! You received your daily reward!`)
        .addFields(
          { 
            name: '💰 Daily Reward', 
            value: `**+${dailyReward.toLocaleString()}** coins`, 
            inline: true 
          },
          { 
            name: '🔥 Current Streak', 
            value: `**${newStreak}** days`, 
            inline: true 
          },
          { 
            name: '💳 New Balance', 
            value: formatCoins(user.coins), 
            inline: true 
          }
        )
        .setFooter({ text: 'Come back tomorrow for more!' })
        .setTimestamp();

      // Add weekly bonus field if applicable
      if (weeklyBonus > 0) {
        embed.addFields({
          name: '🎉 WEEKLY BONUS!',
          value: `**+${weeklyBonus.toLocaleString()}** coins for ${newStreak} days streak!`,
          inline: false
        });
        embed.setColor('#FFD700'); // Gold color for bonus
      }

      // Add streak milestone messages
      if (newStreak === 1 && shouldResetStreak(user.lastDaily)) {
        embed.setDescription(
          '⚠️ Your streak was reset! Start building it again.\n\n' +
          'Come back daily to build your streak and get better rewards!'
        );
        embed.setColor('#ff9900'); // Orange for reset
      } else if (newStreak === 3) {
        embed.setDescription(
          '🔥 3 days streak! You\'re getting better luck now!\n\n' +
          'Keep claiming daily to increase your chances of higher rewards!'
        );
      } else if (newStreak === 7) {
        embed.setDescription(
          '⭐ Amazing! 7 days streak completed!\n\n' +
          `You earned a **${weeklyBonus} coins** bonus! Keep going!`
        );
      } else if (newStreak >= 14) {
        embed.setDescription(
          '👑 You\'re on fire! Your dedication is impressive!\n\n' +
          'Maximum luck bonus active! Keep the streak alive!'
        );
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in daily command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil daily reward.'
        )]
      });
    }
  }
};