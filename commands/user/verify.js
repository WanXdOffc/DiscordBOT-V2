const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const { createUser, setUserAdmin } = require('../../utils/pterodactyl');
const { sendAccountDetails, sanitizeUsername } = require('../../utils/verification');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verifikasi akun dengan kode yang dikirim ke DM')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('6-digit verification code')
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(6)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const code = interaction.options.getString('code');
      const discordId = interaction.user.id;

      // Find user with this code
      const user = await User.findOne({ 
        discordId: discordId,
        verificationCode: code 
      });

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Invalid Code',
            'Kode verifikasi tidak valid atau Anda belum melakukan registrasi.\n\n' +
            'Gunakan `/register` untuk mendaftar terlebih dahulu.'
          )]
        });
      }

      // Check if already verified
      if (user.isVerified) {
        return interaction.editReply({
          embeds: [warningEmbed(
            'Already Verified',
            'Akun Anda sudah terverifikasi sebelumnya!'
          )]
        });
      }

      // Check if code expired
      if (user.isVerificationExpired()) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Code Expired',
            'Kode verifikasi Anda sudah kadaluarsa.\n\n' +
            'Gunakan `/register` lagi untuk mendapatkan kode baru.'
          )]
        });
      }

      // Get the password that was stored temporarily
      const password = user.tempPassword;

      if (!password) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Registration Incomplete',
            'Data registrasi tidak lengkap. Silakan `/register` ulang.'
          )]
        });
      }

      // Create Pterodactyl user
      let pterodactylUser;
      try {
        const username = sanitizeUsername(interaction.user.username);
        
        pterodactylUser = await createUser(
          user.email,
          username,
          user.firstName,
          user.lastName,
          password
        );

        // Update user in database
        user.pterodactylId = pterodactylUser.attributes.id;
        user.pterodactylUsername = pterodactylUser.attributes.username;
        user.isVerified = true;
        user.verificationCode = null;
        user.verificationExpiry = null;
        user.tempPassword = null; // Clear temporary password

        // If user should be admin, set admin in Pterodactyl
        if (user.isAdmin) {
          await setUserAdmin(user.pterodactylId, true);
        }

        await user.save();

      } catch (error) {
        console.error('Error creating Pterodactyl user:', error);
        
        return interaction.editReply({
          embeds: [errorEmbed(
            'Pterodactyl Error',
            'Gagal membuat akun di Pterodactyl panel.\n\n' +
            'Error: ' + (error.response?.data?.errors?.[0]?.detail || error.message)
          )]
        });
      }

      // Assign Member role
      try {
        const memberRole = interaction.guild.roles.cache.get(config.roles.member);
        if (memberRole) {
          await interaction.member.roles.add(memberRole);
        }

        // If user is admin, assign admin role too
        if (user.isAdmin) {
          const adminRole = interaction.guild.roles.cache.get(config.roles.admin);
          if (adminRole) {
            await interaction.member.roles.add(adminRole);
          }
        }
      } catch (error) {
        console.error('Error assigning roles:', error);
      }

      // Send account details to DM
      await sendAccountDetails(interaction.user, user, password);

      // Reply in channel
      await interaction.editReply({
        embeds: [successEmbed(
          'Verification Successful!',
          '✅ Akun Anda berhasil diverifikasi!\n\n' +
          '📧 Informasi akun telah dikirim ke DM Anda.\n' +
          '🎖️ Role **Member** telah ditambahkan.\n\n' +
          `Panel URL: ${config.pterodactyl.url}`
        )]
      });

    } catch (error) {
      console.error('Error in verify command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat verifikasi akun.\n\n' +
          'Silakan hubungi admin untuk bantuan.'
        )]
      });
    }
  }
};