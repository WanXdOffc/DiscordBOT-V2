const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { setUserAdmin } = require('../../utils/pterodactyl');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setadmin')
    .setDescription('Set a user as admin (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to promote to admin')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if executor is admin
      const executorUser = await User.findOne({ 
        discordId: interaction.user.id,
        isAdmin: true 
      });

      if (!executorUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Permission Denied',
            'Anda tidak memiliki permission untuk menggunakan command ini.'
          )]
        });
      }

      const targetDiscordUser = interaction.options.getUser('user');
      
      // Find target user in database
      const targetUser = await User.findOne({ discordId: targetDiscordUser.id });

      if (!targetUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Found',
            `${targetDiscordUser.username} belum terdaftar.\n\nUser harus register terlebih dahulu.`
          )]
        });
      }

      if (!targetUser.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'User Not Verified',
            `${targetDiscordUser.username} belum terverifikasi.\n\nUser harus verify akun terlebih dahulu.`
          )]
        });
      }

      if (targetUser.isAdmin) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Already Admin',
            `${targetDiscordUser.username} sudah menjadi admin.`
          )]
        });
      }

      // Set as admin in database
      targetUser.isAdmin = true;
      await targetUser.save();

      // Set as admin in Pterodactyl
      if (targetUser.pterodactylId) {
        try {
          await setUserAdmin(targetUser.pterodactylId, true);
        } catch (pterodactylError) {
          console.error('Error setting Pterodactyl admin:', pterodactylError);
          // Continue anyway, database is updated
        }
      }

      // Assign admin role in Discord
      try {
        const member = await interaction.guild.members.fetch(targetDiscordUser.id);
        const adminRole = interaction.guild.roles.cache.get(config.roles.admin);
        
        if (adminRole && member) {
          await member.roles.add(adminRole);
        }
      } catch (roleError) {
        console.error('Error assigning admin role:', roleError);
      }

      await interaction.editReply({
        embeds: [successEmbed(
          'Admin Set',
          `✅ ${targetDiscordUser.username} telah dipromosikan menjadi admin!\n\n` +
          `**Changes:**\n` +
          `👑 Database: Admin status enabled\n` +
          `🌐 Pterodactyl: Root admin enabled\n` +
          `🎖️ Discord: Admin role assigned\n\n` +
          `${targetDiscordUser.username} sekarang memiliki akses penuh ke admin commands.`
        )]
      });

      // Send DM to new admin
      try {
        await targetDiscordUser.send({
          embeds: [successEmbed(
            '👑 You are now an Admin!',
            `Congratulations! You have been promoted to admin by ${interaction.user.username}.\n\n` +
            `You now have access to:\n` +
            `• Create/delete redeem codes\n` +
            `• Create/delete vouchers\n` +
            `• Manage catalog products\n` +
            `• User management\n` +
            `• Server monitoring\n` +
            `• And more admin tools!\n\n` +
            `Use your power wisely! 👑`
          )]
        });
      } catch (dmError) {
        console.error('Could not send admin promotion DM:', dmError);
      }

      console.log(`👑 ${targetDiscordUser.username} promoted to admin by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in setadmin command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat setting admin.'
        )]
      });
    }
  }
};