const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Discord Info
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  discordUsername: {
    type: String,
    required: true
  },

  // Pterodactyl Info
  pterodactylId: {
    type: Number,
    default: null
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  pterodactylUsername: {
    type: String,
    default: null
  },

  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },

  // Verification
  verificationCode: {
    type: String,
    default: null
  },
  verificationExpiry: {
    type: Date,
    default: null
  },
  tempPassword: {
    type: String,
    default: null
  },

  // Economy
  coins: {
    type: Number,
    default: 0
  },
  lastDaily: {
    type: Date,
    default: null
  },
  dailyStreak: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if verification code is expired
userSchema.methods.isVerificationExpired = function() {
  if (!this.verificationExpiry) return true;
  return Date.now() > this.verificationExpiry;
};

// Method to generate new verification code
userSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = code;
  this.verificationExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  return code;
};

module.exports = mongoose.model('User', userSchema);