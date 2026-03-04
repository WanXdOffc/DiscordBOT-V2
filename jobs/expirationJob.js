const Server = require('../models/Server');
const { deleteServer } = require('../utils/pterodactyl');

/**
 * Expiration check job
 * Checks for expired servers and deletes them
 */
async function runExpirationJob() {
  try {
    console.log('🔄 Running expiration job...');

    // Get all active servers that are expired
    const now = Date.now();
    const expiredServers = await Server.find({
      isActive: true,
      expiresAt: { $lte: now }
    });

    let deleted = 0;
    let failed = 0;

    for (const server of expiredServers) {
      try {
        console.log(`⏰ Server ${server.serverId} expired, deleting...`);

        // Delete from Pterodactyl
        try {
          await deleteServer(server.pterodactylId);
          console.log(`✅ Deleted from Pterodactyl: ${server.pterodactylId}`);
        } catch (pterodactylError) {
          console.error(`⚠️ Pterodactyl deletion failed for ${server.pterodactylId}:`, pterodactylError.message);
          // Continue anyway, mark as deleted in our database
        }

        // Mark as inactive in database
        server.isActive = false;
        server.deletedAt = now;
        await server.save();

        deleted++;
        console.log(`✅ Server ${server.serverId} marked as expired and deleted`);

        // Try to notify user via DM
        try {
          const client = require('../index');
          const user = await client.users.fetch(server.ownerId);
          
          if (user) {
            const { EmbedBuilder } = require('discord.js');
            const config = require('../config/config');

            const embed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('⏰ Server Expired')
              .setDescription(
                `Your server **${server.productName}** has expired and been deleted.`
              )
              .addFields(
                { name: '🆔 Server ID', value: `\`${server.serverId}\``, inline: true },
                { name: '📦 Product', value: server.productName, inline: true },
                { name: '💰 Total Paid', value: `${server.totalPaid.toLocaleString()} coins`, inline: true }
              )
              .setFooter({ text: 'Use /buy-panel to purchase a new server' })
              .setTimestamp();

            await user.send({ embeds: [embed] });
            console.log(`📧 Expiration notification sent to ${server.ownerUsername}`);
          }
        } catch (dmError) {
          console.error(`⚠️ Could not send DM to ${server.ownerUsername}:`, dmError.message);
        }

      } catch (error) {
        failed++;
        console.error(`❌ Failed to process expired server ${server.serverId}:`, error);
      }
    }

    console.log(`📊 Expiration job complete: ${deleted} deleted, ${failed} failed`);

  } catch (error) {
    console.error('❌ Error in expiration job:', error);
  }
}

/**
 * Start expiration job interval
 */
function startExpirationJob(client) {
  // Run immediately on start
  runExpirationJob();

  // Run every 30 minutes
  setInterval(() => {
    runExpirationJob();
  }, 30 * 60 * 1000); // 30 minutes

  console.log('✅ Expiration job started (runs every 30 minutes)');
}

module.exports = {
  runExpirationJob,
  startExpirationJob,
};