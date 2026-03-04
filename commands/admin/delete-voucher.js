const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Voucher = require('../../models/Voucher');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-voucher')
    .setDescription('Delete a voucher (Admin only)')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('The voucher code to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

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

      const code = interaction.options.getString('code').toUpperCase().trim();

      // Find voucher
      const voucher = await Voucher.findOne({ code: code });

      if (!voucher) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Voucher Not Found',
            `Voucher code **${code}** tidak ditemukan.`
          )]
        });
      }

      // Get info before deletion
      const discount = voucher.discount;
      const usedCount = voucher.usedBy.length;
      const maxUsers = voucher.maxUsers;

      // Delete voucher
      await Voucher.deleteOne({ code: code });

      await interaction.editReply({
        embeds: [successEmbed(
          'Voucher Deleted',
          `Voucher **${code}** berhasil dihapus.\n\n` +
          `💸 Discount: **${discount}%** OFF\n` +
          `👥 Used: ${usedCount}/${maxUsers} users\n` +
          `🗑️ Deleted by: ${interaction.user.username}`
        )]
      });

      console.log(`🗑️ Voucher deleted: ${code} by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in delete-voucher command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat menghapus voucher.'
        )]
      });
    }
  }
};