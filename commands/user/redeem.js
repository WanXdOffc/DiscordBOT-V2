const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RedeemCode = require('../../models/RedeemCode');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { addCoins, formatCoins } = require('../../utils/economy');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem a code to claim coins')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('The redeem code')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find user
      const user = await User.findOne({ discordId: interaction.user.id });

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Registered',
            'Anda belum terdaftar.\n\nGunakan `/register` terlebih dahulu.'
          )]
        });
      }

      if (!user.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Verified',
            'Anda belum terverifikasi.\n\nGunakan `/verify <code>` untuk verifikasi.'
          )]
        });
      }

      const code = interaction.options.getString('code').toUpperCase().trim();

      // Find redeem code
      const redeemCode = await RedeemCode.findOne({ code: code });

      if (!redeemCode) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Invalid Code',
            `Redeem code **${code}** tidak valid atau tidak ditemukan.`
          )]
        });
      }

      // Check if already used
      if (redeemCode.isUsed) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Already Used',
            `Redeem code **${code}** sudah digunakan.\n\n` +
            `✅ Used by: <@${redeemCode.usedBy}>\n` +
            `📅 Used at: <t:${Math.floor(new Date(redeemCode.usedAt).getTime() / 1000)}:R>`
          )]
        });
      }

      // Check if expired
      if (redeemCode.isExpired()) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Expired',
            `Redeem code **${code}** sudah kadaluarsa.\n\n` +
            `⏰ Expired: <t:${Math.floor(redeemCode.expiresAt.getTime() / 1000)}:R>`
          )]
        });
      }

      // Redeem the code
      const coinsToAdd = redeemCode.coins;
      const oldBalance = user.coins;
      
      await addCoins(user, coinsToAdd, `Redeem Code: ${code}`);

      // Mark code as used
      redeemCode.isUsed = true;
      redeemCode.usedBy = interaction.user.id;
      redeemCode.usedAt = Date.now();
      await redeemCode.save();

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Code Redeemed Successfully!')
        .setDescription(`You've successfully redeemed the code!`)
        .addFields(
          { name: '🎟️ Code', value: `\`${code}\``, inline: true },
          { name: '💰 Coins Received', value: `**+${coinsToAdd.toLocaleString()}** coins`, inline: true },
          { name: '💳 Old Balance', value: formatCoins(oldBalance), inline: true },
          { name: '💳 New Balance', value: formatCoins(user.coins), inline: true }
        )
        .setFooter({ text: 'Thank you for redeeming!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log to console
      console.log(`🎟️ Code redeemed: ${code} (${coinsToAdd} coins) by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in redeem command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat redeem code.'
        )]
      });
    }
  }
};