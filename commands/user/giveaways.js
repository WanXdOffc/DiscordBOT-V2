const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { errorEmbed } = require('../../utils/embeds');
const { formatTimeRemaining, getGiveawayStatusEmoji } = require('../../utils/giveaway');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaways')
    .setDescription('View active giveaways'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Get active giveaways
      const giveaways = await Giveaway.find({ status: 'active' }).sort({ createdAt: -1 });

      if (giveaways.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Giveaways',
            'Tidak ada giveaway yang sedang aktif saat ini.\n\nTunggu admin membuat giveaway baru!'
          )]
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('🎉 Active Giveaways')
        .setDescription(`Total: **${giveaways.length}** active giveaway(s)`)
        .setTimestamp();

      // Add each giveaway
      for (const giveaway of giveaways.slice(0, 10)) {
        const timeLeft = formatTimeRemaining(giveaway.endsAt);
        const emoji = getGiveawayStatusEmoji(giveaway.status);

        embed.addFields({
          name: `${emoji} ${giveaway.prize}`,
          value: 
            `**ID:** \`${giveaway.giveawayId}\`\n` +
            `**Ends:** ${timeLeft}\n` +
            `**Participants:** ${giveaway.participants.length}/${giveaway.maxParticipants}\n` +
            `**Channel:** <#${giveaway.channelId}>`,
          inline: false
        });
      }

      if (giveaways.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${giveaways.length} giveaways` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in giveaways command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data giveaways.'
        )]
      });
    }
  }
};