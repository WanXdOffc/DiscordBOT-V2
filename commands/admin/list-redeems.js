const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const RedeemCode = require('../../models/RedeemCode');
const User = require('../../models/User');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-redeems')
    .setDescription('List all redeem codes (Admin only)')
    .addStringOption(option =>
      option
        .setName('filter')
        .setDescription('Filter codes by status')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Active (Unused)', value: 'active' },
          { name: 'Used', value: 'used' },
          { name: 'Expired', value: 'expired' }
        )
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
            'Anda tidak memiliki permission untuk menggunakan command ini.'
          )]
        });
      }

      const filter = interaction.options.getString('filter') || 'all';

      // Build query based on filter
      let query = {};
      if (filter === 'active') {
        query = { isUsed: false, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
      } else if (filter === 'used') {
        query = { isUsed: true };
      } else if (filter === 'expired') {
        query = { isUsed: false, expiresAt: { $lte: new Date() } };
      }

      // Find codes
      const codes = await RedeemCode.find(query).sort({ createdAt: -1 }).limit(25);

      if (codes.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'No Codes Found',
            `Tidak ada redeem code dengan filter: **${filter}**`
          )]
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle(`🎟️ Redeem Codes (${filter})`)
        .setDescription(`Total: **${codes.length}** codes`)
        .setFooter({ text: `Page 1 | Total codes: ${codes.length}` })
        .setTimestamp();

      // Add fields for each code
      for (const code of codes.slice(0, 10)) {
        let status = '';
        if (code.isUsed) {
          status = '✅ Used';
        } else if (code.isExpired()) {
          status = '⏰ Expired';
        } else {
          status = '🟢 Active';
        }

        const expiry = code.expiresAt 
          ? `<t:${Math.floor(code.expiresAt.getTime() / 1000)}:R>`
          : 'Never';

        embed.addFields({
          name: `\`${code.code}\` - ${code.coins.toLocaleString()} coins`,
          value: `Status: ${status} | Expires: ${expiry}${code.isUsed ? `\nUsed by: <@${code.usedBy}>` : ''}`,
          inline: false
        });
      }

      if (codes.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${codes.length} codes` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in list-redeems command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengambil data redeem codes.'
        )]
      });
    }
  }
};