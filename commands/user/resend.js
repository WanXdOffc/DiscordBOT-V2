const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const { sendVerificationCode } = require('../../utils/verification');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resend')
    .setDescription('Kirim ulang kode verifikasi ke DM'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find user
      const user = await User.findOne({ discordId: interaction.user.id });

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Registered',
            'Anda belum melakukan registrasi.\n\n' +
            'Gunakan `/register` terlebih dahulu.'
          )]
        });
      }

      if (user.isVerified) {
        return interaction.editReply({
          embeds: [warningEmbed(
            'Already Verified',
            'Akun Anda sudah terverifikasi!\n\n' +
            'Tidak perlu kode verifikasi lagi.'
          )]
        });
      }

      // Check if there's still a valid code
      if (user.verificationCode && !user.isVerificationExpired()) {
        const timeLeft = Math.ceil((user.verificationExpiry - Date.now()) / 60000);
        
        return interaction.editReply({
          embeds: [warningEmbed(
            'Code Still Valid',
            `Kode verifikasi Anda masih valid.\n\n` +
            `⏰ Kode akan kadaluarsa dalam **${timeLeft} menit**.\n\n` +
            `Cek DM Anda atau gunakan \`/verify <code>\` untuk verifikasi.`
          )]
        });
      }

      // Generate new verification code
      const newCode = user.generateVerificationCode();
      await user.save();

      // Send new code to DM
      const dmSent = await sendVerificationCode(interaction.user, newCode);

      if (!dmSent) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'DM Disabled',
            'Tidak dapat mengirim kode verifikasi ke DM Anda.\n\n' +
            'Pastikan DM Anda terbuka untuk menerima pesan dari bot.'
          )]
        });
      }

      await interaction.editReply({
        embeds: [successEmbed(
          'Code Resent',
          '✅ Kode verifikasi baru telah dikirim ke DM Anda!\n\n' +
          '⏰ Kode akan kadaluarsa dalam **15 menit**.\n\n' +
          'Gunakan `/verify <code>` untuk menyelesaikan registrasi.'
        )]
      });

    } catch (error) {
      console.error('Error in resend command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat mengirim ulang kode verifikasi.'
        )]
      });
    }
  }
};