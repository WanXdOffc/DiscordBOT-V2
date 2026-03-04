const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban-user')
    .setDescription('Unban a user (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unban')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if executor is admin
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

      const targetDiscordUser = interaction.options.getUser('user');

      // Find target user
      const targetUser = await User.findOne({ discordId: targetDiscordUser.id });

      if (!targetUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Found',
            `${targetDiscordUser.username} tidak ditemukan di database.`
          )]
        });
      }

      if (!targetUser.isBanned) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Banned',
            `${targetDiscordUser.username} tidak sedang di-ban.`
          )]
        });
      }

      // Unban user
      targetUser.isBanned = false;
      await targetUser.save();

      await interaction.editReply({
        embeds: [successEmbed(
          'User Unbanned',
          `✅ ${targetDiscordUser.username} telah di-unban.\n\n` +
          `User sekarang dapat menggunakan bot kembali.`
        )]
      });

      // Send DM to unbanned user
      try {
        await targetDiscordUser.send({
          embeds: [successEmbed(
            '✅ You Have Been Unbanned',
            `Good news! You have been unbanned from OnePanel Bot.\n\n` +
            `You can now use all bot commands again.\n` +
            `Please follow the rules to avoid future bans.`
          )]
        });
      } catch (dmError) {
        console.error('Could not send unban DM:', dmError);
      }

      console.log(`✅ ${targetDiscordUser.username} unbanned by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in unban-user command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat unban user.'
        )]
      });
    }
  }
};