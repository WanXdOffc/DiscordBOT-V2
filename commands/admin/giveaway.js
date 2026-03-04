const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const Giveaway = require('../../models/Giveaway');
const { generateGiveawayId, calculateEndTime, formatTimeRemaining } = require('../../utils/giveaway');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create a giveaway (Admin only)')
    .addStringOption(option =>
      option
        .setName('prize')
        .setDescription('Prize description')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in hours')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(720) // 30 days max
    )
    .addIntegerOption(option =>
      option
        .setName('max-participants')
        .setDescription('Maximum number of participants')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10000)
    )
    .addRoleOption(option =>
      option
        .setName('minimum-role')
        .setDescription('Minimum role required to participate (optional)')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('bonus-role-1')
        .setDescription('Role with bonus probability (optional)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('bonus-1-percent')
        .setDescription('Bonus probability % for role 1 (1-100)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addRoleOption(option =>
      option
        .setName('bonus-role-2')
        .setDescription('Second role with bonus probability (optional)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('bonus-2-percent')
        .setDescription('Bonus probability % for role 2 (1-100)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addRoleOption(option =>
      option
        .setName('bonus-role-3')
        .setDescription('Third role with bonus probability (optional)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('bonus-3-percent')
        .setDescription('Bonus probability % for role 3 (1-100)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
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

      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getInteger('duration');
      const maxParticipants = interaction.options.getInteger('max-participants');
      const minimumRole = interaction.options.getRole('minimum-role');

      // Build role probabilities
      const roleProbabilities = [];
      
      for (let i = 1; i <= 3; i++) {
        const role = interaction.options.getRole(`bonus-role-${i}`);
        const percent = interaction.options.getInteger(`bonus-${i}-percent`);
        
        if (role && percent) {
          roleProbabilities.push({
            roleId: role.id,
            probability: percent,
            roleName: role.name
          });
        }
      }

      // Generate giveaway data
      const giveawayId = generateGiveawayId();
      const endsAt = calculateEndTime(duration);

      // Create giveaway embed
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
          `**Prize:** ${prize}\n\n` +
          `React with 🎉 to enter!\n\n` +
          `**Details:**`
        )
        .addFields(
          { name: '⏰ Ends', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true },
          { name: '👥 Max Participants', value: `${maxParticipants}`, inline: true },
          { name: '📊 Participants', value: '0', inline: true }
        )
        .setFooter({ text: `Hosted by ${interaction.user.username} | ID: ${giveawayId}` })
        .setTimestamp(endsAt);

      // Add minimum role if set
      if (minimumRole) {
        embed.addFields({
          name: '🎖️ Minimum Role',
          value: minimumRole.toString(),
          inline: false
        });
      }

      // Add role bonuses if set
      if (roleProbabilities.length > 0) {
        const bonusText = roleProbabilities.map(rp => 
          `${rp.roleName}: +${rp.probability}% chance`
        ).join('\n');

        embed.addFields({
          name: '🍀 Bonus Chances',
          value: bonusText,
          inline: false
        });
      }

      // Create join button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_join_${giveawayId}`)
            .setLabel('Join Giveaway')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎉')
        );

      // Send giveaway message
      const giveawayMessage = await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      // Save to database
      const giveaway = new Giveaway({
        giveawayId: giveawayId,
        messageId: giveawayMessage.id,
        channelId: interaction.channel.id,
        prize: prize,
        createdBy: interaction.user.id,
        createdByUsername: interaction.user.username,
        duration: duration,
        maxParticipants: maxParticipants,
        minimumRole: minimumRole?.id || null,
        roleProbabilities: roleProbabilities,
        endsAt: endsAt
      });

      await giveaway.save();

      // Confirm to admin
      await interaction.editReply({
        embeds: [require('../../utils/embeds').successEmbed(
          'Giveaway Created',
          `✅ Giveaway berhasil dibuat!\n\n` +
          `**Prize:** ${prize}\n` +
          `**Duration:** ${duration} hours\n` +
          `**Max Participants:** ${maxParticipants}\n` +
          `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\n` +
          `Giveaway ID: \`${giveawayId}\``
        )]
      });

      console.log(`🎉 Giveaway created: ${prize} by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in giveaway command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat membuat giveaway.'
        )]
      });
    }
  }
};