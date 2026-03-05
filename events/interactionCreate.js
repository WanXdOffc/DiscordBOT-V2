const { Events, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { isValidEmail, sendVerificationCode, sanitizeUsername } = require('../utils/verification');
const config = require('../config/config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // ── Cooldown / Anti-Spam ────────────────────────────────────────────────
      const cooldownSeconds = command.cooldown ?? config.bot.defaultCooldown ?? 5;

      if (!client.cooldowns.has(command.data.name)) {
        client.cooldowns.set(command.data.name, new Map());
      }

      const timestamps = client.cooldowns.get(command.data.name);
      const cooldownMs = cooldownSeconds * 1_000;
      const now = Date.now();
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expiresAt = timestamps.get(userId) + cooldownMs;
        if (now < expiresAt) {
          const remaining = ((expiresAt - now) / 1_000).toFixed(1);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('⏳ Slow down!')
            .setDescription(
              `Kamu harus menunggu **${remaining} detik** lagi sebelum bisa pakai \`/${command.data.name}\` lagi.`
            )
            .setFooter({ text: 'Anti-spam protection' })
            .setTimestamp();
          return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
      }

      // Catat waktu penggunaan
      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownMs);
      // ────────────────────────────────────────────────────────────────────────

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const reply = {
          embeds: [errorEmbed(
            'Error',
            'Terjadi kesalahan saat menjalankan command ini.'
          )],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      const customId = interaction.customId;

      // Giveaway join button
      if (customId.startsWith('giveaway_join_')) {
        const giveawayId = customId.replace('giveaway_join_', '');

        try {
          const Giveaway = require('../models/Giveaway');
          const User = require('../models/User');
          const { errorEmbed, successEmbed } = require('../utils/embeds');

          const giveaway = await Giveaway.findOne({ giveawayId: giveawayId });

          if (!giveaway) {
            return interaction.reply({
              embeds: [errorEmbed('Error', 'Giveaway tidak ditemukan.')],
              ephemeral: true
            });
          }

          if (giveaway.hasEnded()) {
            return interaction.reply({
              embeds: [errorEmbed('Ended', 'Giveaway sudah berakhir.')],
              ephemeral: true
            });
          }

          // Check if user is registered
          const user = await User.findOne({ discordId: interaction.user.id, isVerified: true });
          if (!user) {
            return interaction.reply({
              embeds: [errorEmbed('Not Registered', 'Anda harus register dan verify terlebih dahulu.')],
              ephemeral: true
            });
          }

          // Check minimum role
          if (giveaway.minimumRole) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (!member.roles.cache.has(giveaway.minimumRole)) {
              return interaction.reply({
                embeds: [errorEmbed('Role Required', 'Anda tidak memiliki role yang diperlukan untuk join giveaway ini.')],
                ephemeral: true
              });
            }
          }

          // Check if already joined
          if (giveaway.hasUserJoined(interaction.user.id)) {
            return interaction.reply({
              embeds: [errorEmbed('Already Joined', 'Anda sudah join giveaway ini.')],
              ephemeral: true
            });
          }

          // Add participant
          await giveaway.addParticipant(interaction.user.id, interaction.user.username);

          // Update giveaway message
          const giveawayMessage = await interaction.channel.messages.fetch(giveaway.messageId);
          const embed = giveawayMessage.embeds[0];

          // Update participant count in embed
          const newEmbed = require('discord.js').EmbedBuilder.from(embed);
          newEmbed.spliceFields(2, 1, { name: '📊 Participants', value: `${giveaway.participants.length}`, inline: true });

          await giveawayMessage.edit({ embeds: [newEmbed] });

          // Confirm to user
          await interaction.reply({
            embeds: [successEmbed(
              'Joined Giveaway!',
              `✅ Anda berhasil join giveaway!\n\n` +
              `**Prize:** ${giveaway.prize}\n` +
              `**Participants:** ${giveaway.participants.length}/${giveaway.maxParticipants}\n\n` +
              `Good luck! 🍀`
            )],
            ephemeral: true
          });

        } catch (error) {
          console.error('Error joining giveaway:', error);

          await interaction.reply({
            embeds: [require('../utils/embeds').errorEmbed('Error', error.message || 'Terjadi kesalahan.')],
            ephemeral: true
          });
        }
      }
      // Server deletion buttons
      else if (customId.startsWith('delete_server_')) {
        const parts = customId.split('_');
        const action = parts[2]; // confirm or cancel
        const serverId = parts[3];

        const deleteServerCommand = require('../commands/panel/delete-server');
        await deleteServerCommand.handleButton(interaction, serverId, action);
      }
      else if (customId.startsWith('ticket_')) {
        // Will be implemented if needed
      }
    }

    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      // Registration modal
      if (customId === 'register_modal') {
        await interaction.deferReply({ ephemeral: true });

        try {
          // Get form data
          const email = interaction.fields.getTextInputValue('email').trim();
          const firstName = interaction.fields.getTextInputValue('firstName').trim();
          const lastName = interaction.fields.getTextInputValue('lastName').trim();
          const password = interaction.fields.getTextInputValue('password').trim();

          // Validate email
          if (!isValidEmail(email)) {
            return interaction.editReply({
              embeds: [errorEmbed(
                'Invalid Email',
                'Format email tidak valid. Silakan gunakan email yang benar.'
              )]
            });
          }

          // Check if email already exists
          const existingEmail = await User.findOne({ email: email.toLowerCase() });
          if (existingEmail) {
            return interaction.editReply({
              embeds: [errorEmbed(
                'Email Already Registered',
                'Email ini sudah terdaftar. Silakan gunakan email lain.'
              )]
            });
          }

          // Check password length
          if (password.length < 8) {
            return interaction.editReply({
              embeds: [errorEmbed(
                'Weak Password',
                'Password harus minimal 8 karakter.'
              )]
            });
          }

          // Generate verification code
          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

          // Create or update user in database
          let user = await User.findOne({ discordId: interaction.user.id });

          if (user) {
            // Update existing user
            user.email = email.toLowerCase();
            user.firstName = firstName;
            user.lastName = lastName;
            user.discordUsername = interaction.user.username;
            user.verificationCode = verificationCode;
            user.tempPassword = password; // Store password temporarily
            user.verificationExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
            user.isVerified = false;
          } else {
            // Create new user
            user = new User({
              discordId: interaction.user.id,
              discordUsername: interaction.user.username,
              email: email.toLowerCase(),
              firstName: firstName,
              lastName: lastName,
              verificationCode: verificationCode,
              tempPassword: password, // Store password temporarily
              verificationExpiry: Date.now() + 15 * 60 * 1000,
              isVerified: false,
              coins: 0
            });
          }

          await user.save();

          // Send verification code to DM
          const dmSent = await sendVerificationCode(interaction.user, verificationCode);

          if (!dmSent) {
            return interaction.editReply({
              embeds: [errorEmbed(
                'DM Disabled',
                'Tidak dapat mengirim kode verifikasi ke DM Anda.\n\n' +
                'Pastikan DM Anda terbuka untuk menerima pesan dari bot.'
              )]
            });
          }

          // Success message
          await interaction.editReply({
            embeds: [successEmbed(
              'Registration Initiated',
              '✅ Data registrasi berhasil disimpan!\n\n' +
              '📬 Kode verifikasi telah dikirim ke DM Anda.\n' +
              '⏰ Kode akan kadaluarsa dalam **15 menit**.\n\n' +
              'Gunakan `/verify <code>` untuk menyelesaikan registrasi.'
            )]
          });

        } catch (error) {
          console.error('Error processing registration modal:', error);

          await interaction.editReply({
            embeds: [errorEmbed(
              'Error',
              'Terjadi kesalahan saat memproses registrasi.\n\n' +
              'Silakan coba lagi atau hubungi admin.'
            )]
          });
        }
      }
    }

    // Handle select menus
    else if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      // Purchase confirmation
      if (customId.startsWith('confirm_purchase_')) {
        const parts = customId.split('_');
        const productId = parts[2];
        const voucherCode = parts[3] !== 'none' ? parts[3] : null;
        const choice = interaction.values[0];

        if (choice === 'cancel') {
          return interaction.update({
            embeds: [require('../utils/embeds').infoEmbed(
              'Purchase Cancelled',
              'Pembelian dibatalkan.'
            )],
            components: []
          });
        }

        // Process purchase
        await interaction.deferUpdate();

        try {
          const User = require('../models/User');
          const Katalog = require('../models/Katalog');
          const Voucher = require('../models/Voucher');
          const Server = require('../models/Server');
          const { createServer } = require('../utils/pterodactyl');
          const { removeCoins } = require('../utils/economy');
          const { calculateDiscount } = require('../utils/voucher');
          const {
            generateServerId,
            generateServerName,
            calculateExpiryDate,
            calculateDailyCost
          } = require('../utils/server');
          const { successEmbed, errorEmbed } = require('../utils/embeds');
          const config = require('../config/config');

          const user = await User.findOne({ discordId: interaction.user.id });
          const product = await Katalog.findOne({ productId: productId });

          if (!user || !product) {
            return interaction.followUp({
              embeds: [errorEmbed('Error', 'Data tidak ditemukan.')],
              ephemeral: true
            });
          }

          // Calculate final price
          let finalPrice = product.price;
          let discount = 0;
          let bonusDuration = 0;
          let discountPercent = 0;

          if (voucherCode) {
            const voucher = await Voucher.findOne({ code: voucherCode });
            if (voucher && voucher.isAvailable()) {
              const priceCalc = calculateDiscount(product.price, voucher.discount);
              finalPrice = priceCalc.finalPrice;
              discount = priceCalc.discountAmount;
              discountPercent = voucher.discount;
              bonusDuration = voucher.durationDays;

              // Mark voucher as used
              await voucher.useVoucher(user.discordId);
            }
          }

          // Deduct coins
          await removeCoins(user, finalPrice, `Purchase: ${product.name}`);

          // Create server in Pterodactyl
          const serverName = generateServerName(interaction.user.username, product.productId);
          const pterodactylServer = await createServer(
            user.pterodactylId,
            serverName,
            product.ram,
            product.disk,
            product.cpu,
            product.egg,
            product.nest
          );

          // Save server to database
          const totalDuration = product.durationDays + bonusDuration;
          const serverId = generateServerId();
          const dailyCost = calculateDailyCost(finalPrice, totalDuration);

          const server = new Server({
            serverId: serverId,
            pterodactylId: pterodactylServer.attributes.id,
            serverName: serverName,
            ownerId: user.discordId,
            ownerUsername: interaction.user.username,
            productId: product.productId,
            productName: product.name,
            ram: product.ram,
            disk: product.disk,
            cpu: product.cpu,
            databases: product.databases,
            egg: product.egg,
            nest: product.nest,
            originalPrice: product.price,
            paidPrice: finalPrice,
            dailyCost: dailyCost,
            durationDays: totalDuration,
            expiresAt: calculateExpiryDate(totalDuration),
            voucherUsed: voucherCode,
            discountReceived: discount
          });

          await server.save();

          // Decrease stock if limited
          if (product.stock !== null) {
            await product.decreaseStock();
          }

          // Send success DM
          try {
            const dmEmbed = require('discord.js').EmbedBuilder;
            const embed = new dmEmbed()
              .setColor('#00ff00')
              .setTitle('🎉 Panel Purchase Successful!')
              .setDescription(`Your panel has been created successfully!`)
              .addFields(
                { name: '📦 Product', value: product.name, inline: true },
                { name: '🆔 Server ID', value: `\`${serverId}\``, inline: true },
                { name: '💰 Paid', value: `${finalPrice.toLocaleString()} coins`, inline: true },
                { name: '🎯 RAM', value: `${product.ram} MB`, inline: true },
                { name: '💾 Disk', value: `${product.disk} MB`, inline: true },
                { name: '⚡ CPU', value: `${product.cpu}%`, inline: true },
                { name: '⏰ Duration', value: `${totalDuration} days`, inline: true },
                { name: '📅 Expires', value: `<t:${Math.floor(server.expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: '🌐 Panel URL', value: config.pterodactyl.url, inline: false }
              )
              .setFooter({ text: 'Thank you for your purchase!' })
              .setTimestamp();

            if (voucherCode) {
              embed.addFields({
                name: '🎟️ Voucher Used',
                value: `${voucherCode} (-${discountPercent}% + ${bonusDuration} days)`,
                inline: false
              });
            }

            await interaction.user.send({ embeds: [embed] });
          } catch (dmError) {
            console.error('Could not send DM:', dmError);
          }

          // Update interaction
          await interaction.editReply({
            embeds: [successEmbed(
              'Purchase Successful!',
              `✅ Panel **${product.name}** berhasil dibeli!\n\n` +
              `🆔 Server ID: \`${serverId}\`\n` +
              `💰 Paid: ${finalPrice.toLocaleString()} coins\n` +
              `⏰ Duration: ${totalDuration} days\n\n` +
              `📧 Detail lengkap telah dikirim ke DM Anda.\n` +
              `Gunakan \`/my-server\` untuk melihat server Anda.`
            )],
            components: []
          });

          console.log(`✅ Panel purchased: ${product.name} by ${interaction.user.username}`);

        } catch (error) {
          console.error('Error processing purchase:', error);

          await interaction.followUp({
            embeds: [errorEmbed(
              'Purchase Failed',
              'Terjadi kesalahan saat memproses pembelian.\n\n' +
              'Coins Anda tidak akan terdeduct. Silakan coba lagi.'
            )],
            ephemeral: true
          });
        }
      }

      // Buy ticket selection
      else if (customId.startsWith('buy_select_')) {
        const purchaseType = interaction.values[0];
        const buyCommand = require('../commands/user/buy');
        await buyCommand.handleSelect(interaction, purchaseType);
      }
    }
  }
};