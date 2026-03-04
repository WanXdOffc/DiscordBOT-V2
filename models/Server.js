const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  // Server Identifiers
  serverId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  pterodactylId: {
    type: Number,
    required: true
  },
  serverName: {
    type: String,
    required: true
  },

  // Owner Info
  ownerId: {
    type: String, // Discord ID
    required: true,
    index: true
  },
  ownerUsername: {
    type: String,
    required: true
  },

  // Product Info
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },

  // Specifications
  ram: {
    type: Number,
    required: true
  },
  disk: {
    type: Number,
    required: true
  },
  cpu: {
    type: Number,
    required: true
  },
  databases: {
    type: Number,
    default: 0
  },

  // Pterodactyl Settings
  egg: {
    type: Number,
    required: true
  },
  nest: {
    type: Number,
    required: true
  },

  // Pricing & Billing
  originalPrice: {
    type: Number,
    required: true
  },
  paidPrice: {
    type: Number, // After discount
    required: true
  },
  dailyCost: {
    type: Number, // For billing system
    required: true
  },

  // Duration
  durationDays: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },

  // Voucher Used
  voucherUsed: {
    type: String,
    default: null
  },
  discountReceived: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },

  // Billing
  lastBillingDate: {
    type: Date,
    default: Date.now
  },
  totalPaid: {
    type: Number,
    default: 0
  },

  // Renewal
  autoRenew: {
    type: Boolean,
    default: false
  },
  notificationSent: {
    '24h': { type: Boolean, default: false },
    '12h': { type: Boolean, default: false },
    '1h': { type: Boolean, default: false }
  }
});

// Method to check if server is expired
serverSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

// Method to calculate days remaining
serverSchema.methods.daysRemaining = function() {
  const now = Date.now();
  const timeLeft = this.expiresAt - now;
  return Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
};

// Method to calculate hours remaining
serverSchema.methods.hoursRemaining = function() {
  const now = Date.now();
  const timeLeft = this.expiresAt - now;
  return Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60)));
};

// Method to calculate refund amount
serverSchema.methods.calculateRefund = function() {
  const daysUsed = Math.ceil((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  const daysTotal = this.durationDays;
  const daysRemaining = Math.max(0, daysTotal - daysUsed);
  
  const refundAmount = Math.floor((this.paidPrice / daysTotal) * daysRemaining);
  return Math.max(0, refundAmount);
};

module.exports = mongoose.model('Server', serverSchema);