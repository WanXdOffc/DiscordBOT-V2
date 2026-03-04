const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Send welcome DM
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor)
        .setTitle('👋 Welcome to OnePanel!')
        .setDescription(
          `Welcome to **${member.guild.name}**, ${member.user}!\n\n` +
          'Get started with these simple steps:'
        )
        .addFields(
          {
            name: '1️⃣ Register',
            value: 'Use `/register` to create your account',
            inline: false
          },
          {
            name: '2️⃣ Verify',
            value: 'Check your DM for verification code and use `/verify <code>`',
            inline: false
          },
          {
            name: '3️⃣ Get Coins',
            value: 'Use `/daily` to get free coins every day',
            inline: false
          },
          {
            name: '4️⃣ Buy Panel',
            value: 'Use `/katalog` to see available panels, then `/buy-panel`',
            inline: false
          },
          {
            name: '💡 Need Help?',
            value: 'Use `/help` anytime for detailed guides',
            inline: false
          }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'OnePanel Bot - Your Panel Management Solution' })
        .setTimestamp();

      await member.send({ embeds: [embed] });
      console.log(`👋 Welcome message sent to ${member.user.username}`);

    } catch (error) {
      console.error('Error sending welcome message:', error);
      // User might have DMs disabled
    }
  }
};