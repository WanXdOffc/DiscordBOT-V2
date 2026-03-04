const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const { 
  generateTicketId, 
  getNextTicketNumber, 
  generateTicketChannelName,
  getUserActiveTickets 
} = require('../../utils/ticket');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Create a purchase ticket (coins or premium)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user is registered
      const user = await User.findOne({ discordId: interaction.user.id });

      if (!user || !user.isVerified) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Not Registered',
            'Anda belum terdaftar dan terverifikasi.\n\nGunakan `/register` dan `/verify` terlebih dahulu.'
          )]
        });
      }

      if (user.isBanned) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Account Banned',
            'Akun Anda telah di-ban dan tidak dapat membuat ticket.'
          )]
        });
      }

      // Check active tickets limit
      const activeTickets = await getUserActiveTickets(user.discordId);
      
      if (activeTickets >= config.ticket.maxActivePerUser) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Too Many Tickets',
            `Anda sudah memiliki ${activeTickets} ticket yang masih aktif.\n\n` +
            `Maksimal: ${config.ticket.maxActivePerUser} ticket\n\n` +
            `Silakan tutup ticket yang lama terlebih dahulu atau tunggu admin merespons.`
          )]
        });
      }

      // Show purchase type selection
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`buy_select_${interaction.user.id}`)
        .setPlaceholder('Select purchase type')
        .addOptions([
          {
            label: 'Buy Coins',
            description: 'Purchase coins for panel services',
            value: 'coins',
            emoji: '💰'
          },
          {
            label: 'Buy Premium',
            description: 'Upgrade to Premium membership',
            value: 'premium',
            emoji: '⭐'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('🛒 Purchase Selection')
        .setDescription(
          'Select what you want to purchase:\n\n' +
          '**💰 Coins**\n' +
          '• Purchase coins for buying panels\n' +
          '• Various packages available\n' +
          '• Payment via admin verification\n\n' +
          '**⭐ Premium**\n' +
          '• Unlimited server slots\n' +
          '• Priority support\n' +
          '• Special perks\n' +
          '• Monthly or yearly plans'
        )
        .setFooter({ text: 'Select an option below' })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (error) {
      console.error('Error in buy command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat membuat ticket.'
        )]
      });
    }
  }
};

// Handle select menu
module.exports.handleSelect = async (interaction, purchaseType) => {
  await interaction.deferUpdate();

  try {
    const user = await User.findOne({ discordId: interaction.user.id });

    // Generate ticket info
    const ticketId = generateTicketId();
    const ticketNumber = await getNextTicketNumber();
    const channelName = generateTicketChannelName(ticketNumber, purchaseType);

    // Get ticket category
    const category = interaction.guild.channels.cache.get(config.channels.ticketCategory);
    
    if (!category) {
      return interaction.editReply({
        embeds: [errorEmbed(
          'Configuration Error',
          'Ticket category tidak ditemukan. Hubungi admin untuk setup.'
        )],
        components: []
      });
    }

    // Create ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: config.roles.admin,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    });

    // Save ticket to database
    const ticket = new Ticket({
      ticketId: ticketId,
      ticketNumber: ticketNumber,
      userId: interaction.user.id,
      username: interaction.user.username,
      type: purchaseType,
      channelId: ticketChannel.id,
      status: 'open'
    });

    await ticket.save();

    // Create ticket embed
    const ticketEmbed = new EmbedBuilder()
      .setColor(config.bot.embedColor)
      .setTitle(`🎫 Ticket #${ticketNumber} - ${purchaseType === 'coins' ? '💰 Coin Purchase' : '⭐ Premium Purchase'}`)
      .setDescription(
        `Welcome ${interaction.user}!\n\n` +
        `Your purchase ticket has been created.\n` +
        `An admin will assist you shortly.\n\n` +
        `**Ticket Information:**`
      )
      .addFields(
        { name: '🎫 Ticket ID', value: `\`${ticketId}\``, inline: true },
        { name: '📋 Type', value: purchaseType === 'coins' ? '💰 Coins' : '⭐ Premium', inline: true },
        { name: '📊 Status', value: '🟢 Open', inline: true }
      )
      .setFooter({ text: 'Please wait for admin response' })
      .setTimestamp();

    // Info for coins
    if (purchaseType === 'coins') {
      ticketEmbed.addFields({
        name: '💰 Coin Packages',
        value: 
          '**Available Packages:**\n' +
          '• 1,000 coins - Rp 10,000\n' +
          '• 5,000 coins - Rp 45,000\n' +
          '• 10,000 coins - Rp 85,000\n' +
          '• 50,000 coins - Rp 400,000\n\n' +
          'Silakan tunggu admin untuk konfirmasi harga dan metode pembayaran.',
        inline: false
      });
    }

    // Info for premium
    if (purchaseType === 'premium') {
      ticketEmbed.addFields({
        name: '⭐ Premium Plans',
        value: 
          '**Available Plans:**\n' +
          '• 1 Month - Rp 50,000\n' +
          '• 3 Months - Rp 135,000 (10% OFF)\n' +
          '• 6 Months - Rp 255,000 (15% OFF)\n' +
          '• 1 Year - Rp 480,000 (20% OFF)\n\n' +
          '**Benefits:**\n' +
          '• Unlimited server slots\n' +
          '• Priority support\n' +
          '• Exclusive features\n\n' +
          'Silakan tunggu admin untuk konfirmasi.',
        inline: false
      });
    }

    // Send to ticket channel
    await ticketChannel.send({
      content: `${interaction.user} <@&${config.roles.admin}>`,
      embeds: [ticketEmbed]
    });

    // Update original message
    await interaction.editReply({
      embeds: [successEmbed(
        'Ticket Created',
        `✅ Ticket berhasil dibuat!\n\n` +
        `**Ticket:** #${ticketNumber}\n` +
        `**Channel:** ${ticketChannel}\n` +
        `**Type:** ${purchaseType === 'coins' ? '💰 Coins' : '⭐ Premium'}\n\n` +
        `Silakan menuju channel ticket dan tunggu respons admin.`
      )],
      components: []
    });

    console.log(`🎫 Ticket #${ticketNumber} created by ${interaction.user.username} (${purchaseType})`);

  } catch (error) {
    console.error('Error creating ticket:', error);
    
    await interaction.editReply({
      embeds: [errorEmbed(
        'Error',
        'Terjadi kesalahan saat membuat ticket channel.'
      )],
      components: []
    });
  }
};