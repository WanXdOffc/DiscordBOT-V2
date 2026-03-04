const Server = require('../models/Server');
const { shouldSendNotification, markNotificationSent } = require('../utils/billing');
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * Send expiration notification to user
 */
async function sendExpirationNotification(client, server, hoursRemaining) {
  try {
    const user = await client.users.fetch(server.ownerId);
    if (!user) return;

    let title = '';
    let color = '';
    
    if (hoursRemaining === 24) {
      title = '⏰ Server Expiring in 24 Hours';
      color = '#ffaa00';
    } else if (hoursRemaining === 12) {
      title = '⚠️ Server Expiring in 12 Hours';
      color = '#ff6600';
    } else if (hoursRemaining === 1) {
      title = '🚨 Server Expiring in 1 Hour!';
      color = '#ff0000';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `Your server **${server.productName}** will expire soon!\n\n` +
        `Use \`/perpanjang\` to renew your server and avoid deletion.`
      )
      .addFields(
        { name: '🆔 Server ID', value: `\`${server.serverId}\``, inline: true },
        { name: '📦 Product', value: server.productName, inline: true },
        { name: '⏰ Expires', value: `<t:${Math.floor(server.expiresAt.getTime() / 1000)}:R>`, inline: true },
        { name: '💸 Daily Cost', value: `${server.dailyCost.toLocaleString()} coins/day`, inline: true },
        { name: '📅 Renewal Cost (30d)', value: `${(server.dailyCost * 30).toLocaleString()} coins`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
      )
      .addFields({
        name: '🔄 How to Renew',
        value: `Use command: \`/perpanjang server-id:${server.serverId} days:30\``,
        inline: false
      })
      .setFooter({ text: 'Server will be deleted automatically after expiration' })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    console.log(`📧 Sent ${hoursRemaining}h notification to ${server.ownerUsername} for ${server.serverId}`);

    return true;
  } catch (error) {
    console.error(`⚠️ Could not send notification to ${server.ownerUsername}:`, error.message);
    return false;
  }
}

/**
 * Notification check job
 * Sends notifications at 24h, 12h, and 1h before expiry
 */
async function runNotificationJob(client) {
  try {
    console.log('🔄 Running notification job...');

    // Get all active servers
    const servers = await Server.find({ isActive: true });

    let sent = 0;
    const notificationTimes = [24, 12, 1]; // hours before expiry

    for (const server of servers) {
      for (const hours of notificationTimes) {
        if (shouldSendNotification(server, hours)) {
          const success = await sendExpirationNotification(client, server, hours);
          
          if (success) {
            await markNotificationSent(server, hours);
            sent++;
          }
        }
      }
    }

    if (sent > 0) {
      console.log(`📊 Notification job complete: ${sent} notifications sent`);
    }

  } catch (error) {
    console.error('❌ Error in notification job:', error);
  }
}

/**
 * Start notification job interval
 */
function startNotificationJob(client) {
  // Run immediately on start
  runNotificationJob(client);

  // Run every 15 minutes
  setInterval(() => {
    runNotificationJob(client);
  }, 15 * 60 * 1000); // 15 minutes

  console.log('✅ Notification job started (runs every 15 minutes)');
}

module.exports = {
  runNotificationJob,
  startNotificationJob,
  sendExpirationNotification,
};