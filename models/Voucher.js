const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  // Voucher Details
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  // Discount
  discount: {
    type: Number, // Percentage (1-100)
    required: true,
    min: 1,
    max: 100
  },

  // Duration
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },

  // Usage Limits
  maxUsers: {
    type: Number,
    required: true,
    min: 1
  },
  usedBy: [{
    userId: String, // Discord ID
    usedAt: Date
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Creator Info
  createdBy: {
    type: String, // Discord ID of admin who created
    required: true
  },
  createdByUsername: {
    type: String,
    required: true
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual field for remaining uses
voucherSchema.virtual('remainingUses').get(function() {
  return this.maxUsers - this.usedBy.length;
});

// Method to check if voucher is expired
voucherSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt;
};

// Method to check if voucher is available
voucherSchema.methods.isAvailable = function() {
  return this.isActive && !this.isExpired() && this.usedBy.length < this.maxUsers;
};

// Method to check if user has used this voucher
voucherSchema.methods.hasBeenUsedBy = function(userId) {
  return this.usedBy.some(u => u.userId === userId);
};

// Method to use voucher
voucherSchema.methods.useVoucher = function(userId) {
  if (!this.isAvailable()) {
    throw new Error('Voucher is not available');
  }
  
  if (this.hasBeenUsedBy(userId)) {
    throw new Error('User has already used this voucher');
  }

  this.usedBy.push({
    userId: userId,
    usedAt: Date.now()
  });

  return this.save();
};

// Enable virtuals in JSON
voucherSchema.set('toJSON', { virtuals: true });
voucherSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Voucher', voucherSchema);