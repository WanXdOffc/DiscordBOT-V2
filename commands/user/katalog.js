const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Katalog = require('../../models/Katalog');
const { errorEmbed } = require('../../utils/embeds');
const { formatRAM, formatDisk, formatCPU, formatPrice } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('katalog')
    .setDescription('View available panel products')
    .addStringOption(option =>
      option
        .setName('product-id')
        .setDescription('View specific product details')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const productId = interaction.options.getString('product-id');

      // If product ID specified, show details
      if (productId) {
        const product = await Katalog.findOne({ 
          productId: productId.toUpperCase().trim(),
          isAvailable: true 
        });

        if (!product) {
          return interaction.editReply({
            embeds: [errorEmbed(
              'Product Not Found',
              `Product dengan ID **${productId}** tidak ditemukan atau tidak tersedia.`
            )]
          });
        }

        // Show detailed product info
        const embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle(`📦 ${product.name}`)
          .setDescription(product.description || 'No description available.')
          .addFields(
            { name: '🆔 Product ID', value: `\`${product.productId}\``, inline: true },
            { name: '💰 Price', value: formatPrice(product.price), inline: true },
            { name: '⏰ Duration', value: `${product.durationDays} days`, inline: true },
            { name: '🎯 RAM', value: formatRAM(product.ram), inline: true },
            { name: '💾 Disk', value: formatDisk(product.disk), inline: true },
            { name: '⚡ CPU', value: formatCPU(product.cpu), inline: true },
            { name: '🗄️ Databases', value: `${product.databases}`, inline: true },
            { name: '📦 Stock', value: product.stock ? `${product.stock} units` : '♾️ Unlimited', inline: true },
            { name: '📊 Status', value: product.isInStock() ? '🟢 In Stock' : '🔴 Out of Stock', inline: true }
          )
          .setFooter({ text: `Use /buy-panel to purchase this product` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      // Show all available products
      const products = await Katalog.find({ isAvailable: true }).sort({ price: 1 });

      if (products.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Products Available',
            'Belum ada product yang tersedia di katalog.\n\nSilakan hubungi admin untuk informasi lebih lanjut.'
          )]
        });
      }

      // Create catalog embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('📦 Panel Catalog')
        .setDescription(
          'Berikut adalah daftar panel yang tersedia untuk dibeli.\n' +
          'Gunakan `/katalog product-id:<ID>` untuk melihat detail lengkap.\n\n' +
          '💡 **Tip:** Gunakan voucher untuk mendapatkan diskon!'
        )
        .setFooter({ text: `Total: ${products.length} products available` })
        .setTimestamp();

      // Add each product
      for (const product of products.slice(0, 25)) {
        const specs = `💰 ${formatPrice(product.price)} | ` +
                     `🎯 ${formatRAM(product.ram)} | ` +
                     `💾 ${formatDisk(product.disk)} | ` +
                     `⚡ ${formatCPU(product.cpu)}`;
        
        const status = product.isInStock() ? '🟢' : '🔴';
        const stock = product.stock ? ` | Stock: ${product.stock}` : '';

        embed.addFields({
          name: `${status} \`${product.productId}\` - ${product.name}`,
          value: `${specs}\n⏰ ${product.durationDays} days${stock}`,
          inline: false
        });
      }

      if (products.length > 25) {
        embed.setFooter({ text: `Showing 25 of ${products.length} products` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in katalog command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data katalog.'
        )]
      });
    }
  }
};