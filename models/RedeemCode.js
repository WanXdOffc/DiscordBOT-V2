const mongoose = require('mongoose');

const redeemCodeSchema = new mongoose.Schema({
  // Code Details
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  // Reward
  coins: {
    type: Number,
    required: true,
    min: 1
  },

  // Usage
  isUsed: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: String, // Discord ID
    default: null
  },
  usedAt: {
    type: Date,
    default: null
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

  // Expiration (optional)
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

// Method to check if code is expired
redeemCodeSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt;
};

// Method to check if code is valid
redeemCodeSchema.methods.isValid = function() {
  return !this.isUsed && !this.isExpired();
};

module.exports = mongoose.model('RedeemCode', redeemCodeSchema);