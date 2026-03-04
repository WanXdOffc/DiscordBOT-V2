const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { removeCoins, hasEnoughCoins } = require('../../utils/economy');
const { calculateRenewalCost, extendServer } = require('../../utils/billing');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatPrice } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perpanjang')
    .setDescription('Renew/extend your server subscription')
    .addStringOption(option =>
      option
        .setName('server-id')
        .setDescription('Server ID to renew')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('Number of days to extend (default: 30)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365)
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
      const days = interaction.options.getInteger('days') || 30;

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
            `Server dengan ID **${serverId}** tidak ditemukan atau sudah tidak aktif.`
          )]
        });
      }

      // Calculate renewal cost
      const renewalCost = calculateRenewalCost(server, days);

      // Check if user has enough coins
      if (!hasEnoughCoins(user, renewalCost)) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Insufficient Coins',
            `Anda tidak memiliki cukup coins untuk perpanjangan.\n\n` +
            `💰 Balance: ${formatPrice(user.coins)}\n` +
            `💳 Required: ${formatPrice(renewalCost)}\n` +
            `❌ Short: ${formatPrice(renewalCost - user.coins)}\n\n` +
            `Extension: ${days} days @ ${server.dailyCost} coins/day\n\n` +
            `Gunakan \`/daily\` untuk mendapatkan coins gratis!`
          )]
        });
      }

      // Process renewal
      await removeCoins(user, renewalCost, `Renewal: ${server.serverName} (${days} days)`);

      // Extend server
      const newExpiryDate = await extendServer(server, days);

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Server Renewed Successfully!')
        .setDescription(
          `Your server **${server.productName}** has been extended!`
        )
        .addFields(
          { name: '🆔 Server ID', value: `\`${serverId}\``, inline: true },
          { name: '📦 Product', value: server.productName, inline: true },
          { name: '⏰ Extended By', value: `${days} days`, inline: true },
          { name: '💰 Cost', value: formatPrice(renewalCost), inline: true },
          { name: '💸 Daily Cost', value: `${server.dailyCost} coins/day`, inline: true },
          { name: '💳 New Balance', value: formatPrice(user.coins), inline: true },
          { name: '📅 New Expiry Date', value: `<t:${Math.floor(newExpiryDate.getTime() / 1000)}:F>`, inline: false },
          { name: '⏰ Expires', value: `<t:${Math.floor(newExpiryDate.getTime() / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: 'Thank you for renewing!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Send DM notification
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Server Renewal Confirmed')
          .setDescription(
            `Your server has been successfully renewed!`
          )
          .addFields(
            { name: '📦 Server', value: server.productName, inline: true },
            { name: '🆔 Server ID', value: `\`${serverId}\``, inline: true },
            { name: '⏰ Extended', value: `+${days} days`, inline: true },
            { name: '💰 Paid', value: formatPrice(renewalCost), inline: true },
            { name: '📅 New Expiry', value: `<t:${Math.floor(newExpiryDate.getTime() / 1000)}:R>`, inline: true },
            { name: '🌐 Panel', value: config.pterodactyl.url, inline: false }
          )
          .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error('Could not send renewal DM:', dmError);
      }

      console.log(`🔄 Server renewed: ${serverId} by ${interaction.user.username} for ${days} days`);

    } catch (error) {
      console.error('Error in perpanjang command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat memproses perpanjangan.'
        )]
      });
    }
  }
};