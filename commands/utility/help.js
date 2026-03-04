const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View bot commands and guides')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Command category')
        .setRequired(false)
        .addChoices(
          { name: 'Getting Started', value: 'getting-started' },
          { name: 'Economy', value: 'economy' },
          { name: 'Panel', value: 'panel' },
          { name: 'Admin', value: 'admin' },
          { name: 'Giveaways', value: 'giveaway' }
        )
    ),

  async execute(interaction) {
    const category = interaction.options.getString('category');

    if (!category) {
      // Main help menu
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('📚 OnePanel Bot - Help Center')
        .setDescription(
          'Welcome to OnePanel Bot! Here\'s everything you need to know.\n\n' +
          '**Quick Start:**\n' +
          '1️⃣ Register: `/register`\n' +
          '2️⃣ Verify: `/verify <code>`\n' +
          '3️⃣ Get coins: `/daily`\n' +
          '4️⃣ Buy panel: `/katalog` then `/buy-panel`\n\n' +
          'Select a category below for detailed commands:'
        )
        .addFields(
          {
            name: '🚀 Getting Started',
            value: 'Registration, verification, profile',
            inline: true
          },
          {
            name: '💰 Economy',
            value: 'Coins, daily rewards, redeem codes',
            inline: true
          },
          {
            name: '🖥️ Panel',
            value: 'Buy, manage, renew servers',
            inline: true
          },
          {
            name: '👑 Admin',
            value: 'User management, monitoring',
            inline: true
          },
          {
            name: '🎉 Giveaways',
            value: 'Join giveaways, win prizes',
            inline: true
          },
          {
            name: '🎫 Tickets',
            value: 'Buy coins/premium via tickets',
            inline: true
          }
        )
        .setFooter({ text: 'Use /help category:<name> for detailed info' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Category-specific help
    let embed;

    switch (category) {
      case 'getting-started':
        embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle('🚀 Getting Started')
          .setDescription('Start your journey with OnePanel Bot!')
          .addFields(
            {
              name: '📝 /register',
              value: 'Create your account with email, name, and password',
              inline: false
            },
            {
              name: '✅ /verify <code>',
              value: 'Verify your account with code sent to DM',
              inline: false
            },
            {
              name: '🔄 /resend',
              value: 'Resend verification code if expired',
              inline: false
            },
            {
              name: '👤 /profile [user]',
              value: 'View your profile or another user\'s profile',
              inline: false
            },
            {
              name: '\u200B',
              value: 
                '**First Time Setup:**\n' +
                '1. Use `/register` to create account\n' +
                '2. Check your DM for verification code\n' +
                '3. Use `/verify <code>` to complete\n' +
                '4. You\'re ready! Start with `/daily` to get coins',
              inline: false
            }
          );
        break;

      case 'economy':
        embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle('💰 Economy Commands')
          .setDescription('Manage your coins and economy')
          .addFields(
            {
              name: '🎁 /daily',
              value: 'Claim daily reward (50-500 coins + streak bonus)',
              inline: false
            },
            {
              name: '💳 /balance [user]',
              value: 'Check coin balance and economy stats',
              inline: false
            },
            {
              name: '🎟️ /redeem <code>',
              value: 'Redeem code to claim coins',
              inline: false
            },
            {
              name: '🏆 /leaderboard [type]',
              value: 'View top users by coins or streak',
              inline: false
            },
            {
              name: '\u200B',
              value: 
                '**Earning Coins:**\n' +
                '• Daily rewards: 50-500 coins\n' +
                '• Weekly bonus: 1,500 coins (7 day streak)\n' +
                '• Redeem codes from admin\n' +
                '• Giveaway prizes',
              inline: false
            }
          );
        break;

      case 'panel':
        embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle('🖥️ Panel Commands')
          .setDescription('Buy and manage your servers')
          .addFields(
            {
              name: '📦 /katalog [product-id]',
              value: 'View available panel products',
              inline: false
            },
            {
              name: '🛒 /buy-panel <product-id> [voucher]',
              value: 'Purchase panel from catalog',
              inline: false
            },
            {
              name: '🖥️ /my-server [server-id]',
              value: 'View your owned servers',
              inline: false
            },
            {
              name: '🔄 /perpanjang <server-id> [days]',
              value: 'Renew/extend server subscription',
              inline: false
            },
            {
              name: '🗑️ /delete-server <server-id>',
              value: 'Delete server with prorated refund',
              inline: false
            },
            {
              name: '\u200B',
              value: 
                '**Server Limits:**\n' +
                '• Free users: 2 servers max\n' +
                '• Premium users: Unlimited\n\n' +
                '**Buying Process:**\n' +
                '1. Check catalog: `/katalog`\n' +
                '2. Buy: `/buy-panel product-id:NODEJS1`\n' +
                '3. Confirm purchase\n' +
                '4. Server created instantly!',
              inline: false
            }
          );
        break;

      case 'admin':
        embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle('👑 Admin Commands')
          .setDescription('Admin-only commands for management')
          .addFields(
            {
              name: '🎟️ Redeem Codes',
              value: '`/create-redeem`, `/delete-redeem`, `/list-redeems`',
              inline: false
            },
            {
              name: '🎫 Vouchers',
              value: '`/create-voucher`, `/delete-voucher`, `/list-vouchers`',
              inline: false
            },
            {
              name: '📦 Catalog',
              value: '`/create-katalog`, `/edit-katalog`, `/delete-katalog`',
              inline: false
            },
            {
              name: '👥 User Management',
              value: '`/setadmin`, `/ban-user`, `/unban-user`, `/delete-user`',
              inline: false
            },
            {
              name: '📊 Monitoring',
              value: '`/server-monitor`, `/list-users`, `/user-info`',
              inline: false
            },
            {
              name: '🎉 Giveaways',
              value: '`/giveaway`, `/reroll`',
              inline: false
            },
            {
              name: '🎫 Tickets',
              value: '`/close-ticket`',
              inline: false
            }
          );
        break;

      case 'giveaway':
        embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle('🎉 Giveaway Commands')
          .setDescription('Join giveaways and win prizes!')
          .addFields(
            {
              name: '🎁 /giveaways',
              value: 'View all active giveaways',
              inline: false
            },
            {
              name: '🎉 Joining Giveaways',
              value: 'Click the "Join Giveaway" button on giveaway messages',
              inline: false
            },
            {
              name: '\u200B',
              value: 
                '**How to Participate:**\n' +
                '1. Look for giveaway messages\n' +
                '2. Click [Join Giveaway 🎉] button\n' +
                '3. Wait for giveaway to end\n' +
                '4. Winner announced automatically!\n\n' +
                '**Bonus Chances:**\n' +
                'Some roles give better win chances!\n' +
                'Check giveaway message for role bonuses',
              inline: false
            }
          );
        break;
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};