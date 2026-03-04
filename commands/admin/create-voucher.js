const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Voucher = require('../../models/Voucher');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { generateVoucherCode } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-voucher')
    .setDescription('Create a discount voucher (Admin only)')
    .addIntegerOption(option =>
      option
        .setName('discount')
        .setDescription('Discount percentage (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in days')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365)
    )
    .addIntegerOption(option =>
      option
        .setName('max-users')
        .setDescription('Maximum number of users who can use this voucher')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000)
    )
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('Custom voucher code (leave empty for random)')
        .setRequired(false)
        .setMaxLength(20)
    )
    .addIntegerOption(option =>
      option
        .setName('expire-days')
        .setDescription('Days until voucher expires (leave empty for no expiration)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365)
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

      const discount = interaction.options.getInteger('discount');
      const duration = interaction.options.getInteger('duration');
      const maxUsers = interaction.options.getInteger('max-users');
      let code = interaction.options.getString('code');
      const expireDays = interaction.options.getInteger('expire-days');

      // Generate random code if not provided
      if (!code) {
        code = generateVoucherCode(8);
      } else {
        code = code.toUpperCase().trim();
      }

      // Check if code already exists
      const existingVoucher = await Voucher.findOne({ code: code });
      if (existingVoucher) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Already Exists',
            `Voucher code **${code}** sudah ada.\n\nGunakan code lain atau biarkan kosong untuk generate random.`
          )]
        });
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expireDays) {
        expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);
      }

      // Create voucher
      const voucher = new Voucher({
        code: code,
        discount: discount,
        durationDays: duration,
        maxUsers: maxUsers,
        createdBy: interaction.user.id,
        createdByUsername: interaction.user.username,
        expiresAt: expiresAt
      });

      await voucher.save();

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Voucher Created')
        .setDescription(`Discount voucher berhasil dibuat!`)
        .addFields(
          { name: '🎟️ Code', value: `\`${code}\``, inline: true },
          { name: '💸 Discount', value: `**${discount}%** OFF`, inline: true },
          { name: '⏰ Duration', value: `${duration} days`, inline: true },
          { name: '👥 Max Users', value: `${maxUsers} users`, inline: true },
          { name: '📊 Used By', value: `0/${maxUsers}`, inline: true },
          { name: '🕐 Expires', value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : '❌ Never', inline: true }
        )
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      console.log(`✅ Voucher created: ${code} (${discount}% off) by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in create-voucher command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat membuat voucher.'
        )]
      });
    }
  }
};