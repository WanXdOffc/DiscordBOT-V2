const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and status'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true, ephemeral: true });
    
    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '⏱️ Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
        { name: '💓 API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
        { name: '📊 Status', value: '🟢 Online', inline: true }
      )
      .setFooter({ text: 'OnePanel Bot' })
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};