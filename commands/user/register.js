const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const User = require('../../models/User');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const { isValidEmail, isValidPassword } = require('../../utils/verification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Daftar akun Pterodactyl baru'),

  async execute(interaction) {
    try {
      // Check if user already registered
      const existingUser = await User.findOne({ discordId: interaction.user.id });
      
      if (existingUser) {
        if (existingUser.isVerified) {
          return interaction.reply({
            embeds: [errorEmbed(
              'Already Registered',
              'Anda sudah terdaftar dan terverifikasi!\n\n' +
              `Email: **${existingUser.email}**\n` +
              `Username: **${existingUser.pterodactylUsername}**`
            )],
            ephemeral: true
          });
        } else {
          return interaction.reply({
            embeds: [infoEmbed(
              'Verification Pending',
              'Anda sudah mendaftar tetapi belum verifikasi.\n\n' +
              'Silakan cek DM Anda untuk kode verifikasi, atau gunakan `/register` lagi untuk mendapatkan kode baru.'
            )],
            ephemeral: true
          });
        }
      }

      // Create modal form
      const modal = new ModalBuilder()
        .setCustomId('register_modal')
        .setTitle('📝 Registration Form');

      // Email input
      const emailInput = new TextInputBuilder()
        .setCustomId('email')
        .setLabel('Email Address')
        .setPlaceholder('example@gmail.com')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      // First Name input
      const firstNameInput = new TextInputBuilder()
        .setCustomId('firstName')
        .setLabel('First Name')
        .setPlaceholder('John')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      // Last Name input
      const lastNameInput = new TextInputBuilder()
        .setCustomId('lastName')
        .setLabel('Last Name')
        .setPlaceholder('Doe')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      // Password input
      const passwordInput = new TextInputBuilder()
        .setCustomId('password')
        .setLabel('Password (min. 8 characters)')
        .setPlaceholder('Your secure password')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(8)
        .setMaxLength(100);

      // Add inputs to action rows
      const emailRow = new ActionRowBuilder().addComponents(emailInput);
      const firstNameRow = new ActionRowBuilder().addComponents(firstNameInput);
      const lastNameRow = new ActionRowBuilder().addComponents(lastNameInput);
      const passwordRow = new ActionRowBuilder().addComponents(passwordInput);

      modal.addComponents(emailRow, firstNameRow, lastNameRow, passwordRow);

      // Show modal to user
      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error in register command:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [errorEmbed('Error', 'Terjadi kesalahan saat membuka form registrasi.')],
          ephemeral: true
        });
      }
    }
  }
};