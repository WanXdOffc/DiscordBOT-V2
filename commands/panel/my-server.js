const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { errorEmbed } = require('../../utils/embeds');
const { formatRAM, formatDisk, formatCPU, formatPrice } = require('../../utils/voucher');
const { formatServerStatus, formatTimeRemaining } = require('../../utils/server');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-server')
    .setDescription('View your owned servers')
    .addStringOption(option =>
      option
        .setName('server-id')
        .setDescription('View specific server details')
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
            'Anda belum terdaftar dan terverifikasi.'
          )]
        });
      }

      const serverId = interaction.options.getString('server-id');

      // If server ID specified, show details
      if (serverId) {
        const server = await Server.findOne({ 
          serverId: serverId.toUpperCase().trim(),
          ownerId: user.discordId
        });

        if (!server) {
          return interaction.editReply({
            embeds: [errorEmbed(
              'Server Not Found',
              `Server dengan ID **${serverId}** tidak ditemukan atau bukan milik Anda.`
            )]
          });
        }

        // Show detailed server info
        const embed = new EmbedBuilder()
          .setColor(server.isActive ? config.bot.embedColor : '#ff0000')
          .setTitle(`🖥️ ${server.productName}`)
          .setDescription(`Server: **${server.serverName}**`)
          .addFields(
            { name: '🆔 Server ID', value: `\`${server.serverId}\``, inline: true },
            { name: '📊 Status', value: formatServerStatus(server), inline: true },
            { name: '⏰ Time Left', value: formatTimeRemaining(server), inline: true },
            { name: '🎯 RAM', value: formatRAM(server.ram), inline: true },
            { name: '💾 Disk', value: formatDisk(server.disk), inline: true },
            { name: '⚡ CPU', value: formatCPU(server.cpu), inline: true },
            { name: '🗄️ Databases', value: `${server.databases}`, inline: true },
            { name: '💰 Paid Price', value: formatPrice(server.paidPrice), inline: true },
            { name: '💸 Daily Cost', value: `${server.dailyCost} coins/day`, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(server.createdAt.getTime() / 1000)}:R>`, inline: true },
            { name: '📅 Expires', value: `<t:${Math.floor(server.expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: '💳 Total Paid', value: `${server.totalPaid.toLocaleString()} coins`, inline: true }
          )
          .setFooter({ text: `Pterodactyl ID: ${server.pterodactylId}` })
          .setTimestamp();

        if (server.voucherUsed) {
          embed.addFields({
            name: '🎟️ Voucher Used',
            value: `${server.voucherUsed} (-${formatPrice(server.discountReceived)})`,
            inline: false
          });
        }

        // Add refund info if applicable
        if (server.isActive) {
          const refundAmount = server.calculateRefund();
          if (refundAmount > 0) {
            embed.addFields({
              name: '💵 Refund Available',
              value: `If deleted now: ${formatPrice(refundAmount)}`,
              inline: false
            });
          }
        }

        embed.addFields({
          name: '🌐 Panel URL',
          value: config.pterodactyl.url,
          inline: false
        });

        return interaction.editReply({ embeds: [embed] });
      }

      // Show all servers
      const servers = await Server.find({ 
        ownerId: user.discordId,
        isActive: true 
      }).sort({ createdAt: -1 });

      if (servers.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Servers',
            'Anda belum memiliki server.\n\nGunakan `/buy-panel` untuk membeli panel.'
          )]
        });
      }

      // Create servers list embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('🖥️ Your Servers')
        .setDescription(`You have **${servers.length}** active server(s)`)
        .setFooter({ text: `Use /my-server server-id:<ID> for details` })
        .setTimestamp();

      // Add each server
      for (const server of servers) {
        const status = formatServerStatus(server);
        const timeLeft = formatTimeRemaining(server);

        embed.addFields({
          name: `${status} \`${server.serverId}\``,
          value: 
            `📦 ${server.productName} | 🎯 ${formatRAM(server.ram)} | 💾 ${formatDisk(server.disk)}\n` +
            `⏰ Expires in: ${timeLeft} | 💰 ${formatPrice(server.paidPrice)}`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in my-server command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data server.'
        )]
      });
    }
  }
};