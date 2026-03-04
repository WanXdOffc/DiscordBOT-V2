const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { deleteServer } = require('../../utils/pterodactyl');
const { addCoins } = require('../../utils/economy');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { formatPrice } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-server')
    .setDescription('Delete your server (refund available)')
    .addStringOption(option =>
      option
        .setName('server-id')
        .setDescription('Server ID to delete')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find user
      const user = await User.findOne({ discordId: interaction.user.id });

      if (!user || !user.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Registered',
            'Anda belum terdaftar dan terverifikasi.'
          )]
        });
      }

      const serverId = interaction.options.getString('server-id').toUpperCase().trim();

      // Find server
      const server = await Server.findOne({ 
        serverId: serverId,
        ownerId: user.discordId,
        isActive: true
      });

      if (!server) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Server Not Found',
            `Server dengan ID **${serverId}** tidak ditemukan atau sudah dihapus.`
          )]
        });
      }

      // Calculate refund
      const refundAmount = server.calculateRefund();
      const daysUsed = Math.ceil((Date.now() - server.createdAt) / (1000 * 60 * 60 * 24));
      const daysRemaining = server.daysRemaining();

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('⚠️ Confirm Server Deletion')
        .setDescription(
          `Are you sure you want to delete this server?\n\n` +
          `**This action cannot be undone!**`
        )
        .addFields(
          { name: '🖥️ Server', value: server.productName, inline: true },
          { name: '🆔 Server ID', value: `\`${serverId}\``, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '💰 Original Price', value: formatPrice(server.paidPrice), inline: true },
          { name: '📅 Days Used', value: `${daysUsed} days`, inline: true },
          { name: '📅 Days Remaining', value: `${daysRemaining} days`, inline: true },
          { name: '💵 Refund Amount', value: `**${formatPrice(refundAmount)}**`, inline: true },
          { name: '💳 Your Balance', value: formatPrice(user.coins), inline: true },
          { name: '💳 After Refund', value: formatPrice(user.coins + refundAmount), inline: true }
        )
        .setFooter({ text: 'Select an option below' })
        .setTimestamp();

      if (refundAmount === 0) {
        confirmEmbed.addFields({
          name: '⚠️ No Refund',
          value: 'Server sudah mendekati expiry, tidak ada refund yang tersedia.',
          inline: false
        });
      }

      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`delete_server_confirm_${serverId}`)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId(`delete_server_cancel_${serverId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
        );

      await interaction.editReply({ 
        embeds: [confirmEmbed],
        components: [row]
      });

    } catch (error) {
      console.error('Error in delete-server command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat memproses permintaan.'
        )]
      });
    }
  }
};

// Export button handler
module.exports.handleButton = async (interaction, serverId, action) => {
  await interaction.deferUpdate();

  if (action === 'cancel') {
    return interaction.editReply({
      embeds: [require('../../utils/embeds').infoEmbed(
        'Deletion Cancelled',
        'Penghapusan server dibatalkan.'
      )],
      components: []
    });
  }

  try {
    const User = require('../../models/User');
    const Server = require('../../models/Server');
    const { deleteServer } = require('../../utils/pterodactyl');
    const { addCoins } = require('../../utils/economy');
    const { successEmbed, errorEmbed } = require('../../utils/embeds');
    const { formatPrice } = require('../../utils/voucher');

    const user = await User.findOne({ discordId: interaction.user.id });
    const server = await Server.findOne({ 
      serverId: serverId,
      ownerId: user.discordId,
      isActive: true
    });

    if (!server) {
      return interaction.editReply({
        embeds: [errorEmbed('Error', 'Server tidak ditemukan.')],
        components: []
      });
    }

    // Calculate refund
    const refundAmount = server.calculateRefund();

    // Delete from Pterodactyl
    try {
      await deleteServer(server.pterodactylId);
    } catch (pterodactylError) {
      console.error('Pterodactyl deletion error:', pterodactylError);
      // Continue anyway, mark as deleted in our database
    }

    // Mark as deleted in database
    server.isActive = false;
    server.deletedAt = Date.now();
    await server.save();

    // Refund coins
    if (refundAmount > 0) {
      await addCoins(user, refundAmount, `Refund: ${server.productName}`);
    }

    // Send success message
    await interaction.editReply({
      embeds: [successEmbed(
        'Server Deleted',
        `✅ Server **${server.productName}** berhasil dihapus!\n\n` +
        `💵 Refund: ${formatPrice(refundAmount)}\n` +
        `💳 New Balance: ${formatPrice(user.coins)}\n\n` +
        `Server telah dihapus dari Pterodactyl panel.`
      )],
      components: []
    });

    console.log(`🗑️ Server deleted: ${serverId} by ${interaction.user.username}, refund: ${refundAmount}`);

  } catch (error) {
    console.error('Error deleting server:', error);
    
    await interaction.editReply({
      embeds: [errorEmbed(
        'Deletion Failed',
        'Terjadi kesalahan saat menghapus server.\n\nSilakan hubungi admin untuk bantuan.'
      )],
      components: []
    });
  }
};