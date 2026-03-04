const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const { formatCoins } = require('../../utils/economy');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View top users by coins or streak')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Coins', value: 'coins' },
          { name: 'Daily Streak', value: 'streak' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const type = interaction.options.getString('type') || 'coins';

      // Get top users
      let users;
      let sortField;
      let title;
      let emoji;

      if (type === 'coins') {
        users = await User.find({ isVerified: true }).sort({ coins: -1 }).limit(10);
        sortField = 'coins';
        title = '💰 Top 10 Richest Users';
        emoji = '💰';
      } else {
        users = await User.find({ isVerified: true }).sort({ dailyStreak: -1 }).limit(10);
        sortField = 'dailyStreak';
        title = '🔥 Top 10 Daily Streak';
        emoji = '🔥';
      }

      if (users.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Data',
            'Belum ada data untuk leaderboard.'
          )]
        });
      }

      // Create leaderboard embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(title)
        .setDescription('Top performers in our community!')
        .setTimestamp();

      // Add users to leaderboard
      let description = '';
      const medals = ['🥇', '🥈', '🥉'];

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const rank = i + 1;
        const medal = medals[i] || `**${rank}.**`;
        
        const value = type === 'coins' 
          ? `${user.coins.toLocaleString()} coins`
          : `${user.dailyStreak} days`;

        description += `${medal} **${user.discordUsername}** - ${emoji} ${value}\n`;
      }

      embed.setDescription(description);

      // Find current user position
      const currentUser = await User.findOne({ discordId: interaction.user.id });
      if (currentUser && currentUser.isVerified) {
        const allUsers = await User.find({ isVerified: true }).sort({ [sortField]: -1 });
        const userRank = allUsers.findIndex(u => u.discordId === currentUser.discordId) + 1;
        
        const userValue = type === 'coins'
          ? formatCoins(currentUser.coins)
          : `🔥 ${currentUser.dailyStreak} days`;

        embed.addFields({
          name: '📊 Your Rank',
          value: `**#${userRank}** of ${allUsers.length} users\n${userValue}`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in leaderboard command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data leaderboard.'
        )]
      });
    }
  }
};