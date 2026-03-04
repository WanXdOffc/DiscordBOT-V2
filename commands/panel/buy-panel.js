const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const User = require('../../models/User');
const Katalog = require('../../models/Katalog');
const Voucher = require('../../models/Voucher');
const Server = require('../../models/Server');
const { createServer } = require('../../utils/pterodactyl');
const { removeCoins, hasEnoughCoins } = require('../../utils/economy');
const { calculateDiscount, formatPrice, formatRAM, formatDisk, formatCPU } = require('../../utils/voucher');
const { 
  generateServerId, 
  generateServerName, 
  canCreateServer, 
  getServerLimit,
  calculateExpiryDate,
  calculateDailyCost 
} = require('../../utils/server');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy-panel')
    .setDescription('Purchase a panel from catalog')
    .addStringOption(option =>
      option
        .setName('product-id')
        .setDescription('Product ID from catalog')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('voucher')
        .setDescription('Voucher code for discount (optional)')
        .setRequired(false)
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
            'Anda belum terdaftar dan terverifikasi.\n\nGunakan `/register` dan `/verify` terlebih dahulu.'
          )]
        });
      }

      const productId = interaction.options.getString('product-id').toUpperCase().trim();
      const voucherCode = interaction.options.getString('voucher')?.toUpperCase().trim();

      // Find product
      const product = await Katalog.findOne({ 
        productId: productId,
        isAvailable: true 
      });

      if (!product) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Product Not Found',
            `Product **${productId}** tidak ditemukan atau tidak tersedia.`
          )]
        });
      }

      // Check stock
      if (!product.isInStock()) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Out of Stock',
            `Product **${product.name}** sedang habis.\n\nSilakan pilih product lain atau tunggu restock.`
          )]
        });
      }

      // Check server limit
      const userServers = await Server.find({ ownerId: user.discordId, isActive: true });
      const serverLimit = getServerLimit(user);

      if (!canCreateServer(user, userServers.length)) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Server Limit Reached',
            `Anda sudah mencapai batas maksimal server.\n\n` +
            `🎖️ Status: ${user.isPremium ? 'Premium' : 'Free'}\n` +
            `📊 Servers: ${userServers.length}/${serverLimit}\n\n` +
            `${user.isPremium ? 'Hapus server yang tidak terpakai.' : 'Upgrade ke Premium untuk unlimited servers!'}`
          )]
        });
      }

      // Calculate price
      let finalPrice = product.price;
      let discount = 0;
      let voucherUsed = null;
      let bonusDuration = 0;
      let discountPercent = 0;

      // Apply voucher if provided
      if (voucherCode) {
        const voucher = await Voucher.findOne({ code: voucherCode });

        if (!voucher) {
          return interaction.editReply({
            embeds: [errorEmbed(
              'Invalid Voucher',
              `Voucher **${voucherCode}** tidak valid.`
            )]
          });
        }

        if (!voucher.isAvailable()) {
          return interaction.editReply({
            embeds: [errorEmbed(
              'Voucher Unavailable',
              `Voucher **${voucherCode}** sudah tidak tersedia.\n\n` +
              `Reason: ${voucher.isExpired() ? 'Expired' : voucher.usedBy.length >= voucher.maxUsers ? 'Max users reached' : 'Inactive'}`
            )]
          });
        }

        if (voucher.hasBeenUsedBy(user.discordId)) {
          return interaction.editReply({
            embeds: [errorEmbed(
              'Already Used',
              `Anda sudah menggunakan voucher **${voucherCode}** sebelumnya.`
            )]
          });
        }

        // Calculate discount
        discountPercent = voucher.discount;
        const priceCalc = calculateDiscount(product.price, voucher.discount);
        finalPrice = priceCalc.finalPrice;
        discount = priceCalc.discountAmount;
        bonusDuration = voucher.durationDays;
        voucherUsed = voucherCode;
      }

      // Check if user has enough coins
      if (!hasEnoughCoins(user, finalPrice)) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Insufficient Coins',
            `Anda tidak memiliki cukup coins.\n\n` +
            `💰 Balance: ${user.coins.toLocaleString()} coins\n` +
            `💳 Required: ${finalPrice.toLocaleString()} coins\n` +
            `❌ Short: ${(finalPrice - user.coins).toLocaleString()} coins\n\n` +
            `Gunakan \`/daily\` untuk mendapatkan coins gratis!`
          )]
        });
      }

      // Create confirmation embed
      const totalDuration = product.durationDays + bonusDuration;
      const dailyCost = calculateDailyCost(finalPrice, totalDuration);

      const confirmEmbed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('🛒 Confirm Purchase')
        .setDescription(`Are you sure you want to purchase this panel?`)
        .addFields(
          { name: '📦 Product', value: product.name, inline: true },
          { name: '🆔 Product ID', value: `\`${productId}\``, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '🎯 RAM', value: formatRAM(product.ram), inline: true },
          { name: '💾 Disk', value: formatDisk(product.disk), inline: true },
          { name: '⚡ CPU', value: formatCPU(product.cpu), inline: true },
          { name: '🗄️ Databases', value: `${product.databases}`, inline: true },
          { name: '⏰ Duration', value: `${totalDuration} days`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        )
        .setFooter({ text: 'Confirmation required' })
        .setTimestamp();

      // Add pricing info
      if (voucherUsed) {
        confirmEmbed.addFields(
          { name: '💰 Original Price', value: formatPrice(product.price), inline: true },
          { name: '🎟️ Voucher', value: `${voucherCode} (-${discountPercent}%)`, inline: true },
          { name: '💸 Discount', value: `-${discount.toLocaleString()} coins`, inline: true },
          { name: '💳 Final Price', value: `**${formatPrice(finalPrice)}**`, inline: true },
          { name: '🎁 Bonus Days', value: `+${bonusDuration} days`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        );
      } else {
        confirmEmbed.addFields(
          { name: '💳 Price', value: `**${formatPrice(finalPrice)}**`, inline: true },
          { name: '💡 Tip', value: 'Use a voucher for discount!', inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        );
      }

      confirmEmbed.addFields(
        { name: '💰 Your Balance', value: formatPrice(user.coins), inline: true },
        { name: '💳 After Purchase', value: formatPrice(user.coins - finalPrice), inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
      );

      // Create select menu for confirmation
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`confirm_purchase_${productId}_${voucherCode || 'none'}`)
            .setPlaceholder('Select an option')
            .addOptions([
              {
                label: 'Confirm Purchase',
                description: `Buy ${product.name} for ${finalPrice.toLocaleString()} coins`,
                value: 'confirm',
                emoji: '✅'
              },
              {
                label: 'Cancel',
                description: 'Cancel this purchase',
                value: 'cancel',
                emoji: '❌'
              }
            ])
        );

      await interaction.editReply({ 
        embeds: [confirmEmbed],
        components: [row]
      });

    } catch (error) {
      console.error('Error in buy-panel command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat memproses pembelian.'
        )]
      });
    }
  }
};