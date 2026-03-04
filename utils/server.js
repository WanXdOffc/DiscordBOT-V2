const config = require('../config/config');

/**
 * Generate unique server ID
 */
function generateServerId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SRV_${timestamp}_${random}`.toUpperCase();
}

/**
 * Generate server name
 */
function generateServerName(username, productName) {
  const sanitized = username.replace(/[^a-zA-Z0-9]/g, '');
  return `${sanitized}_${productName}`;
}

/**
 * Check if user can create more servers
 */
function canCreateServer(user, currentServerCount) {
  const limit = user.isPremium ? config.limits.premiumServers : config.limits.freeServers;
  return currentServerCount < limit;
}

/**
 * Get server limit for user
 */
function getServerLimit(user) {
  return user.isPremium ? config.limits.premiumServers : config.limits.freeServers;
}

/**
 * Calculate expiry date
 */
function calculateExpiryDate(durationDays) {
  return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
}

/**
 * Format server status
 */
function formatServerStatus(server) {
  if (!server.isActive) {
    return '🔴 Inactive';
  }
  
  const daysLeft = server.daysRemaining();
  
  if (daysLeft === 0) {
    return '⏰ Expiring Today';
  } else if (daysLeft <= 3) {
    return `⚠️ ${daysLeft} days left`;
  } else {
    return `🟢 Active (${daysLeft} days)`;
  }
}

/**
 * Format time remaining
 */
function formatTimeRemaining(server) {
  const days = server.daysRemaining();
  const hours = server.hoursRemaining();
  
  if (days > 1) {
    return `${days} days`;
  } else if (hours > 1) {
    return `${hours} hours`;
  } else {
    return 'Less than 1 hour';
  }
}

/**
 * Calculate daily cost
 */
function calculateDailyCost(totalPrice, durationDays) {
  return Math.ceil(totalPrice / durationDays);
}

module.exports = {
  generateServerId,
  generateServerName,
  canCreateServer,
  getServerLimit,
  calculateExpiryDate,
  formatServerStatus,
  formatTimeRemaining,
  calculateDailyCost,
};