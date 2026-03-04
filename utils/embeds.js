const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * Create a success embed
 */
function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create an error embed
 */
function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create an info embed
 */
function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a warning embed
 */
function warningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#ffaa00')
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a custom embed with specified color
 */
function customEmbed(title, description, color = config.bot.embedColor) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  successEmbed,
  errorEmbed,
  infoEmbed,
  warningEmbed,
  customEmbed,
};