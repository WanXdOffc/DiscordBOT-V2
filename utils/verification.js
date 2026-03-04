const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification code to user's DM
 */
async function sendVerificationCode(user, code) {
  try {
    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor)
      .setTitle('🔐 Verification Code')
      .setDescription(
        `Terima kasih telah mendaftar di **OnePanel Bot**!\n\n` +
        `Kode verifikasi Anda adalah:\n\n` +
        `\`\`\`\n${code}\`\`\`\n\n` +
        `Gunakan command \`/verify\` dan masukkan kode ini untuk menyelesaikan registrasi.\n\n` +
        `⏰ Kode ini akan kadaluarsa dalam **15 menit**.`
      )
      .setFooter({ text: 'OnePanel Bot | Verification System' })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Error sending verification code:', error);
    return false;
  }
}

/**
 * Send account details to user after successful verification
 */
async function sendAccountDetails(user, userData, password) {
  try {
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Account Created Successfully!')
      .setDescription(
        `Selamat! Akun Pterodactyl Anda telah berhasil dibuat.\n\n` +
        `**Detail Akun:**`
      )
      .addFields(
        { name: '📧 Email', value: userData.email, inline: true },
        { name: '👤 Username', value: userData.pterodactylUsername, inline: true },
        { name: '🔑 Password', value: `\`${password}\``, inline: false },
        { name: '🌐 Panel URL', value: config.pterodactyl.url, inline: false },
        { name: '💰 Coins', value: `${userData.coins} coins`, inline: true },
        { name: '🎖️ Role', value: 'Member', inline: true }
      )
      .setFooter({ text: 'Simpan informasi ini dengan aman!' })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Error sending account details:', error);
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8;
}

/**
 * Sanitize username for Pterodactyl
 */
function sanitizeUsername(username) {
  return username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendAccountDetails,
  isValidEmail,
  isValidPassword,
  sanitizeUsername,
};