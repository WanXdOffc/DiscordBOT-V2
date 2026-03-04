const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Katalog = require('../../models/Katalog');
const User = require('../../models/User');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatRAM, formatDisk, formatCPU, formatPrice } = require('../../utils/voucher');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-katalog')
    .setDescription('Create a panel product in catalog (Admin only)')
    .addStringOption(option =>
      option
        .setName('product-id')
        .setDescription('Product ID (e.g., PANEL1, NODEJS1)')
        .setRequired(true)
        .setMaxLength(20)
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Product name')
        .setRequired(true)
        .setMaxLength(50)
    )
    .addIntegerOption(option =>
      option
        .setName('ram')
        .setDescription('RAM in MB (e.g., 1024 for 1GB)')
        .setRequired(true)
        .setMinValue(128)
        .setMaxValue(32768)
    )
    .addIntegerOption(option =>
      option
        .setName('disk')
        .setDescription('Disk space in MB (e.g., 2048 for 2GB)')
        .setRequired(true)
        .setMinValue(512)
        .setMaxValue(102400)
    )
    .addIntegerOption(option =>
      option
        .setName('cpu')
        .setDescription('CPU percentage (e.g., 100 for 100%)')
        .setRequired(true)
        .setMinValue(25)
        .setMaxValue(500)
    )
    .addIntegerOption(option =>
      option
        .setName('egg')
        .setDescription('Pterodactyl Egg ID')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('nest')
        .setDescription('Pterodactyl Nest ID')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('price')
        .setDescription('Price in coins')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in days')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365)
    )
    .addIntegerOption(option =>
      option
        .setName('databases')
        .setDescription('Number of databases (default: 0)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(10)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Product description (optional)')
        .setRequired(false)
        .setMaxLength(200)
    )
    .addIntegerOption(option =>
      option
        .setName('stock')
        .setDescription('Stock limit (leave empty for unlimited)')
        .setRequired(false)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user is admin
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

      const productId = interaction.options.getString('product-id').toUpperCase().trim();
      const name = interaction.options.getString('name');
      const ram = interaction.options.getInteger('ram');
      const disk = interaction.options.getInteger('disk');
      const cpu = interaction.options.getInteger('cpu');
      const egg = interaction.options.getInteger('egg');
      const nest = interaction.options.getInteger('nest');
      const price = interaction.options.getInteger('price');
      const duration = interaction.options.getInteger('duration');
      const databases = interaction.options.getInteger('databases') || 0;
      const description = interaction.options.getString('description') || '';
      const stock = interaction.options.getInteger('stock') || null;

      // Check if product ID already exists
      const existingProduct = await Katalog.findOne({ productId: productId });
      if (existingProduct) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Product Already Exists',
            `Product dengan ID **${productId}** sudah ada.\n\nGunakan ID lain atau edit product yang sudah ada.`
          )]
        });
      }

      // Create product
      const product = new Katalog({
        productId: productId,
        name: name,
        description: description,
        ram: ram,
        disk: disk,
        cpu: cpu,
        egg: egg,
        nest: nest,
        databases: databases,
        price: price,
        durationDays: duration,
        stock: stock,
        createdBy: interaction.user.id,
        createdByUsername: interaction.user.username
      });

      await product.save();

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Product Created')
        .setDescription(`Panel product berhasil ditambahkan ke katalog!`)
        .addFields(
          { name: '🆔 Product ID', value: `\`${productId}\``, inline: true },
          { name: '📦 Name', value: name, inline: true },
          { name: '💰 Price', value: formatPrice(price), inline: true },
          { name: '🎯 RAM', value: formatRAM(ram), inline: true },
          { name: '💾 Disk', value: formatDisk(disk), inline: true },
          { name: '⚡ CPU', value: formatCPU(cpu), inline: true },
          { name: '🥚 Egg ID', value: `${egg}`, inline: true },
          { name: '🪺 Nest ID', value: `${nest}`, inline: true },
          { name: '🗄️ Databases', value: `${databases}`, inline: true },
          { name: '⏰ Duration', value: `${duration} days`, inline: true },
          { name: '📦 Stock', value: stock ? `${stock} units` : '♾️ Unlimited', inline: true },
          { name: '📊 Status', value: '🟢 Available', inline: true }
        )
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

      if (description) {
        embed.setDescription(description);
      }

      await interaction.editReply({ embeds: [embed] });

      console.log(`✅ Product created: ${productId} (${name}) by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in create-katalog command:', error);
      
      await interaction.editReply({
        embeds: [errorEmbed(
          'Error',
          'Terjadi kesalahan saat membuat product.'
        )]
      });
    }
  }
};