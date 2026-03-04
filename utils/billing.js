const User = require('../models/User');
const Server = require('../models/Server');
const { removeCoins, hasEnoughCoins } = require('./economy');
const config = require('../config/config');

/**
 * Process daily billing for a server
 */
async function processDailyBilling(server) {
  try {
    // Check if server is active
    if (!server.isActive) {
      return { success: false, reason: 'Server inactive' };
    }

    // Check if already expired
    if (server.isExpired()) {
      return { success: false, reason: 'Server expired' };
    }

    // Check if billing already processed today
    const now = Date.now();
    const lastBilling = new Date(server.lastBillingDate).getTime();
    const hoursSinceLastBilling = (now - lastBilling) / (1000 * 60 * 60);

    if (hoursSinceLastBilling < 24) {
      return { success: false, reason: 'Already billed today' };
    }

    // Get user
    const user = await User.findOne({ discordId: server.ownerId });
    if (!user) {
      return { success: false, reason: 'User not found' };
    }

    // Check if user has enough coins
    if (!hasEnoughCoins(user, server.dailyCost)) {
      return { 
        success: false, 
        reason: 'Insufficient coins',
        userId: user.discordId,
        username: user.discordUsername,
        required: server.dailyCost,
        balance: user.coins
      };
    }

    // Deduct daily cost
    await removeCoins(user, server.dailyCost, `Daily billing: ${server.serverName}`);

    // Update server
    server.lastBillingDate = now;
    server.totalPaid += server.dailyCost;
    await server.save();

    return { 
      success: true, 
      amount: server.dailyCost,
      newBalance: user.coins,
      totalPaid: server.totalPaid
    };

  } catch (error) {
    console.error('Error processing daily billing:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Check if server should send expiration notification
 */
function shouldSendNotification(server, hoursBeforeExpiry) {
  const hoursRemaining = server.hoursRemaining();
  
  // Check if within notification window (±1 hour tolerance)
  const isInWindow = hoursRemaining <= hoursBeforeExpiry && hoursRemaining >= (hoursBeforeExpiry - 1);
  
  // Check if notification already sent
  let notificationSent = false;
  if (hoursBeforeExpiry === 24) {
    notificationSent = server.notificationSent['24h'];
  } else if (hoursBeforeExpiry === 12) {
    notificationSent = server.notificationSent['12h'];
  } else if (hoursBeforeExpiry === 1) {
    notificationSent = server.notificationSent['1h'];
  }

  return isInWindow && !notificationSent && server.isActive;
}

/**
 * Mark notification as sent
 */
async function markNotificationSent(server, hoursBeforeExpiry) {
  if (hoursBeforeExpiry === 24) {
    server.notificationSent['24h'] = true;
  } else if (hoursBeforeExpiry === 12) {
    server.notificationSent['12h'] = true;
  } else if (hoursBeforeExpiry === 1) {
    server.notificationSent['1h'] = true;
  }
  await server.save();
}

/**
 * Calculate renewal cost
 */
function calculateRenewalCost(server, additionalDays) {
  // Use the original daily cost
  return server.dailyCost * additionalDays;
}

/**
 * Extend server expiration
 */
async function extendServer(server, additionalDays) {
  const currentExpiry = new Date(server.expiresAt);
  const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  
  server.expiresAt = newExpiry;
  server.durationDays += additionalDays;
  
  // Reset notifications for extended time
  server.notificationSent = {
    '24h': false,
    '12h': false,
    '1h': false
  };
  
  await server.save();
  
  return newExpiry;
}

/**
 * Get billing summary for user
 */
async function getUserBillingSummary(userId) {
  const servers = await Server.find({ 
    ownerId: userId,
    isActive: true 
  });

  let totalDailyCost = 0;
  let totalPaid = 0;

  for (const server of servers) {
    totalDailyCost += server.dailyCost;
    totalPaid += server.totalPaid;
  }

  return {
    activeServers: servers.length,
    totalDailyCost: totalDailyCost,
    totalPaid: totalPaid,
    servers: servers
  };
}

module.exports = {
  processDailyBilling,
  shouldSendNotification,
  markNotificationSent,
  calculateRenewalCost,
  extendServer,
  getUserBillingSummary,
};