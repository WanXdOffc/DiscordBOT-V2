const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const Server = require('../../models/Server');
const { deleteUser, deleteServer } = require('../../utils/pterodactyl');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-user')
    .setDescription('Permanently delete a user account (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to delete')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('confirm')
        .setDescription('Confirm deletion (required)')
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
      const confirm = interaction.options.getBoolean('confirm');

      if (!confirm) {
        return interaction.editReply({
          embeds: [warningEmbed(
            'Confirmation Required',
            'Set parameter `confirm` to `true` untuk menghapus user.\n\n' +
            '⚠️ **WARNING:** This action cannot be undone!'
          )]
        });
      }

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

      // Don't allow deleting other admins
      if (targetUser.isAdmin && targetUser.discordId !== interaction.user.id) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Cannot Delete Admin',
            'Anda tidak bisa delete admin lain.'
          )]
        });
      }

      // Delete all user's servers
      const userServers = await Server.find({ ownerId: targetUser.discordId });
      let serversDeleted = 0;

      for (const server of userServers) {
        try {
          if (server.isActive) {
            await deleteServer(server.pterodactylId);
          }
          await Server.deleteOne({ _id: server._id });
          serversDeleted++;
        } catch (error) {
          console.error(`Error deleting server ${server.serverId}:`, error);
        }
      }

      // Delete Pterodactyl user
      if (targetUser.pterodactylId) {
        try {
          await deleteUser(targetUser.pterodactylId);
        } catch (pterodactylError) {
          console.error('Error deleting Pterodactyl user:', pterodactylError);
          // Continue anyway
        }
      }

      // Get user stats before deletion
      const stats = {
        email: targetUser.email,
        coins: targetUser.coins,
        servers: serversDeleted
      };

      // Delete user from database
      await User.deleteOne({ _id: targetUser._id });

      await interaction.editReply({
        embeds: [successEmbed(
          'User Deleted',
          `✅ ${targetDiscordUser.username} telah dihapus secara permanen.\n\n` +
          `**Deleted:**\n` +
          `👤 User account\n` +
          `📧 Email: ${stats.email}\n` +
          `🖥️ Servers: ${stats.servers}\n` +
          `💰 Coins: ${stats.coins}\n` +
          `🌐 Pterodactyl account\n\n` +
          `⚠️ This action cannot be undone.`
        )]
      });

      console.log(`🗑️ ${targetDiscordUser.username} deleted by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in delete-user command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat delete user.'
        )]
      });
    }
  }
};