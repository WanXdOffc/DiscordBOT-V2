const config = require('../config/config');

/**
 * Calculate daily reward based on streak
 * Higher streak = better luck
 */
function calculateDailyReward(streak) {
  const { dailyMin, dailyMax } = config.economy;
  
  // Base random reward
  let reward = Math.floor(Math.random() * (dailyMax - dailyMin + 1)) + dailyMin;
  
  // Luck multiplier based on streak
  // More streak = better chance of higher rewards
  if (streak >= 3) {
    const luckBonus = Math.floor(Math.random() * 50) + 1;
    reward += luckBonus;
  }
  
  if (streak >= 5) {
    const extraBonus = Math.floor(Math.random() * 100) + 1;
    reward += extraBonus;
  }
  
  // Cap at max
  reward = Math.min(reward, dailyMax);
  
  return reward;
}

/**
 * Check if user can claim daily reward
 */
function canClaimDaily(lastDaily) {
  if (!lastDaily) return true;
  
  const now = Date.now();
  const lastClaim = new Date(lastDaily).getTime();
  const timeDiff = now - lastClaim;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Can claim if more than 24 hours
  return hoursDiff >= 24;
}

/**
 * Check if streak should continue
 * Streak breaks if user doesn't claim within 48 hours
 */
function shouldResetStreak(lastDaily) {
  if (!lastDaily) return false;
  
  const now = Date.now();
  const lastClaim = new Date(lastDaily).getTime();
  const timeDiff = now - lastClaim;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Reset if more than 48 hours
  return hoursDiff >= 48;
}

/**
 * Format time remaining until next daily
 */
function getTimeUntilDaily(lastDaily) {
  if (!lastDaily) return 'Available now!';
  
  const now = Date.now();
  const lastClaim = new Date(lastDaily).getTime();
  const nextClaim = lastClaim + (24 * 60 * 60 * 1000); // 24 hours later
  const timeLeft = nextClaim - now;
  
  if (timeLeft <= 0) return 'Available now!';
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

/**
 * Generate random redeem code
 */
function generateRedeemCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format coin amount with emoji
 */
function formatCoins(amount) {
  return `💰 ${amount.toLocaleString()} coins`;
}

/**
 * Add coins to user
 */
async function addCoins(user, amount, reason = 'Unknown') {
  user.coins += amount;
  await user.save();
  
  console.log(`💰 Added ${amount} coins to ${user.discordUsername} (${reason})`);
  return user.coins;
}

/**
 * Remove coins from user
 */
async function removeCoins(user, amount, reason = 'Unknown') {
  if (user.coins < amount) {
    throw new Error('Insufficient coins');
  }
  
  user.coins -= amount;
  await user.save();
  
  console.log(`💸 Removed ${amount} coins from ${user.discordUsername} (${reason})`);
  return user.coins;
}

/**
 * Check if user has enough coins
 */
function hasEnoughCoins(user, amount) {
  return user.coins >= amount;
}

module.exports = {
  calculateDailyReward,
  canClaimDaily,
  shouldResetStreak,
  getTimeUntilDaily,
  generateRedeemCode,
  formatCoins,
  addCoins,
  removeCoins,
  hasEnoughCoins,
};