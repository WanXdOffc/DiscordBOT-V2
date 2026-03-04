const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Voucher = require('../../models/Voucher');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-vouchers')
    .setDescription('List all vouchers (Admin only)')
    .addStringOption(option =>
      option
        .setName('filter')
        .setDescription('Filter vouchers by status')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Available', value: 'available' },
          { name: 'Full (Max users reached)', value: 'full' },
          { name: 'Expired', value: 'expired' }
        )
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

      const filter = interaction.options.getString('filter') || 'all';

      // Get all vouchers
      let vouchers = await Voucher.find().sort({ createdAt: -1 });

      // Apply filter
      if (filter === 'available') {
        vouchers = vouchers.filter(v => v.isAvailable());
      } else if (filter === 'full') {
        vouchers = vouchers.filter(v => v.usedBy.length >= v.maxUsers);
      } else if (filter === 'expired') {
        vouchers = vouchers.filter(v => v.isExpired());
      }

      if (vouchers.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Vouchers Found',
            `Tidak ada voucher dengan filter: **${filter}**`
          )]
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(`🎟️ Vouchers List (${filter})`)
        .setDescription(`Total: **${vouchers.length}** vouchers`)
        .setTimestamp();

      // Add fields for each voucher
      for (const voucher of vouchers.slice(0, 10)) {
        let status = '';
        if (voucher.isExpired()) {
          status = '⏰ Expired';
        } else if (voucher.usedBy.length >= voucher.maxUsers) {
          status = '🔴 Full';
        } else if (voucher.isAvailable()) {
          status = '🟢 Available';
        } else {
          status = '⚪ Inactive';
        }

        const expiry = voucher.expiresAt 
          ? `<t:${Math.floor(voucher.expiresAt.getTime() / 1000)}:R>`
          : 'Never';

        embed.addFields({
          name: `\`${voucher.code}\` - ${voucher.discount}% OFF`,
          value: 
            `Status: ${status} | Duration: ${voucher.durationDays} days\n` +
            `Used: ${voucher.usedBy.length}/${voucher.maxUsers} | Expires: ${expiry}`,
          inline: false
        });
      }

      if (vouchers.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${vouchers.length} vouchers` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in list-vouchers command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data vouchers.'
        )]
      });
    }
  }
};