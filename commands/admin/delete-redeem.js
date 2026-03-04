const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const RedeemCode = require('../../models/RedeemCode');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-redeem')
    .setDescription('Delete a redeem code (Admin only)')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('The redeem code to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user is admin in database
      const adminUser = await User.findOne({ 
        discordId: interaction.user.id,
        isAdmin: true 
      });

      if (!adminUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Permission Denied',
            'Anda tidak memiliki permission untuk menggunakan command ini.\n\n' +
            'Hanya admin yang bisa menghapus redeem code.'
          )]
        });
      }

      const code = interaction.options.getString('code').toUpperCase().trim();

      // Find redeem code
      const redeemCode = await RedeemCode.findOne({ code: code });

      if (!redeemCode) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Not Found',
            `Redeem code **${code}** tidak ditemukan.`
          )]
        });
      }

      // Get code info before deletion
      const wasUsed = redeemCode.isUsed;
      const coinValue = redeemCode.coins;

      // Delete the code
      await RedeemCode.deleteOne({ code: code });

      // Create success embed
      await interaction.editReply({
        embeds: [successEmbed(
          'Redeem Code Deleted',
          `Redeem code **${code}** berhasil dihapus.\n\n` +
          `💰 Value: **${coinValue.toLocaleString()}** coins\n` +
          `📊 Status: ${wasUsed ? '✅ Was used' : '❌ Never used'}\n` +
          `🗑️ Deleted by: ${interaction.user.username}`
        )]
      });

      // Log to console
      console.log(`🗑️ Redeem code deleted: ${code} by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in delete-redeem command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat menghapus redeem code.'
        )]
      });
    }
  }
};