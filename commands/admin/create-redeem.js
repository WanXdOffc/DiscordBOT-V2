const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const RedeemCode = require('../../models/RedeemCode');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { generateRedeemCode } = require('../../utils/economy');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-redeem')
    .setDescription('Create a redeem code for users to claim coins (Admin only)')
    .addIntegerOption(option =>
      option
        .setName('coins')
        .setDescription('Amount of coins')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000)
    )
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('Custom code (leave empty for random)')
        .setRequired(false)
        .setMaxLength(20)
    )
    .addIntegerOption(option =>
      option
        .setName('expire-days')
        .setDescription('Days until expiration (leave empty for no expiration)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365)
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
            'Hanya admin yang bisa membuat redeem code.'
          )]
        });
      }

      const coins = interaction.options.getInteger('coins');
      let code = interaction.options.getString('code');
      const expireDays = interaction.options.getInteger('expire-days');

      // Generate random code if not provided
      if (!code) {
        code = generateRedeemCode(8);
      } else {
        code = code.toUpperCase().trim();
      }

      // Check if code already exists
      const existingCode = await RedeemCode.findOne({ code: code });
      if (existingCode) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Already Exists',
            `Redeem code **${code}** sudah ada.\n\n` +
            'Gunakan code lain atau biarkan kosong untuk generate random.'
          )]
        });
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expireDays) {
        expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);
      }

      // Create redeem code
      const redeemCode = new RedeemCode({
        code: code,
        coins: coins,
        createdBy: interaction.user.id,
        createdByUsername: interaction.user.username,
        expiresAt: expiresAt
      });

      await redeemCode.save();

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Redeem Code Created')
        .setDescription(`Redeem code berhasil dibuat!`)
        .addFields(
          { name: '🎟️ Code', value: `\`${code}\``, inline: true },
          { name: '💰 Coins', value: `**${coins.toLocaleString()}** coins`, inline: true },
          { name: '👤 Created By', value: interaction.user.username, inline: true },
          { 
            name: '⏰ Expires', 
            value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : '❌ Never', 
            inline: true 
          },
          { name: '📊 Status', value: '🟢 Active', inline: true },
          { name: '🔢 Uses', value: '0/1', inline: true }
        )
        .setFooter({ text: 'Share this code with users!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log to console
      console.log(`✅ Redeem code created: ${code} (${coins} coins) by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in create-redeem command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat membuat redeem code.'
        )]
      });
    }
  }
};