const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Katalog = require('../../models/Katalog');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatPrice } = require('../../utils/voucher');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-katalog')
    .setDescription('Delete a product from catalog (Admin only)')
    .addStringOption(option =>
      option
        .setName('product-id')
        .setDescription('The product ID to delete')
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

      const productId = interaction.options.getString('product-id').toUpperCase().trim();

      // Find product
      const product = await Katalog.findOne({ productId: productId });

      if (!product) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Product Not Found',
            `Product dengan ID **${productId}** tidak ditemukan.`
          )]
        });
      }

      // Get info before deletion
      const name = product.name;
      const price = product.price;

      // Delete product
      await Katalog.deleteOne({ productId: productId });

      await interaction.editReply({
        embeds: [successEmbed(
          'Product Deleted',
          `Product **${name}** (\`${productId}\`) berhasil dihapus dari katalog.\n\n` +
          `💰 Price: ${formatPrice(price)}\n` +
          `🗑️ Deleted by: ${interaction.user.username}`
        )]
      });

      console.log(`🗑️ Product deleted: ${productId} (${name}) by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in delete-katalog command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat menghapus product.'
        )]
      });
    }
  }
};