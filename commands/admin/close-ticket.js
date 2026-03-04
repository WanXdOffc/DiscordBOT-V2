const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-ticket')
    .setDescription('Close a ticket (Admin only)')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for closing')
        .setRequired(false)
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

      // Check if command is used in a ticket channel
      const ticket = await Ticket.findOne({ 
        channelId: interaction.channel.id,
        status: { $in: ['open', 'pending'] }
      });

      if (!ticket) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not a Ticket',
            'Command ini hanya bisa digunakan di ticket channel yang masih open.'
          )]
        });
      }

      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Close ticket in database
      await ticket.close(interaction.user.id, interaction.user.username, reason);

      // Send closing message
      const closeEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔒 Ticket Closed')
        .setDescription(
          `Ticket #${ticket.ticketNumber} telah ditutup oleh ${interaction.user}.\n\n` +
          `**Reason:** ${reason}\n\n` +
          `Channel akan dihapus dalam 10 detik.`
        )
        .addFields(
          { name: '🎫 Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
          { name: '📋 Type', value: ticket.type === 'coins' ? '💰 Coins' : '⭐ Premium', inline: true },
          { name: '👤 User', value: ticket.username, inline: true },
          { name: '👮 Closed By', value: interaction.user.username, inline: true },
          { name: '📅 Created', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`, inline: true },
          { name: '📅 Closed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Thank you for using our service!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [closeEmbed] });

      // Try to send DM to ticket owner
      try {
        const ticketOwner = await interaction.client.users.fetch(ticket.userId);
        
        const dmEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🔒 Your Ticket Has Been Closed')
          .setDescription(
            `Your ticket #${ticket.ticketNumber} has been closed.\n\n` +
            `**Reason:** ${reason}`
          )
          .addFields(
            { name: '🎫 Ticket ID', value: `\`${ticket.ticketId}\``, inline: true },
            { name: '📋 Type', value: ticket.type === 'coins' ? '💰 Coins' : '⭐ Premium', inline: true },
            { name: '👮 Closed By', value: interaction.user.username, inline: true }
          )
          .setFooter({ text: 'You can create a new ticket anytime with /buy' })
          .setTimestamp();

        await ticketOwner.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error('Could not send ticket close DM:', dmError);
      }

      // Delete channel after 10 seconds
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
          console.log(`🗑️ Ticket channel deleted: ${ticket.ticketId}`);
        } catch (error) {
          console.error('Error deleting ticket channel:', error);
        }
      }, 10000);

      console.log(`🔒 Ticket #${ticket.ticketNumber} closed by ${interaction.user.username}. Reason: ${reason}`);

    } catch (error) {
      console.error('Error in close-ticket command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat menutup ticket.'
        )]
      });
    }
  }
};