const Server = require('../models/Server');
const { processDailyBilling } = require('../utils/billing');

/**
 * Daily billing job
 * Runs every hour to check for servers that need billing
 */
async function runBillingJob() {
  try {
    console.log('🔄 Running billing job...');

    // Get all active servers
    const servers = await Server.find({ isActive: true });

    let processed = 0;
    let failed = 0;
    let insufficient = 0;

    for (const server of servers) {
      const result = await processDailyBilling(server);

      if (result.success) {
        processed++;
        console.log(`✅ Billed server ${server.serverId}: ${result.amount} coins`);
      } else if (result.reason === 'Insufficient coins') {
        insufficient++;
        console.log(`⚠️ Insufficient coins for ${server.serverId} (${result.username})`);
        // Server will be handled by expiration job
      } else {
        if (result.reason !== 'Already billed today') {
          failed++;
          console.log(`❌ Failed to bill ${server.serverId}: ${result.reason}`);
        }
      }
    }

    console.log(`📊 Billing job complete: ${processed} processed, ${insufficient} insufficient, ${failed} failed`);

  } catch (error) {
    console.error('❌ Error in billing job:', error);
  }
}

/**
 * Start billing job interval
 */
function startBillingJob(client) {
  // Run immediately on start
  runBillingJob();

  // Run every hour
  setInterval(() => {
    runBillingJob();
  }, 60 * 60 * 1000); // 1 hour

  console.log('✅ Billing job started (runs every 1 hour)');
}

module.exports = {
  runBillingJob,
  startBillingJob,
};