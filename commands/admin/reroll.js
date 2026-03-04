const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const Giveaway = require('../../models/Giveaway');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reroll')
    .setDescription('Reroll giveaway winner (Admin only)')
    .addStringOption(option =>
      option
        .setName('giveaway-id')
        .setDescription('Giveaway ID to reroll')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      // Check if user is admin
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

      const giveawayId = interaction.options.getString('giveaway-id').toUpperCase().trim();

      // Find giveaway
      const giveaway = await Giveaway.findOne({ giveawayId: giveawayId });

      if (!giveaway) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Giveaway Not Found',
            `Giveaway dengan ID **${giveawayId}** tidak ditemukan.`
          )]
        });
      }

      if (giveaway.status !== 'ended') {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Giveaway Not Ended',
            'Giveaway ini belum berakhir. Tunggu sampai selesai atau akhiri manual terlebih dahulu.'
          )]
        });
      }

      if (giveaway.participants.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Participants',
            'Tidak ada peserta dalam giveaway ini.'
          )]
        });
      }

      // Select new winner
      await giveaway.selectWinner(interaction.guild);

      const winner = giveaway.winner;

      // Create announcement embed
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🔄 Giveaway Rerolled!')
        .setDescription(
          `A new winner has been selected!\n\n` +
          `**Prize:** ${giveaway.prize}\n` +
          `**New Winner:** <@${winner.userId}>\n\n` +
          `Congratulations! 🎉`
        )
        .setFooter({ text: `Rerolled by ${interaction.user.username}` })
        .setTimestamp();

      // Try to update original giveaway message
      try {
        const channel = await interaction.guild.channels.fetch(giveaway.channelId);
        const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        
        const originalEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]);
        originalEmbed.setColor('#FFD700');
        originalEmbed.setTitle('🏆 GIVEAWAY ENDED (REROLLED)');
        originalEmbed.addFields({
          name: '🎉 New Winner',
          value: `<@${winner.userId}>`,
          inline: false
        });

        await giveawayMessage.edit({ 
          embeds: [originalEmbed],
          components: [] 
        });
      } catch (error) {
        console.error('Error updating giveaway message:', error);
      }

      // Send reroll announcement
      await interaction.editReply({ embeds: [embed] });

      // Try to DM new winner
      try {
        const winnerUser = await interaction.client.users.fetch(winner.userId);
        
        const dmEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🎉 You Won the Giveaway! (Rerolled)')
          .setDescription(
            `Congratulations! You are the new winner!\n\n` +
            `**Prize:** ${giveaway.prize}\n\n` +
            `Please contact the server admins to claim your prize.`
          )
          .setFooter({ text: `Giveaway ID: ${giveaway.giveawayId}` })
          .setTimestamp();

        await winnerUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error('Could not send winner DM:', dmError);
      }

      console.log(`🔄 Giveaway ${giveawayId} rerolled by ${interaction.user.username}. New winner: ${winner.username}`);

    } catch (error) {
      console.error('Error in reroll command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat reroll giveaway.'
        )]
      });
    }
  }
};