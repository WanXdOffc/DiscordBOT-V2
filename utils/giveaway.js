/**
 * Generate unique giveaway ID
 */
function generateGiveawayId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `GVWY_${timestamp}_${random}`.toUpperCase();
}

/**
 * Calculate end time
 */
function calculateEndTime(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Format time remaining
 */
function formatTimeRemaining(endsAt) {
  const now = Date.now();
  const timeLeft = new Date(endsAt).getTime() - now;

  if (timeLeft <= 0) {
    return 'Ended';
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Calculate user's win chance based on roles
 */
function calculateWinChance(member, roleProbabilities) {
  let baseChance = 1;
  let bonus = 0;

  for (const roleProb of roleProbabilities) {
    if (member.roles.cache.has(roleProb.roleId)) {
      bonus += roleProb.probability;
    }
  }

  return baseChance + (bonus / 100);
}

/**
 * Format giveaway status
 */
function getGiveawayStatusEmoji(status) {
  const emojis = {
    'active': '🎉',
    'ended': '🏆',
    'cancelled': '❌'
  };
  return emojis[status] || '⚪';
}

module.exports = {
  generateGiveawayId,
  calculateEndTime,
  formatTimeRemaining,
  calculateWinChance,
  getGiveawayStatusEmoji,
};