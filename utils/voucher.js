/**
 * Calculate discounted price
 */
function calculateDiscount(originalPrice, discountPercent) {
  const discount = (originalPrice * discountPercent) / 100;
  return {
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    discountAmount: Math.floor(discount),
    finalPrice: Math.max(1, Math.floor(originalPrice - discount))
  };
}

/**
 * Format voucher code
 */
function formatVoucherCode(code) {
  return code.toUpperCase().trim();
}

/**
 * Generate random voucher code
 */
function generateVoucherCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate voucher code format
 */
function isValidVoucherFormat(code) {
  // Only alphanumeric, 4-20 characters
  return /^[A-Z0-9]{4,20}$/.test(code.toUpperCase());
}

/**
 * Format price display
 */
function formatPrice(price, showCoins = true) {
  return showCoins ? `${price.toLocaleString()} coins` : price.toLocaleString();
}

/**
 * Calculate daily cost for billing
 */
function calculateDailyCost(totalPrice, durationDays) {
  return Math.ceil(totalPrice / durationDays);
}

/**
 * Format RAM size
 */
function formatRAM(mb) {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Format Disk size
 */
function formatDisk(mb) {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Format CPU percentage
 */
function formatCPU(percent) {
  return `${percent}%`;
}

module.exports = {
  calculateDiscount,
  formatVoucherCode,
  generateVoucherCode,
  isValidVoucherFormat,
  formatPrice,
  calculateDailyCost,
  formatRAM,
  formatDisk,
  formatCPU,
};