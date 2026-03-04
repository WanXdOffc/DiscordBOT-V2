const User = require('../models/User');
const Server = require('../models/Server');
const Katalog = require('../models/Katalog');
const Voucher = require('../models/Voucher');
const RedeemCode = require('../models/RedeemCode');

/**
 * Get comprehensive server statistics
 */
async function getServerStatistics() {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const adminUsers = await User.countDocuments({ isAdmin: true });

    // Server statistics
    const totalServers = await Server.countDocuments();
    const activeServers = await Server.countDocuments({ isActive: true });
    const expiredServers = await Server.countDocuments({ isActive: false });

    // Calculate total resources
    const servers = await Server.find({ isActive: true });
    let totalRAM = 0;
    let totalDisk = 0;
    let totalCPU = 0;

    for (const server of servers) {
      totalRAM += server.ram;
      totalDisk += server.disk;
      totalCPU += server.cpu;
    }

    // Economy statistics
    const users = await User.find({ isVerified: true });
    let totalCoins = 0;
    let totalSpent = 0;

    for (const user of users) {
      totalCoins += user.coins;
    }

    for (const server of servers) {
      totalSpent += server.totalPaid;
    }

    // Product statistics
    const totalProducts = await Katalog.countDocuments();
    const availableProducts = await Katalog.countDocuments({ isAvailable: true });

    // Voucher statistics
    const totalVouchers = await Voucher.countDocuments();
    const activeVouchers = await Voucher.countDocuments({ isActive: true });

    // Redeem code statistics
    const totalRedeemCodes = await RedeemCode.countDocuments();
    const usedRedeemCodes = await RedeemCode.countDocuments({ isUsed: true });

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        premium: premiumUsers,
        banned: bannedUsers,
        admin: adminUsers
      },
      servers: {
        total: totalServers,
        active: activeServers,
        expired: expiredServers
      },
      resources: {
        ram: totalRAM,
        disk: totalDisk,
        cpu: totalCPU
      },
      economy: {
        totalCoins: totalCoins,
        totalSpent: totalSpent,
        circulation: totalCoins + totalSpent
      },
      products: {
        total: totalProducts,
        available: availableProducts
      },
      vouchers: {
        total: totalVouchers,
        active: activeVouchers
      },
      redeemCodes: {
        total: totalRedeemCodes,
        used: usedRedeemCodes
      }
    };

  } catch (error) {
    console.error('Error getting statistics:', error);
    throw error;
  }
}

/**
 * Get top users by coins
 */
async function getTopUsers(limit = 10) {
  return await User.find({ isVerified: true })
    .sort({ coins: -1 })
    .limit(limit)
    .select('discordUsername coins dailyStreak isPremium');
}

/**
 * Get recent servers
 */
async function getRecentServers(limit = 10) {
  return await Server.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('ownerId');
}

/**
 * Format bytes to human readable
 */
function formatBytes(mb) {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Calculate uptime percentage
 */
function calculateUptime(startTime) {
  const now = Date.now();
  const uptime = now - startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, percentage: 99.9 }; // Simplified
}

module.exports = {
  getServerStatistics,
  getTopUsers,
  getRecentServers,
  formatBytes,
  calculateUptime,
};