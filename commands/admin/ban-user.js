const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { deleteServer } = require('../../utils/pterodactyl');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban-user')
    .setDescription('Ban a user from using the bot (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false)
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
      const reason = interaction.options.getString('reason') || 'No reason provided';

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

      if (targetUser.isBanned) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Already Banned',
            `${targetDiscordUser.username} sudah di-ban sebelumnya.`
          )]
        });
      }

      // Don't allow banning other admins
      if (targetUser.isAdmin) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Cannot Ban Admin',
            'Anda tidak bisa ban admin lain.\n\nRemove admin status terlebih dahulu.'
          )]
        });
      }

      // Ban user
      targetUser.isBanned = true;
      await targetUser.save();

      // Disable all active servers
      const userServers = await Server.find({ 
        ownerId: targetUser.discordId,
        isActive: true 
      });

      let serversDeleted = 0;
      for (const server of userServers) {
        try {
          await deleteServer(server.pterodactylId);
          server.isActive = false;
          server.deletedAt = Date.now();
          await server.save();
          serversDeleted++;
        } catch (error) {
          console.error(`Error deleting server ${server.serverId}:`, error);
        }
      }

      await interaction.editReply({
        embeds: [successEmbed(
          'User Banned',
          `✅ ${targetDiscordUser.username} telah di-ban.\n\n` +
          `**Details:**\n` +
          `📛 Reason: ${reason}\n` +
          `🗑️ Servers deleted: ${serversDeleted}\n` +
          `🚫 Status: Banned\n\n` +
          `User tidak dapat menggunakan bot commands sampai di-unban.`
        )]
      });

      // Send DM to banned user
      try {
        await targetDiscordUser.send({
          embeds: [errorEmbed(
            '🚫 You Have Been Banned',
            `You have been banned from using OnePanel Bot.\n\n` +
            `**Reason:** ${reason}\n\n` +
            `All your servers have been deleted.\n` +
            `If you believe this is a mistake, please contact the server administrators.`
          )]
        });
      } catch (dmError) {
        console.error('Could not send ban DM:', dmError);
      }

      console.log(`🚫 ${targetDiscordUser.username} banned by ${interaction.user.username}. Reason: ${reason}`);

    } catch (error) {
      console.error('Error in ban-user command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat ban user.'
        )]
      });
    }
  }
};