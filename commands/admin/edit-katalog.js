const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Katalog = require('../../models/Katalog');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-katalog')
    .setDescription('Edit a product in catalog (Admin only)')
    .addStringOption(option =>
      option
        .setName('product-id')
        .setDescription('Product ID to edit')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('price')
        .setDescription('New price')
        .setRequired(false)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option
        .setName('stock')
        .setDescription('New stock (0 for unlimited)')
        .setRequired(false)
        .setMinValue(0)
    )
    .addBooleanOption(option =>
      option
        .setName('available')
        .setDescription('Set availability status')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('New product name')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('New description')
        .setRequired(false)
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
      const newPrice = interaction.options.getInteger('price');
      const newStock = interaction.options.getInteger('stock');
      const newAvailable = interaction.options.getBoolean('available');
      const newName = interaction.options.getString('name');
      const newDescription = interaction.options.getString('description');

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

      // Track changes
      const changes = [];

      // Update fields
      if (newPrice !== null) {
        changes.push(`💰 Price: ${product.price} → ${newPrice} coins`);
        product.price = newPrice;
      }

      if (newStock !== null) {
        const oldStock = product.stock === null ? 'Unlimited' : product.stock;
        const newStockDisplay = newStock === 0 ? 'Unlimited' : newStock;
        changes.push(`📦 Stock: ${oldStock} → ${newStockDisplay}`);
        product.stock = newStock === 0 ? null : newStock;
      }

      if (newAvailable !== null) {
        changes.push(`📊 Status: ${product.isAvailable ? 'Available' : 'Unavailable'} → ${newAvailable ? 'Available' : 'Unavailable'}`);
        product.isAvailable = newAvailable;
      }

      if (newName) {
        changes.push(`📦 Name: ${product.name} → ${newName}`);
        product.name = newName;
      }

      if (newDescription) {
        changes.push(`📝 Description updated`);
        product.description = newDescription;
      }

      if (changes.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Changes',
            'Tidak ada perubahan yang dilakukan.\n\nTentukan minimal satu field untuk diupdate.'
          )]
        });
      }

      await product.save();

      await interaction.editReply({
        embeds: [successEmbed(
          'Product Updated',
          `Product **${product.name}** (\`${productId}\`) berhasil diupdate!\n\n` +
          `**Changes:**\n${changes.join('\n')}\n\n` +
          `✏️ Updated by: ${interaction.user.username}`
        )]
      });

      console.log(`✏️ Product edited: ${productId} by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in edit-katalog command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengedit product.'
        )]
      });
    }
  }
};